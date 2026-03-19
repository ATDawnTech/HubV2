"""Business logic for Role & Permission Management.

Logic contracts:
- Roles with is_system=True cannot be deleted.
- Permissions use an OR-gate: if any assigned role (or its manager_permissions) grants
  (module, action), the user has it.
- Permission sets are replaced atomically (PUT semantics).
- dashboard_config and auto_assign_departments are JSON-serialized strings.
- Only known (module, action) pairs from _VALID_PERMISSIONS are accepted.
"""

import json
import secrets
from datetime import UTC, datetime

import structlog

from ..db.models.config_tables import Permission, Role, RoleAssignment
from ..db.repositories.employee_repository import EmployeeRepository
from ..db.repositories.role_repository import RoleRepository
from ..exceptions import (
    ConflictError,
    ResourceNotFoundError,
    SystemRoleDeleteError,
    ValidationError,
)

logger = structlog.get_logger()

# Allowlist of valid (module, action) permission pairs.
# Extend this set as new modules are built.
_VALID_PERMISSIONS: frozenset[tuple[str, str]] = frozenset({
    # --- Module visibility ---
    ("employees", "view_module"),
    ("assets", "view_module"),
    ("intake", "view_module"),
    ("onboarding", "view_module"),
    ("offboarding", "view_module"),
    ("admin", "view_module"),
    ("project_management", "view_module"),
    ("audit", "view_module"),
    ("timesheets", "view_module"),
    ("productivity", "view_module"),
    ("ats", "view_module"),
    # --- Verb permissions (employees) ---
    ("employees", "create_employee"),
    ("employees", "archive_employee"),
    ("employees", "edit_employee"),
    ("employees", "manage_attachments"),
    ("employees", "edit_project_history"),
    ("employees", "access_employee_admin_mode"),
    ("employees", "export_employees"),
    # --- Verb permissions (assets) ---
    ("assets", "create_asset"),
    ("assets", "assign_asset"),
    ("assets", "retire_asset"),
    ("assets", "edit_asset_metadata"),
    ("assets", "view_asset_valuation"),
    ("assets", "access_asset_edit_mode"),
    # --- Verb permissions (intake) ---
    ("intake", "create_requisition"),
    ("intake", "approve_requisition"),
    ("intake", "edit_requisition"),
    # --- Verb permissions (onboarding / offboarding) ---
    ("onboarding", "manage_onboarding"),
    ("offboarding", "manage_offboarding"),
    ("offboarding", "initiate_offboarding"),
    ("offboarding", "complete_tasks"),
    ("offboarding", "reassign_tasks"),
    # --- Verb permissions (project management) ---
    ("project_management", "create_project"),
    ("project_management", "edit_project"),
    ("project_management", "manage_members"),
    ("project_management", "archive_project"),
    # --- Verb permissions (audit & logging) ---
    ("audit", "view_audit_logs"),
    ("audit", "export_audit_logs"),
    # --- Verb permissions (timesheets) ---
    ("timesheets", "submit_timesheet"),
    ("timesheets", "approve_timesheet"),
    ("timesheets", "edit_timesheet"),
    ("timesheets", "export_timesheets"),
    # --- Verb permissions (productivity) ---
    ("productivity", "view_reports"),
    ("productivity", "manage_goals"),
    ("productivity", "export_reports"),
    # --- Verb permissions (ATS) ---
    ("ats", "create_candidate"),
    ("ats", "manage_interviews"),
    ("ats", "make_hiring_decisions"),
    ("ats", "manage_job_postings"),
    # --- Verb permissions (admin sub-modules) ---
    ("admin", "manage_roles"),
    ("admin", "manage_dropdowns"),
    ("admin", "manage_skills"),
    ("admin", "manage_notifications"),
    ("admin", "assign_roles"),
    ("admin", "manage_entra_sync"),
    # --- Noun / visibility permissions ---
    ("visibility", "reveal_pii"),
    ("visibility", "reveal_financials"),
    ("visibility", "reveal_audit_trails"),
})


