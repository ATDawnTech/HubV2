from datetime import UTC, datetime

from sqlalchemy import and_, func, or_, text
from sqlalchemy.orm import Session

from ..models.config_tables import RoleAssignment
from ..models.employees import Employee
from .base import BaseRepository


def _token_filter(column, value: str):
    """Return an AND clause matching every whitespace-separated token in value against column."""
    tokens = value.strip().lower().split()
    return and_(*[func.lower(column).like(f"%{t}%") for t in tokens])


class EmployeeRepository(BaseRepository[Employee]):
    """Repository for employee data access."""

    def __init__(self, session: Session) -> None:
        super().__init__(Employee, session)

    def find_by_entra_oid(self, entra_oid: str) -> Employee | None:
        """Find an employee by their Microsoft Entra Object ID."""
        return (
            self._session.query(Employee)
            .filter(
                Employee.entra_oid == entra_oid,
                Employee.deleted_at.is_(None),
            )
            .first()
        )

    def find_by_email(self, email: str) -> Employee | None:
        """Find an active employee by work email (case-insensitive)."""
        return (
            self._session.query(Employee)
            .filter(
                func.lower(Employee.work_email) == email.strip().lower(),
                Employee.deleted_at.is_(None),
            )
            .first()
        )

    def find_with_filters(
        self,
        limit: int = 20,
        cursor: str | None = None,
        q: str | None = None,
        statuses: list[str] | None = None,
        departments: list[str] | None = None,
        locations: list[str] | None = None,
        hire_types: list[str] | None = None,
        work_modes: list[str] | None = None,
        job_title: str | None = None,
        hire_date_from: str | None = None,
        hire_date_to: str | None = None,
        role_ids: list[str] | None = None,
    ) -> list[Employee]:
        """Return employees matching filters with cursor-based pagination."""
        if statuses is None:
            statuses = ["active", "new_onboard"]

        query = (
            self._session.query(Employee)
            .filter(
                Employee.deleted_at.is_(None),
                Employee.status.in_(statuses),
            )
            .order_by(Employee.created_at.asc(), Employee.id.asc())
        )

        if cursor:
            try:
                cursor_ts_str, cursor_id = cursor.split("|", 1)
                cursor_ts = datetime.fromisoformat(cursor_ts_str).replace(tzinfo=UTC)
                query = query.filter(
                    or_(
                        Employee.created_at > cursor_ts,
                        and_(Employee.created_at == cursor_ts, Employee.id > cursor_id),
                    )
                )
            except (ValueError, AttributeError):
                pass  # malformed cursor → start from beginning

        if q:
            searchable = func.concat(
                func.coalesce(Employee.first_name, ""),
                " ",
                func.coalesce(Employee.last_name, ""),
                " ",
                func.coalesce(Employee.work_email, ""),
                " ",
                func.coalesce(Employee.job_title, ""),
                " ",
                func.coalesce(Employee.department, ""),
                " ",
                func.coalesce(Employee.location, ""),
                " ",
                func.coalesce(Employee.employee_code, ""),
            )
            tokens = q.strip().lower().split()
            query = query.filter(and_(*[func.lower(searchable).like(f"%{t}%") for t in tokens]))

        if departments:
            query = query.filter(Employee.department.in_(departments))

        if locations:
            query = query.filter(Employee.location.in_(locations))

        if hire_types:
            query = query.filter(Employee.hire_type.in_(hire_types))

        if work_modes:
            query = query.filter(Employee.work_mode.in_(work_modes))

        if job_title:
            query = query.filter(_token_filter(Employee.job_title, job_title))

        if hire_date_from:
            query = query.filter(Employee.hire_date >= hire_date_from)

        if hire_date_to:
            query = query.filter(Employee.hire_date <= hire_date_to)

        if role_ids:
            role_subq = (
                self._session.query(RoleAssignment.employee_id)
                .filter(RoleAssignment.role_id.in_(role_ids))
                .subquery()
            )
            query = query.filter(Employee.id.in_(role_subq))

        return query.limit(limit + 1).all()

    def count_with_filters(
        self,
        q: str | None = None,
        statuses: list[str] | None = None,
        departments: list[str] | None = None,
        locations: list[str] | None = None,
        hire_types: list[str] | None = None,
        work_modes: list[str] | None = None,
        job_title: str | None = None,
        hire_date_from: str | None = None,
        hire_date_to: str | None = None,
        role_ids: list[str] | None = None,
    ) -> int:
        """Count employees matching filters (no pagination)."""
        if statuses is None:
            statuses = ["active", "new_onboard"]

        query = self._session.query(func.count(Employee.id)).filter(
            Employee.deleted_at.is_(None),
            Employee.status.in_(statuses),
        )

        if q:
            searchable = func.concat(
                func.coalesce(Employee.first_name, ""),
                " ",
                func.coalesce(Employee.last_name, ""),
                " ",
                func.coalesce(Employee.work_email, ""),
                " ",
                func.coalesce(Employee.job_title, ""),
                " ",
                func.coalesce(Employee.department, ""),
                " ",
                func.coalesce(Employee.location, ""),
                " ",
                func.coalesce(Employee.employee_code, ""),
            )
            tokens = q.strip().lower().split()
            query = query.filter(and_(*[func.lower(searchable).like(f"%{t}%") for t in tokens]))

        if departments:
            query = query.filter(Employee.department.in_(departments))

        if locations:
            query = query.filter(Employee.location.in_(locations))

        if hire_types:
            query = query.filter(Employee.hire_type.in_(hire_types))

        if work_modes:
            query = query.filter(Employee.work_mode.in_(work_modes))

        if job_title:
            query = query.filter(_token_filter(Employee.job_title, job_title))

        if hire_date_from:
            query = query.filter(Employee.hire_date >= hire_date_from)

        if hire_date_to:
            query = query.filter(Employee.hire_date <= hire_date_to)

        if role_ids:
            role_subq = (
                self._session.query(RoleAssignment.employee_id)
                .filter(RoleAssignment.role_id.in_(role_ids))
                .subquery()
            )
            query = query.filter(Employee.id.in_(role_subq))

        return query.scalar() or 0

    def find_active(self) -> list[Employee]:
        """Return all non-deleted employees with status='active'."""
        return (
            self._session.query(Employee)
            .filter(
                Employee.deleted_at.is_(None),
                Employee.status == "active",
            )
            .order_by(Employee.last_name.asc(), Employee.first_name.asc())
            .all()
        )

    def find_active_by_departments(self, departments: list[str]) -> list[Employee]:
        """Return all active (non-deleted, status='active') employees in the given departments."""
        if not departments:
            return []
        return (
            self._session.query(Employee)
            .filter(
                Employee.deleted_at.is_(None),
                Employee.status == "active",
                Employee.department.in_(departments),
            )
            .all()
        )

    def count_all_including_archived(self) -> int:
        """Count all employee records regardless of status or soft-delete."""
        return self._session.query(func.count(Employee.id)).scalar() or 0

    def propagate_column_rename(self, col: str, old_value: str, new_value: str) -> None:
        """Bulk-update one employee text column from old_value to new_value.

        The column name must come from a compile-time constant map — never from
        user input — so the f-string interpolation is safe.

        Args:
            col: Column name sourced from the hardcoded _EMPLOYEE_COLUMN_MAP.
            old_value: Current value to match.
            new_value: Replacement value.
        """
        self._session.execute(
            text(
                f"UPDATE employees SET {col} = :new WHERE {col} = :old"  # noqa: S608
                " AND deleted_at IS NULL"
            ),
            {"new": new_value, "old": old_value},
        )

    def bulk_reassign_column(self, col: str, from_value: str, to_value: str) -> int:
        """Bulk-reassign all active employee records where col = from_value to to_value.

        The column name must come from a compile-time constant map — never from
        user input.

        Args:
            col: Column name sourced from the hardcoded _EMPLOYEE_COLUMN_MAP.
            from_value: Current value to replace.
            to_value: New value to set.

        Returns:
            Number of rows updated.
        """
        result = self._session.execute(
            text(
                f"UPDATE employees SET {col} = :new WHERE {col} = :old"  # noqa: S608
                " AND deleted_at IS NULL"
            ),
            {"new": to_value, "old": from_value},
        )
        return result.rowcount
