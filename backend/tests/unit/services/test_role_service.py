"""Unit tests for RoleService (Epic 3.3 — Role & Permission Management).

All tests use mock repositories — no database is touched.
"""

import json

import pytest
from unittest.mock import MagicMock

from src.adthub.db.models.config_tables import Role, RoleAssignment
from src.adthub.db.models.employees import Employee
from src.adthub.exceptions import (
    ConflictError,
    ResourceNotFoundError,
    RoleAssignmentError,
    SystemRoleDeleteError,
    ValidationError,
)
from src.adthub.services.role_service import RoleService


def _make_role(
    role_id: str = "role_abc",
    name: str = "Engineer",
    is_system: bool = False,
    auto_assign_departments: str | None = None,
) -> Role:
    r = Role()
    r.id = role_id
    r.name = name
    r.description = None
    r.is_system = is_system
    r.auto_assign_departments = auto_assign_departments
    r.dashboard_config = None
    r.created_at = None
    r.updated_at = None
    return r


def _make_employee(emp_id: str, department: str, status: str = "active") -> Employee:
    e = Employee()
    e.id = emp_id
    e.department = department
    e.status = status
    e.deleted_at = None
    return e


def _make_assignment(employee_id: str, role_id: str, assigned_by: str | None = None) -> RoleAssignment:
    from datetime import datetime, timezone
    a = RoleAssignment()
    a.employee_id = employee_id
    a.role_id = role_id
    a.assigned_by = assigned_by
    a.assigned_at = datetime.now(timezone.utc)
    a.is_manager = False
    a.manager_permissions = None
    return a


def _make_service(
    mock_repo: MagicMock,
    mock_emp_repo: MagicMock | None = None,
) -> RoleService:
    return RoleService(repository=mock_repo, employee_repository=mock_emp_repo)


# ---------------------------------------------------------------------------
# create_role
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_create_role_stores_new_role_with_is_system_false() -> None:
    """create_role always sets is_system=False for user-created roles."""
    mock_repo = MagicMock()
    mock_repo.find_role_by_name.return_value = None
    captured = {}

    def _save(role):
        captured["role"] = role
        return role

    mock_repo.save_role.side_effect = _save

    service = _make_service(mock_repo)
    service.create_role(
        name="Engineer", description=None,
        auto_assign_departments=[], dashboard_config=None,
    )

    assert captured["role"].is_system is False
    assert captured["role"].name == "Engineer"


@pytest.mark.unit
def test_create_role_raises_value_error_for_blank_name() -> None:
    """create_role raises ValueError when name is blank after stripping."""
    service = _make_service(MagicMock())
    with pytest.raises(ValidationError, match="must not be blank"):
        service.create_role(
            name="   ", description=None,
            auto_assign_departments=[], dashboard_config=None,
        )


@pytest.mark.unit
def test_create_role_raises_conflict_on_duplicate_name() -> None:
    """create_role raises ConflictError if a role with the same name already exists."""
    mock_repo = MagicMock()
    mock_repo.find_role_by_name.return_value = _make_role()

    service = _make_service(mock_repo)
    with pytest.raises(ConflictError):
        service.create_role(
            name="Engineer", description=None,
            auto_assign_departments=[], dashboard_config=None,
        )


@pytest.mark.unit
def test_create_role_strips_whitespace_from_name() -> None:
    """create_role strips leading/trailing whitespace from the role name."""
    mock_repo = MagicMock()
    mock_repo.find_role_by_name.return_value = None
    captured = {}

    def _save(role):
        captured["role"] = role
        return role

    mock_repo.save_role.side_effect = _save

    service = _make_service(mock_repo)
    service.create_role(
        name="  Engineer  ", description=None,
        auto_assign_departments=[], dashboard_config=None,
    )

    assert captured["role"].name == "Engineer"


@pytest.mark.unit
def test_create_role_serializes_auto_assign_departments() -> None:
    """create_role stores auto_assign_departments as a JSON string."""
    mock_repo = MagicMock()
    mock_repo.find_role_by_name.return_value = None
    captured = {}

    def _save(role):
        captured["role"] = role
        return role

    mock_repo.save_role.side_effect = _save

    service = _make_service(mock_repo)
    service.create_role(
        name="Finance", description=None,
        auto_assign_departments=["Finance", "Accounting"], dashboard_config=None,
    )

    raw = captured["role"].auto_assign_departments
    assert json.loads(raw) == ["Finance", "Accounting"]