class RoleService:
    def __init__(
        self,
        repository: RoleRepository,
        employee_repository: EmployeeRepository | None = None,
    ) -> None:
        self._repo = repository
        self._emp_repo = employee_repository

    # ------------------------------------------------------------------
    # Role CRUD
    # ------------------------------------------------------------------

    def get_roles_for_employees(
        self, employee_ids: list[str]
    ) -> dict[str, list[tuple[str, str]]]:
        """Return {employee_id: [(role_id, role_name)]} for bulk display."""
        return self._repo.find_role_names_bulk(employee_ids)

    def list_roles(
        self, limit: int = 20, cursor: str | None = None
    ) -> tuple[list[Role], int, str | None]:
        rows = self._repo.find_all_roles(limit, cursor)
        total = self._repo.count_roles()
        has_next = len(rows) > limit
        page = rows[:limit]
        next_cursor = page[-1].id if has_next else None
        return page, total, next_cursor

    def get_role(self, role_id: str) -> Role:
        role = self._repo.find_role_by_id(role_id)
        if role is None:
            raise ResourceNotFoundError(f"Role '{role_id}' not found.")
        return role

    def create_role(
        self,
        name: str,
        description: str | None,
        auto_assign_departments: list[str],
        dashboard_config: dict | None,
    ) -> Role:
        name = name.strip()
        if not name:
            raise ValidationError("Role name must not be blank.")
        if self._repo.find_role_by_name(name) is not None:
            raise ConflictError(f"A role named '{name}' already exists.")

        config_str = self._serialize_dashboard_config(dashboard_config)
        now = datetime.now(UTC)
        role = Role(
            id=f"role_{secrets.token_hex(8)}",
            name=name,
            description=description,
            is_system=False,
            auto_assign_departments=json.dumps(auto_assign_departments) if auto_assign_departments else None,
            dashboard_config=config_str,
            created_at=now,
            updated_at=now,
        )
        saved = self._repo.save_role(role)
        if auto_assign_departments:
            self._sync_auto_assignments(saved.id, auto_assign_departments)
        logger.info("Role created.", role_id=saved.id, name=saved.name)
        return saved

    def update_role(
        self,
        role_id: str,
        name: str | None = None,
        description: str | None = None,
        auto_assign_departments: list[str] | None = None,
        dashboard_config: dict | None = None,
    ) -> Role:
        role = self.get_role(role_id)
        now = datetime.now(UTC)

        if name is not None:
            name = name.strip()
            if not name:
                raise ValidationError("Role name must not be blank.")
            if name != role.name:
                existing = self._repo.find_role_by_name(name)
                if existing is not None:
                    raise ConflictError(f"A role named '{name}' already exists.")
            role.name = name

        if description is not None:
            role.description = description

        if auto_assign_departments is not None:
            role.auto_assign_departments = json.dumps(auto_assign_departments) if auto_assign_departments else None

        if dashboard_config is not None:
            role.dashboard_config = self._serialize_dashboard_config(dashboard_config)

        role.updated_at = now
        saved = self._repo.save_role(role)
        if auto_assign_departments is not None:
            self._sync_auto_assignments(saved.id, auto_assign_departments)
        logger.info("Role updated.", role_id=role_id)
        return saved

    def delete_role(self, role_id: str) -> None:
        role = self.get_role(role_id)
        if role.is_system:
            raise SystemRoleDeleteError(
                f"Role '{role.name}' is a system role and cannot be deleted."
            )
        self._repo.soft_delete_role(role_id)
        logger.info("Role deleted.", role_id=role_id)

    def set_sort_orders(self, orders: list[dict]) -> None:
        """Persist hierarchy sort_order for roles. System roles are always pinned at 0."""
        pairs = []
        for item in orders:
            role = self._repo.find_role_by_id(item["role_id"])
            if role is None:
                continue
            sort_order = 0 if role.is_system else item["sort_order"]
            pairs.append((item["role_id"], sort_order))
        self._repo.set_sort_orders(pairs)
        logger.info("Role sort orders updated.", count=len(pairs))

    # ------------------------------------------------------------------
    # Permission management
    # ------------------------------------------------------------------

    def get_permissions(self, role_id: str) -> list[Permission]:
        self.get_role(role_id)  # ensures role exists
        return self._repo.find_permissions_for_role(role_id)

    def set_permissions(
        self, role_id: str, permission_pairs: list[dict]
    ) -> list[Permission]:
        self.get_role(role_id)  # ensures role exists

        validated: list[tuple[str, str]] = []
        for entry in permission_pairs:
            module = entry.get("module", "")
            action = entry.get("action", "")
            if (module, action) not in _VALID_PERMISSIONS:
                raise ValidationError(
                    f"Unknown permission: ({module}, {action}). "
                    "Must be one of the registered permission pairs."
                )
            validated.append((module, action))

        return self._repo.replace_permissions(role_id, list(set(validated)))

    def check_permission(
        self, employee_id: str, module: str, action: str
    ) -> bool:
        """Return True if the employee holds (module, action) via any role or manager assignment."""
        perms = self._repo.get_all_permissions_for_employee(employee_id)
        if any(p.module == module and p.action == action for p in perms):
            return True
        # Also check manager_permissions on assignments where is_manager=True
        return self._repo.check_manager_permission(employee_id, module, action)

    def get_effective_permissions(self, employee_id: str) -> list:
        """Return deduplicated list of all permissions the employee holds across all assigned roles."""
        return self._repo.get_all_permissions_for_employee(employee_id)

    def get_default_permissions(self) -> list[dict]:
        """Return the system-wide default permissions applied to all users."""
        return self._repo.get_default_permissions()

    def set_default_permissions(self, permissions: list[dict], updated_by: str) -> list[dict]:
        """Validate and persist the system-wide default permissions.

        Args:
            permissions: Raw permission list from the request.
            updated_by: Employee ID of the admin making the change.

        Returns:
            The deduplicated, validated list that was saved.

        Raises:
            ValueError: If any permission pair is not in the registered allowlist.
        """
        validated: list[dict] = []
        seen: set[tuple[str, str]] = set()
        for entry in permissions:
            pair = (entry.get("module", ""), entry.get("action", ""))
            if pair not in _VALID_PERMISSIONS:
                raise ValidationError(f"Unknown permission: {pair}")
            if pair not in seen:
                seen.add(pair)
                validated.append({"module": pair[0], "action": pair[1]})
        return self._repo.set_default_permissions(validated, updated_by)

    def get_effective_permissions_with_defaults(self, employee_id: str) -> list[dict]:
        """Return all permissions for an employee, merging assigned roles and global defaults.

        Args:
            employee_id: The employee to look up.

        Returns:
            Deduplicated list of permission dicts with 'module' and 'action' keys.
        """
        perms = self._repo.get_all_permissions_for_employee(employee_id)
        seen = {(p.module, p.action) for p in perms}
        result: list[dict] = [{"module": p.module, "action": p.action} for p in perms]
        for d in self._repo.get_default_permissions():
            key = (d.get("module", ""), d.get("action", ""))
            if key not in seen:
                seen.add(key)
                result.append({"module": key[0], "action": key[1]})
        return result

    # ------------------------------------------------------------------
    # Grant permission hierarchy
    # ------------------------------------------------------------------

    def get_manager_permissions(self, role_id: str) -> list[dict]:
        """Return the role-level manager permission template."""
        self.get_role(role_id)  # ensures role exists
        return self._repo.get_manager_permissions(role_id)

    def set_manager_permissions(
        self, role_id: str, permission_pairs: list[dict]
    ) -> list[dict]:
        """Validate and persist the manager permission template for a role.

        Manager permissions are additive — holders of this role with is_manager=True
        receive base role permissions PLUS these manager permissions.
        """
        self.get_role(role_id)  # ensures role exists

        validated: list[dict] = []
        seen: set[tuple[str, str]] = set()
        for entry in permission_pairs:
            module = entry.get("module", "")
            action = entry.get("action", "")
            if (module, action) not in _VALID_PERMISSIONS:
                raise ValidationError(
                    f"Unknown permission: ({module}, {action}). "
                    "Must be one of the registered permission pairs."
                )
            key = (module, action)
            if key not in seen:
                seen.add(key)
                validated.append({"module": module, "action": action})

        result = self._repo.set_manager_permissions(role_id, validated)
        logger.info("Manager permissions set.", role_id=role_id, count=len(validated))
        return result

    def get_grantable_roles(self, granting_role_id: str) -> list[str]:
        self.get_role(granting_role_id)
        return self._repo.find_grantable_role_ids(granting_role_id)

    def set_grantable_roles(
        self, granting_role_id: str, assignable_role_ids: list[str]
    ) -> None:
        self.get_role(granting_role_id)
        for rid in assignable_role_ids:
            if rid == granting_role_id:
                raise ValidationError("A role cannot grant itself.")
            if self._repo.find_role_by_id(rid) is None:
                raise ResourceNotFoundError(f"Role '{rid}' not found.")
        self._repo.set_grant_permissions(granting_role_id, list(set(assignable_role_ids)))

    # ------------------------------------------------------------------
    # Role assignment
    # ------------------------------------------------------------------

    def get_employee_roles(self, employee_id: str) -> list[RoleAssignment]:
        return self._repo.find_assignments_for_employee(employee_id)

    def get_role_assignments(self, role_id: str) -> list[RoleAssignment]:
        self.get_role(role_id)
        return self._repo.find_assignments_for_role(role_id)

    def assign_role(
        self,
        employee_id: str,
        role_id: str,
        assigned_by: str | None,
        is_manager: bool = False,
        manager_permissions: list[dict] | None = None,
    ) -> RoleAssignment:
        role = self.get_role(role_id)  # ensures role exists
        existing = self._repo.find_assignment(employee_id, role_id)
        if existing is not None:
            logger.info("Role already assigned (idempotent).", employee_id=employee_id, role_id=role_id)
            return existing
        # When assigning as manager with no explicit perms, seed from the role template
        if is_manager and not manager_permissions:
            manager_permissions = self._repo.get_manager_permissions(role.id)

        mgr_perms_str = self._serialize_manager_permissions(manager_permissions or [])
        assignment = RoleAssignment(
            employee_id=employee_id,
            role_id=role_id,
            assigned_by=assigned_by,
            assigned_at=datetime.now(UTC),
            is_manager=is_manager,
            manager_permissions=mgr_perms_str,
        )
        # Clear any blacklist entry so future auto-assigns can apply
        self._repo.remove_from_blacklist(employee_id, role_id)
        logger.info("Role assigned.", employee_id=employee_id, role_id=role_id, assigned_by=assigned_by, is_manager=is_manager)
        return self._repo.save_assignment(assignment)

    def update_assignment(
        self,
        employee_id: str,
        role_id: str,
        is_manager: bool,
        manager_permissions: list[dict],
    ) -> RoleAssignment:
        assignment = self._repo.find_assignment(employee_id, role_id)
        if assignment is None:
            raise ResourceNotFoundError(
                f"Role assignment ({employee_id}, {role_id}) not found."
            )
        assignment.is_manager = is_manager
        assignment.manager_permissions = self._serialize_manager_permissions(manager_permissions)
        return self._repo.save_assignment(assignment)

    def unassign_role(self, employee_id: str, role_id: str, blacklist: bool = False) -> None:
        self._repo.delete_assignment(employee_id, role_id)
        if blacklist:
            self._repo.add_to_blacklist(employee_id, role_id)
        logger.info("Role unassigned.", employee_id=employee_id, role_id=role_id, blacklisted=blacklist)

    def unassign_all_roles(self, employee_id: str) -> int:
        """Remove every role assignment for an employee. Returns count removed."""
        assignments = self._repo.find_assignments_for_employee(employee_id)
        for a in assignments:
            self._repo.delete_assignment(employee_id, a.role_id)
        logger.info("All roles unassigned.", employee_id=employee_id, count=len(assignments))
        return len(assignments)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _sync_auto_assignments(self, role_id: str, departments: list[str]) -> None:
        """Sync role assignments to match the current auto_assign_departments.

        - Assigns the role to active employees in the listed departments who don't have it.
        - Revokes the role from employees whose department is no longer in the list
          (only auto-assigned ones, i.e. those without assigned_by).

        No-ops if no EmployeeRepository is configured.
        """
        if not self._emp_repo:
            return

        current_assignments = self._repo.find_assignments_for_role(role_id)
        existing_emp_ids = {a.employee_id for a in current_assignments}

        # Add: assign to employees in the target departments
        if departments:
            employees = self._emp_repo.find_active_by_departments(departments)
            now = datetime.now(UTC)
            target_emp_ids = {emp.id for emp in employees}
            for emp in employees:
                if emp.id in existing_emp_ids:
                    continue
                if self._repo.is_blacklisted(emp.id, role_id):
                    continue
                assignment = RoleAssignment(
                    employee_id=emp.id,
                    role_id=role_id,
                    assigned_at=now,
                    is_manager=False,
                    manager_permissions=None,
                )
                self._repo.save_assignment(assignment)
        else:
            target_emp_ids = set()

        # Remove: revoke from employees no longer in target departments
        # Only revoke auto-assigned (assigned_by is NULL)
        dept_set = set(departments) if departments else set()
        for a in current_assignments:
            if a.employee_id in target_emp_ids:
                continue
            # Only revoke if this was an auto-assignment (no assigned_by)
            if a.assigned_by is not None:
                continue
            emp = self._emp_repo.find_by_id(a.employee_id)
            if emp and emp.department not in dept_set:
                self._repo.delete_assignment(a.employee_id, role_id)

    @staticmethod
    def _serialize_dashboard_config(config: dict | None) -> str | None:
        """Serialize dashboard_config dict to a JSON string for DB storage."""
        if config is None:
            return None
        try:
            return json.dumps(config)
        except (TypeError, ValueError) as exc:
            raise ValidationError(f"dashboard_config must be JSON-serializable: {exc}") from exc

    @staticmethod
    def _serialize_manager_permissions(perms: list[dict]) -> str | None:
        """Serialize manager_permissions list to a JSON string for DB storage."""
        if not perms:
            return None
        return json.dumps(perms)

    @staticmethod
    def deserialize_dashboard_config(raw: str | None) -> dict | None:
        """Parse a JSON string back into a dashboard_config dict. Returns None on invalid input."""
        if raw is None:
            return None
        try:
            return json.loads(raw)
        except (TypeError, ValueError):
            return None

    @staticmethod
    def deserialize_auto_assign_departments(raw: str | None) -> list[str]:
        """Parse a JSON string back into a departments list. Returns [] on invalid input."""
        if raw is None:
            return []
        try:
            result = json.loads(raw)
            return result if isinstance(result, list) else []
        except (TypeError, ValueError):
            return []

    @staticmethod
    def deserialize_manager_permissions(raw: str | None) -> list[dict]:
        """Parse a JSON string back into a manager_permissions list. Returns [] on invalid input."""
        if raw is None:
            return []
        try:
            result = json.loads(raw)
            return result if isinstance(result, list) else []
        except (TypeError, ValueError):
            return []
