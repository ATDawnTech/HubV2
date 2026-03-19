"""Entra directory sync — provisions and updates employees from mapped security groups.

On each sync:
  - Fetches members from every group that has an EntraGroupRoleMapping.
  - For each member: creates a new employee record, or updates an existing one.
  - Assigns the mapped role to each member if not already assigned.
  - Fields synced: first_name, last_name, work_email, job_title, department, location, hire_date (from createdDateTime).
  - Auto-creates missing department and location values in config_dropdowns.
  - Deduplicates members that appear in multiple groups.
"""

import secrets
import uuid
from datetime import UTC, date, datetime

import structlog
from sqlalchemy.orm import Session

from ..db.engine import SessionLocal
from ..db.models.config_tables import ConfigDropdown, RoleAssignment
from ..db.models.employees import Employee
from ..db.repositories.config_dropdown_repository import ConfigDropdownRepository
from ..db.repositories.employee_repository import EmployeeRepository
from ..db.repositories.role_repository import RoleRepository
from .graph_service import GraphService

logger = structlog.get_logger()


def _parse_entra_date(value: str | None) -> date | None:
    """Parse an Entra createdDateTime string to a date, stripping the time component.

    Entra returns ISO 8601 strings like "2023-01-15T10:30:00Z". We only want
    the date portion for hire_date.

    Args:
        value: ISO 8601 datetime string from Graph API, or None.

    Returns:
        A date object, or None if the value is missing or unparseable.
    """
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).date()
    except (ValueError, AttributeError):
        return None


