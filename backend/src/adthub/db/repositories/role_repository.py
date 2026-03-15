"""Data access layer for Role & Permission Management.

Manages four related tables: roles, permissions, role_grant_permissions,
and role_assignments. Does not extend BaseRepository because the query
patterns across these tables differ significantly.
"""

import json
import secrets
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from ..models.config_tables import Permission, Role, RoleAssignment, RoleAssignmentBlacklist, RoleGrantPermission, SystemSetting
from ..models.employees import Employee  # noqa: F401 — needed for JOIN in get_all_permissions
from ...exceptions import ResourceNotFoundError


class RoleRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    # ------------------------------------------------------------------
    # Role CRUD
    # ------------------------------------------------------------------

    def find_role_by_id(self, role_id: str) -> Role | None:
        return (
            self._session.query(Role)
            .filter(Role.id == role_id, Role.deleted_at.is_(None))
            .first()
        )

    def find_role_by_name(self, name: str) -> Role | None:
        return (
            self._session.query(Role)
            .filter(Role.name == name, Role.deleted_at.is_(None))
            .first()
        )

    def find_all_roles(self, limit: int, cursor: str | None) -> list[Role]:
        query = (
            self._session.query(Role)
            .filter(Role.deleted_at.is_(None))
            .order_by(Role.sort_order, Role.id)
        )
        if cursor:
            query = query.filter(Role.id > cursor)
        return query.limit(limit + 1).all()

    def set_sort_orders(self, orders: list[tuple[str, int]]) -> None:
        """Bulk-update sort_order for a list of (role_id, sort_order) pairs."""
        for role_id, order in orders:
            self._session.query(Role).filter(Role.id == role_id).update({"sort_order": order})
        self._session.flush()

    def count_roles(self) -> int:
        return (
            self._session.query(Role)
            .filter(Role.deleted_at.is_(None))
            .count()
        )

    def save_role(self, role: Role) -> Role:
        self._session.add(role)
        self._session.flush()
        return role

    def soft_delete_role(self, role_id: str) -> None:
        role = self.find_role_by_id(role_id)
        if role is None:
            raise ResourceNotFoundError(f"Role '{role_id}' not found.")
        role.deleted_at = datetime.now(timezone.utc)
        self._session.flush()

    # ------------------------------------------------------------------
    # Permission management (PUT-replace semantics)
    # ------------------------------------------------------------------

    def find_permissions_for_role(self, role_id: str) -> list[Permission]:
        return (
            self._session.query(Permission)
            .filter(Permission.role_id == role_id)
            .order_by(Permission.module, Permission.action)
            .all()
        )

    def replace_permissions(
        self, role_id: str, new_pairs: list[tuple[str, str]]
    ) -> list[Permission]:
        """Hard-delete all existing permissions for the role, then bulk-insert new set."""
        self._session.query(Permission).filter(Permission.role_id == role_id).delete()
        now = datetime.now(timezone.utc)
        new_rows = [
            Permission(
                id=f"perm_{secrets.token_hex(8)}",
                role_id=role_id,
                module=module,
                action=action,
                created_at=now,
            )
            for module, action in new_pairs
        ]
        self._session.bulk_save_objects(new_rows)
        self._session.flush()
        return self.find_permissions_for_role(role_id)

    def get_all_permissions_for_employee(self, employee_id: str) -> list[Permission]:
        """Return merged permissions across all roles assigned to the employee (OR-gate).

        For assignments where is_manager=True, also includes the role-level
        manager_permissions template additively on top of base permissions.
        """
        base_perms = (
            self._session.query(Permission)
            .join(RoleAssignment, RoleAssignment.role_id == Permission.role_id)
            .filter(RoleAssignment.employee_id == employee_id)
            .all()
        )
        seen: set[tuple[str, str]] = {(p.module, p.action) for p in base_perms}
        result: list[Permission] = list(base_perms)

        # Add role-level manager_permissions for each manager assignment
        manager_assignments = (
            self._session.query(RoleAssignment)
            .join(Role, Role.id == RoleAssignment.role_id)
            .filter(
                RoleAssignment.employee_id == employee_id,
                RoleAssignment.is_manager.is_(True),
            )
            .all()
        )
        for assignment in manager_assignments:
            role = self._session.query(Role).filter(Role.id == assignment.role_id).first()
            if role is None or not role.manager_permissions:
                continue
            try:
                mgr_pairs = json.loads(role.manager_permissions)
            except (TypeError, ValueError):
                continue
            for pair in mgr_pairs:
                key = (pair.get("module", ""), pair.get("action", ""))
                if key not in seen:
                    seen.add(key)
                    # Synthesise a Permission-like object for the caller
                    result.append(
                        Permission(
                            id=f"mgr_{key[0]}_{key[1]}",
                            role_id=assignment.role_id,
                            module=key[0],
                            action=key[1],
                        )
                    )
        return result

    def get_manager_permissions(self, role_id: str) -> list[dict]:
        """Return the role-level manager permission template as a list of dicts."""
        role = self.find_role_by_id(role_id)
        if role is None:
            raise ResourceNotFoundError(f"Role '{role_id}' not found.")
        try:
            result = json.loads(role.manager_permissions or "[]")
            return result if isinstance(result, list) else []
        except (TypeError, ValueError):
            return []

    def set_manager_permissions(self, role_id: str, pairs: list[dict]) -> list[dict]:
        """Persist the manager permission template for a role (PUT-replace semantics)."""
        role = self.find_role_by_id(role_id)
        if role is None:
            raise ResourceNotFoundError(f"Role '{role_id}' not found.")
        role.manager_permissions = json.dumps(pairs) if pairs else None
        role.updated_at = datetime.now(timezone.utc)
        self._session.flush()
        return pairs

    # ------------------------------------------------------------------
    # Grant permission hierarchy
    # ------------------------------------------------------------------

    def find_grantable_role_ids(self, granting_role_id: str) -> list[str]:
        rows = (
            self._session.query(RoleGrantPermission)
            .filter(RoleGrantPermission.granting_role_id == granting_role_id)
            .all()
        )
        return [r.assignable_role_id for r in rows]

    def set_grant_permissions(
        self, granting_role_id: str, assignable_role_ids: list[str]
    ) -> None:
        """PUT-replace: delete existing grants for this role and insert new set."""
        self._session.query(RoleGrantPermission).filter(
            RoleGrantPermission.granting_role_id == granting_role_id
        ).delete()
        now = datetime.now(timezone.utc)
        new_rows = [
            RoleGrantPermission(
                granting_role_id=granting_role_id,
                assignable_role_id=rid,
                created_at=now,
            )
            for rid in assignable_role_ids
        ]
        self._session.bulk_save_objects(new_rows)
        self._session.flush()

    # ------------------------------------------------------------------
    # Role assignments
    # ------------------------------------------------------------------

    def find_assignments_for_employee(self, employee_id: str) -> list[RoleAssignment]:
        return (
            self._session.query(RoleAssignment)
            .filter(RoleAssignment.employee_id == employee_id)
            .all()
        )

    def find_assignments_for_role(self, role_id: str) -> list[RoleAssignment]:
        return (
            self._session.query(RoleAssignment)
            .filter(RoleAssignment.role_id == role_id)
            .all()
        )

    def find_assignment(
        self, employee_id: str, role_id: str
    ) -> RoleAssignment | None:
        return (
            self._session.query(RoleAssignment)
            .filter(
                RoleAssignment.employee_id == employee_id,
                RoleAssignment.role_id == role_id,
            )
            .first()
        )

    def save_assignment(self, assignment: RoleAssignment) -> RoleAssignment:
        self._session.add(assignment)
        self._session.flush()
        return assignment

    def delete_assignment(self, employee_id: str, role_id: str) -> None:
        deleted = (
            self._session.query(RoleAssignment)
            .filter(
                RoleAssignment.employee_id == employee_id,
                RoleAssignment.role_id == role_id,
            )
            .delete()
        )
        if not deleted:
            raise ResourceNotFoundError(
                f"Role assignment ({employee_id}, {role_id}) not found."
            )
        self._session.flush()

    def delete_all_assignments_for_employee(self, employee_id: str) -> int:
        """Remove all role assignments for an employee. Returns count deleted."""
        deleted = (
            self._session.query(RoleAssignment)
            .filter(RoleAssignment.employee_id == employee_id)
            .delete()
        )
        self._session.flush()
        return deleted

    def find_roles_by_department(self, department: str) -> list[Role]:
        """Return all active roles whose auto_assign_departments includes the given value."""
        all_roles = (
            self._session.query(Role)
            .filter(Role.deleted_at.is_(None), Role.auto_assign_departments.isnot(None))
            .all()
        )
        result = []
        for role in all_roles:
            try:
                depts = json.loads(role.auto_assign_departments or "[]")
                if department in depts:
                    result.append(role)
            except (TypeError, ValueError):
                continue
        return result

    def check_manager_permission(
        self, employee_id: str, module: str, action: str
    ) -> bool:
        """Return True if any manager assignment for this employee grants (module, action)."""
        assignments = (
            self._session.query(RoleAssignment)
            .filter(
                RoleAssignment.employee_id == employee_id,
                RoleAssignment.is_manager.is_(True),
                RoleAssignment.manager_permissions.isnot(None),
            )
            .all()
        )
        for assignment in assignments:
            try:
                perms = json.loads(assignment.manager_permissions or "[]")
                if any(p.get("module") == module and p.get("action") == action for p in perms):
                    return True
            except (TypeError, ValueError):
                continue
        return False

    # ------------------------------------------------------------------
    # Auto-assign blacklist
    # ------------------------------------------------------------------

    def add_to_blacklist(self, employee_id: str, role_id: str) -> None:
        """Blacklist an employee+role combo so auto-assign won't re-add it."""
        existing = (
            self._session.query(RoleAssignmentBlacklist)
            .filter(
                RoleAssignmentBlacklist.employee_id == employee_id,
                RoleAssignmentBlacklist.role_id == role_id,
            )
            .first()
        )
        if existing is None:
            self._session.add(
                RoleAssignmentBlacklist(
                    employee_id=employee_id,
                    role_id=role_id,
                    created_at=datetime.now(timezone.utc),
                )
            )
            self._session.flush()

    def remove_from_blacklist(self, employee_id: str, role_id: str) -> None:
        """Clear a blacklist entry (called when role is manually re-added)."""
        self._session.query(RoleAssignmentBlacklist).filter(
            RoleAssignmentBlacklist.employee_id == employee_id,
            RoleAssignmentBlacklist.role_id == role_id,
        ).delete()
        self._session.flush()

    def is_blacklisted(self, employee_id: str, role_id: str) -> bool:
        return (
            self._session.query(RoleAssignmentBlacklist)
            .filter(
                RoleAssignmentBlacklist.employee_id == employee_id,
                RoleAssignmentBlacklist.role_id == role_id,
            )
            .first()
        ) is not None

    # ------------------------------------------------------------------
    # Default permissions (system-wide setting)
    # ------------------------------------------------------------------

    def get_default_permissions(self) -> list[dict]:
        """Return the list of default permissions stored in system settings.

        Returns:
            List of permission dicts with 'module' and 'action' keys.
            Empty list if not set or unparseable.
        """
        row = self._session.query(SystemSetting).filter_by(key="default_permissions").first()
        if row is None:
            return []
        try:
            result = json.loads(row.value)
            return result if isinstance(result, list) else []
        except (TypeError, ValueError):
            return []

    def set_default_permissions(self, permissions: list[dict], updated_by: str) -> list[dict]:
        """Persist the default permissions to system settings.

        Args:
            permissions: Validated list of permission dicts with 'module' and 'action' keys.
            updated_by: Employee ID of the user making the change.

        Returns:
            The saved permissions list.
        """
        now = datetime.now(timezone.utc)
        row = self._session.query(SystemSetting).filter_by(key="default_permissions").first()
        value = json.dumps(permissions)
        if row is None:
            row = SystemSetting(
                key="default_permissions",
                value=value,
                description="Default permissions applied to all users regardless of role assignment",
                updated_by=updated_by,
                updated_at=now,
            )
            self._session.add(row)
        else:
            row.value = value
            row.updated_by = updated_by
            row.updated_at = now
        return permissions