@pytest.mark.unit
def test_create_role_triggers_sync_when_departments_provided() -> None:
    """create_role calls _sync_auto_assignments when auto_assign_departments is non-empty."""
    mock_repo = MagicMock()
    mock_repo.find_role_by_name.return_value = None
    mock_emp_repo = MagicMock()
    mock_emp_repo.find_active_by_departments.return_value = []
    mock_repo.find_assignments_for_role.return_value = []

    captured = {}

    def _save(role):
        captured["role"] = role
        return role

    mock_repo.save_role.side_effect = _save

    service = _make_service(mock_repo, mock_emp_repo)
    service.create_role(
        name="Finance", description=None,
        auto_assign_departments=["Finance"], dashboard_config=None,
    )

    mock_emp_repo.find_active_by_departments.assert_called_once_with(["Finance"])


# ---------------------------------------------------------------------------
# delete_role
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_delete_role_raises_system_role_delete_error_for_system_role() -> None:
    """delete_role raises SystemRoleDeleteError when is_system=True."""
    mock_repo = MagicMock()
    mock_repo.find_role_by_id.return_value = _make_role(is_system=True)

    service = _make_service(mock_repo)
    with pytest.raises(SystemRoleDeleteError):
        service.delete_role("role_sys_admin")


@pytest.mark.unit
def test_delete_role_soft_deletes_non_system_role() -> None:
    """delete_role calls soft_delete_role for non-system roles."""
    mock_repo = MagicMock()
    mock_repo.find_role_by_id.return_value = _make_role(role_id="role_abc", is_system=False)

    service = _make_service(mock_repo)
    service.delete_role("role_abc")

    mock_repo.soft_delete_role.assert_called_once_with("role_abc")


@pytest.mark.unit
def test_delete_role_raises_not_found_for_unknown_role() -> None:
    """delete_role (via get_role) raises ResourceNotFoundError for unknown role ID."""
    mock_repo = MagicMock()
    mock_repo.find_role_by_id.return_value = None

    service = _make_service(mock_repo)
    with pytest.raises(ResourceNotFoundError):
        service.delete_role("role_ghost")


# ---------------------------------------------------------------------------
# update_role
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_update_role_raises_conflict_when_new_name_exists() -> None:
    """update_role raises ConflictError if new name belongs to a different role."""
    existing = _make_role(role_id="role_1", name="Engineer")
    name_conflict = _make_role(role_id="role_2", name="Designer")
    mock_repo = MagicMock()
    mock_repo.find_role_by_id.return_value = existing
    mock_repo.find_role_by_name.return_value = name_conflict

    service = _make_service(mock_repo)
    with pytest.raises(ConflictError):
        service.update_role(role_id="role_1", name="Designer")


@pytest.mark.unit
def test_update_role_allows_same_name() -> None:
    """update_role does NOT raise ConflictError when new name equals the current name."""
    existing = _make_role(role_id="role_1", name="Engineer")
    mock_repo = MagicMock()
    mock_repo.find_role_by_id.return_value = existing
    mock_repo.save_role.return_value = existing
    mock_repo.find_assignments_for_role.return_value = []

    service = _make_service(mock_repo)
    service.update_role(role_id="role_1", name="Engineer")


@pytest.mark.unit
def test_update_role_serializes_auto_assign_departments() -> None:
    """update_role stores auto_assign_departments as JSON and triggers sync."""
    existing = _make_role(role_id="role_1", name="Finance")
    mock_repo = MagicMock()
    mock_repo.find_role_by_id.return_value = existing
    mock_repo.save_role.return_value = existing
    mock_repo.find_assignments_for_role.return_value = []
    mock_emp_repo = MagicMock()
    mock_emp_repo.find_active_by_departments.return_value = []

    service = _make_service(mock_repo, mock_emp_repo)
    service.update_role(role_id="role_1", auto_assign_departments=["Finance"])

    assert json.loads(existing.auto_assign_departments) == ["Finance"]