class EntraSyncService:
    """Orchestrates syncing the employee directory from mapped Entra groups."""

    def __init__(self, session: Session) -> None:
        self._session = session
        self._employee_repo = EmployeeRepository(session)
        self._role_repo = RoleRepository(session)
        self._dropdown_repo = ConfigDropdownRepository(session)
        self._graph = GraphService()
        # Cache of dropdown values already confirmed to exist in config_dropdowns.
        # Keyed by (module, category, value) to avoid repeated DB lookups.
        self._known_dropdowns: set[tuple[str, str, str]] = set()

    def sync_all_groups(self) -> dict:
        """Sync all mapped Entra groups into the employee directory.

        For each group mapping, fetches members, provisions/updates employee records,
        and assigns the mapped role to each member if not already assigned.

        Returns:
            Dict with keys: created, updated, skipped, errors.
        """
        mappings = self._role_repo.find_all_entra_group_mappings()
        if not mappings:
            logger.info("Entra sync: no group mappings configured, skipping.")
            return {"created": 0, "updated": 0, "skipped": 0, "errors": 0}

        stats = {"created": 0, "updated": 0, "skipped": 0, "errors": 0}
        seen_oids: set[str] = set()

        for mapping in mappings:
            try:
                members = self._graph.get_group_members(mapping.entra_group_id)
            except Exception as exc:
                logger.error(
                    "Entra sync: failed to fetch group members.",
                    group_id=mapping.entra_group_id,
                    error=str(exc),
                )
                stats["errors"] += 1
                continue

            for member in members:
                oid = member.get("id")
                if not oid or oid in seen_oids:
                    seen_oids.add(oid or "")
                    continue
                seen_oids.add(oid)

                try:
                    result, employee = self._sync_member(member)
                    stats[result] += 1
                    if employee is not None:
                        self._ensure_role_assigned(employee, mapping.role_id)
                except Exception as exc:
                    logger.error(
                        "Entra sync: failed to sync member.",
                        entra_oid=oid,
                        error=str(exc),
                    )
                    stats["errors"] += 1

        logger.info("Entra sync complete.", **stats)
        return stats

    def _ensure_dropdown_exists(self, module: str, category: str, value: str) -> str:
        """Ensure a dropdown value exists in config_dropdowns (case-insensitive).

        Returns the canonical value from the dropdown list.  If a case-variant
        already exists (e.g. "engineering" vs "Engineering"), the existing value
        is returned so the employee record stays consistent.
        """
        if not value:
            return value
        cache_key = (module, category, value)
        if cache_key in self._known_dropdowns:
            return value

        from sqlalchemy import func

        existing = (
            self._session.query(ConfigDropdown)
            .filter(
                ConfigDropdown.module == module,
                ConfigDropdown.category == category,
                func.lower(ConfigDropdown.value) == value.lower(),
                ConfigDropdown.deleted_at.is_(None),
            )
            .first()
        )
        if existing is not None:
            self._known_dropdowns.add((module, category, existing.value))
            return existing.value

        now = datetime.now(UTC)
        entry = ConfigDropdown(
            id=f"cd_{secrets.token_hex(8)}",
            module=module,
            category=category,
            value=value,
            sort_order=0,
            is_active=True,
            created_by=None,
            created_at=now,
            updated_at=now,
        )
        self._dropdown_repo.save(entry)
        self._known_dropdowns.add(cache_key)
        logger.info(
            "Entra sync: dropdown auto-created.",
            module=module,
            category=category,
            value=value,
        )
        return value

    def _ensure_role_assigned(self, employee: Employee, role_id: str) -> None:
        """Assign the role to the employee if not already assigned."""
        existing = self._role_repo.find_assignment(employee.id, role_id)
        if existing is not None:
            return
        now = datetime.now(UTC)
        assignment = RoleAssignment(
            employee_id=employee.id,
            role_id=role_id,
            assigned_by=None,
            assigned_at=now,
            is_manager=False,
        )
        self._role_repo.save_assignment(assignment)
        logger.info(
            "Entra sync: role assigned.",
            employee_id=employee.id,
            role_id=role_id,
        )

    def _sync_member(self, member: dict) -> tuple[str, Employee | None]:
        """Provision or update a single Entra member.

        Returns:
            Tuple of ('created'|'updated'|'skipped', employee_or_None).
            Employee is None only when skipped due to missing email.
        """
        oid: str = member["id"]
        email = (member.get("mail") or member.get("userPrincipalName") or "").lower().strip()
        given_name = member.get("givenName") or ""
        surname = member.get("surname") or ""

        # Fall back to splitting displayName when given/surname are absent
        if not given_name and not surname:
            display = member.get("displayName", "")
            parts = display.strip().split(" ", 1)
            given_name = parts[0]
            surname = parts[1] if len(parts) > 1 else ""

        job_title = member.get("jobTitle") or ""
        department = member.get("department") or ""
        location = member.get("officeLocation") or ""
        hire_date = _parse_entra_date(member.get("createdDateTime"))

        department = self._ensure_dropdown_exists("employees", "department", department)
        location = self._ensure_dropdown_exists("global", "location", location)

        if not email:
            logger.warning("Entra sync: member has no email, skipping.", entra_oid=oid)
            return "skipped", None

        employee = self._employee_repo.find_by_entra_oid(oid)
        if employee is None:
            employee = self._employee_repo.find_by_email(email)

        if employee is None:
            total = self._employee_repo.count_all_including_archived()
            employee_code = f"ATD-{total + 1:04d}"
            now = datetime.now(UTC)
            employee = Employee(
                id=f"emp_{uuid.uuid4().hex[:12]}",
                entra_oid=oid,
                employee_code=employee_code,
                first_name=given_name or email.split("@")[0],
                last_name=surname,
                work_email=email,
                job_title=job_title or None,
                department=department or None,
                location=location or None,
                hire_date=hire_date,
                status="active",
                created_at=now,
                updated_at=now,
            )
            self._session.add(employee)
            self._session.flush()
            logger.info(
                "Entra sync: employee provisioned.",
                employee_id=employee.id,
                entra_oid=oid,
            )
            return "created", employee

        # Update existing employee
        changed = False
        if employee.entra_oid != oid:
            employee.entra_oid = oid
            changed = True
        if given_name and employee.first_name != given_name:
            employee.first_name = given_name
            changed = True
        if surname and employee.last_name != surname:
            employee.last_name = surname
            changed = True
        if email and employee.work_email != email:
            employee.work_email = email
            changed = True
        if job_title and employee.job_title != job_title:
            employee.job_title = job_title
            changed = True
        if department and employee.department != department:
            employee.department = department
            changed = True
        if location and employee.location != location:
            employee.location = location
            changed = True
        if hire_date and employee.hire_date != hire_date:
            employee.hire_date = hire_date
            changed = True

        if changed:
            employee.updated_at = datetime.now(UTC)
            self._session.flush()
            logger.info(
                "Entra sync: employee updated.",
                employee_id=employee.id,
                entra_oid=oid,
            )
            return "updated", employee

        return "skipped", employee


def run_scheduled_sync() -> None:
    """Entry point for the APScheduler background job.

    Creates its own database session since this runs outside of a request context.
    """
    logger.info("Entra sync: scheduled run starting.")
    session = SessionLocal()
    try:
        service = EntraSyncService(session)
        stats = service.sync_all_groups()
        session.commit()
        # Update the in-process sync status used by the status endpoint

        from ..api.entra_sync import record_sync_result
        record_sync_result(stats)
    except Exception as exc:
        session.rollback()
        logger.error("Entra sync: scheduled run failed.", error=str(exc))
    finally:
        session.close()