@pytest.mark.unit
def test_update_role_clears_auto_assign_departments_when_empty() -> None:
    """update_role sets auto_assign_departments to None when given an empty list."""
    existing = _make_role(role_id="role_1", name="Finance", auto_assign_departments='["Finance"]')
    mock_repo = MagicMock()
    mock_repo.find_role_by_id.return_value = existing
    mock_repo.save_role.return_value = existing
    mock_repo.find_assignments_for_role.return_value = []
    mock_emp_repo = MagicMock()

    service = _make_service(mock_repo, mock_emp_repo)
    service.update_role(role_id="role_1", auto_assign_departments=[])

    assert existing.auto_assign_departments is None


# ---------------------------------------------------------------------------
# _sync_auto_assignments
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_sync_assigns_role_to_active_employees_in_departments() -> None:
    """_sync_auto_assignments creates assignments for active employees in target departments."""
    emp1 = _make_employee("emp_1", "Finance")
    emp2 = _make_employee("emp_2", "Finance")
    mock_repo = MagicMock()
    mock_repo.find_assignments_for_role.return_value = []
    mock_repo.is_blacklisted.return_value = False
    mock_emp_repo = MagicMock()
    mock_emp_repo.find_active_by_departments.return_value = [emp1, emp2]

    service = _make_service(mock_repo, mock_emp_repo)
    service._sync_auto_assignments("role_fin", ["Finance"])

    assert mock_repo.save_assignment.call_count == 2


@pytest.mark.unit
def test_sync_skips_employees_already_assigned() -> None:
    """_sync_auto_assignments does not create duplicate assignments."""
    emp = _make_employee("emp_1", "Finance")
    existing = _make_assignment("emp_1", "role_fin")
    mock_repo = MagicMock()
    mock_repo.find_assignments_for_role.return_value = [existing]
    mock_emp_repo = MagicMock()
    mock_emp_repo.find_active_by_departments.return_value = [emp]

    service = _make_service(mock_repo, mock_emp_repo)
    service._sync_auto_assignments("role_fin", ["Finance"])

    mock_repo.save_assignment.assert_not_called()


@pytest.mark.unit
def test_sync_revokes_auto_assigned_when_department_removed() -> None:
    """_sync_auto_assignments revokes auto-assigned roles when department is removed."""
    existing = _make_assignment("emp_1", "role_fin", assigned_by=None)
    emp = _make_employee("emp_1", "Finance")
    mock_repo = MagicMock()
    mock_repo.find_assignments_for_role.return_value = [existing]
    mock_emp_repo = MagicMock()
    mock_emp_repo.find_active_by_departments.return_value = []
    mock_emp_repo.find_by_id.return_value = emp

    service = _make_service(mock_repo, mock_emp_repo)
    service._sync_auto_assignments("role_fin", [])

    mock_repo.delete_assignment.assert_called_once_with("emp_1", "role_fin")


@pytest.mark.unit
def test_sync_does_not_revoke_manually_assigned_roles() -> None:
    """_sync_auto_assignments preserves roles assigned by a user (assigned_by is set)."""
    existing = _make_assignment("emp_1", "role_fin", assigned_by="emp_admin")
    mock_repo = MagicMock()
    mock_repo.find_assignments_for_role.return_value = [existing]
    mock_emp_repo = MagicMock()
    mock_emp_repo.find_active_by_departments.return_value = []

    service = _make_service(mock_repo, mock_emp_repo)
    service._sync_auto_assignments("role_fin", [])

    mock_repo.delete_assignment.assert_not_called()


@pytest.mark.unit
def test_sync_noop_when_no_employee_repository() -> None:
    """_sync_auto_assignments does nothing when employee_repository is None."""
    mock_repo = MagicMock()

    service = _make_service(mock_repo, mock_emp_repo=None)
    service._sync_auto_assignments("role_fin", ["Finance"])

    mock_repo.save_assignment.assert_not_called()


# ---------------------------------------------------------------------------
# set_permissions
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_set_permissions_raises_value_error_for_unknown_pair() -> None:
    """set_permissions raises ValueError for any (module, action) not in the allowlist."""
    mock_repo = MagicMock()
    mock_repo.find_role_by_id.return_value = _make_role()

    service = _make_service(mock_repo)
    with pytest.raises(ValidationError, match="Unknown permission"):
        service.set_permissions(
            role_id="role_abc",
            permission_pairs=[{"module": "nonexistent", "action": "fly_to_moon"}],
        )


@pytest.mark.unit
def test_set_permissions_replaces_permission_set() -> None:
    """set_permissions delegates to repo.replace_permissions with de-duplicated pairs."""
    mock_repo = MagicMock()
    mock_repo.find_role_by_id.return_value = _make_role()
    mock_repo.replace_permissions.return_value = []

    service = _make_service(mock_repo)
    service.set_permissions(
        role_id="role_abc",
        permission_pairs=[
            {"module": "employees", "action": "create_employee"},
            {"module": "employees", "action": "archive_employee"},
        ],
    )

    mock_repo.replace_permissions.assert_called_once()
    args = mock_repo.replace_permissions.call_args[0]
    assert args[0] == "role_abc"
    assert set(args[1]) == {
        ("employees", "create_employee"),
        ("employees", "archive_employee"),
    }


# ---------------------------------------------------------------------------
# set_grantable_roles
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_set_grantable_roles_raises_value_error_for_self_grant() -> None:
    """set_grantable_roles raises ValueError when a role tries to grant itself."""
    mock_repo = MagicMock()
    mock_repo.find_role_by_id.return_value = _make_role(role_id="role_abc")

    service = _make_service(mock_repo)
    with pytest.raises(ValidationError, match="cannot grant itself"):
        service.set_grantable_roles("role_abc", ["role_abc"])


@pytest.mark.unit
def test_set_grantable_roles_raises_not_found_for_unknown_assignable_role() -> None:
    """set_grantable_roles raises ResourceNotFoundError if an assignable role doesn't exist."""
    mock_repo = MagicMock()

    def _find(role_id):
        if role_id == "role_abc":
            return _make_role(role_id="role_abc")
        return None

    mock_repo.find_role_by_id.side_effect = _find

    service = _make_service(mock_repo)
    with pytest.raises(ResourceNotFoundError):
        service.set_grantable_roles("role_abc", ["role_ghost"])


# ---------------------------------------------------------------------------
# check_permission
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_check_permission_returns_true_when_employee_has_permission() -> None:
    """check_permission returns True if any assigned role grants the requested (module, action)."""
    from src.adthub.db.models.config_tables import Permission

    perm = Permission()
    perm.module = "employees"
    perm.action = "create_employee"

    mock_repo = MagicMock()
    mock_repo.get_all_permissions_for_employee.return_value = [perm]

    service = _make_service(mock_repo)
    assert service.check_permission("emp_123", "employees", "create_employee") is True


@pytest.mark.unit
def test_check_permission_returns_false_when_employee_lacks_permission() -> None:
    """check_permission returns False if no assigned role grants the requested permission."""
    mock_repo = MagicMock()
    mock_repo.get_all_permissions_for_employee.return_value = []
    mock_repo.check_manager_permission.return_value = False

    service = _make_service(mock_repo)
    assert service.check_permission("emp_123", "admin", "manage_roles") is False


# ---------------------------------------------------------------------------
# deserialize helpers
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_deserialize_auto_assign_departments_returns_list() -> None:
    """deserialize_auto_assign_departments parses valid JSON array."""
    assert RoleService.deserialize_auto_assign_departments('["Finance","HR"]') == ["Finance", "HR"]


@pytest.mark.unit
def test_deserialize_auto_assign_departments_returns_empty_for_none() -> None:
    """deserialize_auto_assign_departments returns [] for None input."""
    assert RoleService.deserialize_auto_assign_departments(None) == []


@pytest.mark.unit
def test_deserialize_auto_assign_departments_returns_empty_for_invalid_json() -> None:
    """deserialize_auto_assign_departments returns [] for malformed JSON."""
    assert RoleService.deserialize_auto_assign_departments("not-json") == []
