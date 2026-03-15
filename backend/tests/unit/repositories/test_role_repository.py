"""Unit tests for RoleRepository — all dependencies mocked."""

import json
import pytest
from unittest.mock import MagicMock

from src.adthub.db.repositories.role_repository import RoleRepository
from src.adthub.db.models.config_tables import Permission, Role, RoleAssignment
from src.adthub.exceptions import ResourceNotFoundError
from tests.factories.config_factory import RoleFactory


def _make_assignment(employee_id: str = "emp_001", role_id: str = "role_001") -> RoleAssignment:
    a = RoleAssignment()
    a.id = "ra_test001"
    a.employee_id = employee_id
    a.role_id = role_id
    a.assigned_by = None
    a.is_manager = False
    a.manager_permissions = None
    return a


def _make_permission(role_id: str = "role_001", module: str = "employees", action: str = "view") -> Permission:
    p = Permission()
    p.id = "perm_test001"
    p.role_id = role_id
    p.module = module
    p.action = action
    return p


# ---------------------------------------------------------------------------
# find_role_by_id
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_find_role_by_id_returns_role_when_found(mock_session) -> None:
    """find_role_by_id returns the role returned by the query."""
    role = RoleFactory()
    mock_session.query.return_value.filter.return_value.first.return_value = role

    repo = RoleRepository(mock_session)
    assert repo.find_role_by_id(role.id) == role


@pytest.mark.unit
def test_find_role_by_id_returns_none_when_missing(mock_session) -> None:
    """find_role_by_id returns None for an unknown or deleted role."""
    mock_session.query.return_value.filter.return_value.first.return_value = None

    repo = RoleRepository(mock_session)
    assert repo.find_role_by_id("role_missing") is None


# ---------------------------------------------------------------------------
# find_role_by_name
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_find_role_by_name_returns_role_when_found(mock_session) -> None:
    """find_role_by_name returns the matching role."""
    role = RoleFactory(name="Admin")
    mock_session.query.return_value.filter.return_value.first.return_value = role

    repo = RoleRepository(mock_session)
    assert repo.find_role_by_name("Admin") == role


@pytest.mark.unit
def test_find_role_by_name_returns_none_when_missing(mock_session) -> None:
    """find_role_by_name returns None when no match exists."""
    mock_session.query.return_value.filter.return_value.first.return_value = None

    repo = RoleRepository(mock_session)
    assert repo.find_role_by_name("Ghost") is None


# ---------------------------------------------------------------------------
# find_all_roles
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_find_all_roles_returns_list(mock_session) -> None:
    """find_all_roles returns the list from the query chain."""
    roles = [RoleFactory(), RoleFactory()]
    (
        mock_session.query.return_value
        .filter.return_value
        .order_by.return_value
        .limit.return_value
        .all.return_value
    ) = roles

    repo = RoleRepository(mock_session)
    result = repo.find_all_roles(limit=50, cursor=None)

    assert result == roles


@pytest.mark.unit
def test_find_all_roles_returns_empty_list_when_none(mock_session) -> None:
    """find_all_roles returns [] when no active roles exist."""
    (
        mock_session.query.return_value
        .filter.return_value
        .order_by.return_value
        .limit.return_value
        .all.return_value
    ) = []

    repo = RoleRepository(mock_session)
    assert repo.find_all_roles(limit=50, cursor=None) == []


# ---------------------------------------------------------------------------
# count_roles
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_count_roles_returns_integer(mock_session) -> None:
    """count_roles returns the count from the query."""
    mock_session.query.return_value.filter.return_value.count.return_value = 5

    repo = RoleRepository(mock_session)
    assert repo.count_roles() == 5


# ---------------------------------------------------------------------------
# save_role
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_save_role_calls_add_and_flush(mock_session) -> None:
    """save_role adds the role to the session and flushes."""
    role = RoleFactory()

    repo = RoleRepository(mock_session)
    result = repo.save_role(role)

    mock_session.add.assert_called_once_with(role)
    mock_session.flush.assert_called_once()
    assert result == role


# ---------------------------------------------------------------------------
# soft_delete_role
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_soft_delete_role_sets_deleted_at(mock_session) -> None:
    """soft_delete_role marks the role as deleted and flushes."""
    role = RoleFactory()
    mock_session.query.return_value.filter.return_value.first.return_value = role

    repo = RoleRepository(mock_session)
    repo.soft_delete_role(role.id)

    assert role.deleted_at is not None
    mock_session.flush.assert_called_once()


@pytest.mark.unit
def test_soft_delete_role_raises_not_found_when_missing(mock_session) -> None:
    """soft_delete_role raises ResourceNotFoundError for an unknown role."""
    mock_session.query.return_value.filter.return_value.first.return_value = None

    repo = RoleRepository(mock_session)
    with pytest.raises(ResourceNotFoundError):
        repo.soft_delete_role("role_missing")


# ---------------------------------------------------------------------------
# find_permissions_for_role
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_find_permissions_for_role_returns_list(mock_session) -> None:
    """find_permissions_for_role returns the permissions from the query."""
    perms = [_make_permission(), _make_permission(action="edit")]
    (
        mock_session.query.return_value
        .filter.return_value
        .order_by.return_value
        .all.return_value
    ) = perms

    repo = RoleRepository(mock_session)
    result = repo.find_permissions_for_role("role_001")

    assert result == perms


@pytest.mark.unit
def test_find_permissions_for_role_returns_empty_list(mock_session) -> None:
    """find_permissions_for_role returns [] when the role has no permissions."""
    (
        mock_session.query.return_value
        .filter.return_value
        .order_by.return_value
        .all.return_value
    ) = []

    repo = RoleRepository(mock_session)
    assert repo.find_permissions_for_role("role_empty") == []


# ---------------------------------------------------------------------------
# get_all_permissions_for_employee
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_get_all_permissions_for_employee_returns_merged_list(mock_session) -> None:
    """get_all_permissions_for_employee returns all permissions across assigned roles."""
    perms = [_make_permission(module="employees"), _make_permission(module="assets")]
    (
        mock_session.query.return_value
        .join.return_value
        .filter.return_value
        .all.return_value
    ) = perms

    repo = RoleRepository(mock_session)
    result = repo.get_all_permissions_for_employee("emp_001")

    assert result == perms


@pytest.mark.unit
def test_get_all_permissions_for_employee_returns_empty_when_no_roles(mock_session) -> None:
    """get_all_permissions_for_employee returns [] when employee has no role assignments."""
    (
        mock_session.query.return_value
        .join.return_value
        .filter.return_value
        .all.return_value
    ) = []

    repo = RoleRepository(mock_session)
    assert repo.get_all_permissions_for_employee("emp_noroles") == []


# ---------------------------------------------------------------------------
# find_assignments_for_employee
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_find_assignments_for_employee_returns_list(mock_session) -> None:
    """find_assignments_for_employee returns all role assignments for the employee."""
    assignments = [_make_assignment(), _make_assignment(role_id="role_002")]
    mock_session.query.return_value.filter.return_value.all.return_value = assignments

    repo = RoleRepository(mock_session)
    result = repo.find_assignments_for_employee("emp_001")

    assert result == assignments


@pytest.mark.unit
def test_find_assignments_for_employee_returns_empty_list(mock_session) -> None:
    """find_assignments_for_employee returns [] when no assignments exist."""
    mock_session.query.return_value.filter.return_value.all.return_value = []

    repo = RoleRepository(mock_session)
    assert repo.find_assignments_for_employee("emp_new") == []


# ---------------------------------------------------------------------------
# find_assignment
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_find_assignment_returns_assignment_when_found(mock_session) -> None:
    """find_assignment returns the specific employee/role pair."""
    assignment = _make_assignment()
    mock_session.query.return_value.filter.return_value.first.return_value = assignment

    repo = RoleRepository(mock_session)
    result = repo.find_assignment("emp_001", "role_001")

    assert result == assignment


@pytest.mark.unit
def test_find_assignment_returns_none_when_not_found(mock_session) -> None:
    """find_assignment returns None when the employee is not assigned to the role."""
    mock_session.query.return_value.filter.return_value.first.return_value = None

    repo = RoleRepository(mock_session)
    assert repo.find_assignment("emp_001", "role_missing") is None


# ---------------------------------------------------------------------------
# save_assignment
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_save_assignment_calls_add_and_flush(mock_session) -> None:
    """save_assignment persists the assignment and returns it."""
    assignment = _make_assignment()

    repo = RoleRepository(mock_session)
    result = repo.save_assignment(assignment)

    mock_session.add.assert_called_once_with(assignment)
    mock_session.flush.assert_called_once()
    assert result == assignment


# ---------------------------------------------------------------------------
# delete_assignment
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_delete_assignment_deletes_and_flushes(mock_session) -> None:
    """delete_assignment removes the row and flushes."""
    mock_session.query.return_value.filter.return_value.delete.return_value = 1

    repo = RoleRepository(mock_session)
    repo.delete_assignment("emp_001", "role_001")

    mock_session.flush.assert_called_once()


@pytest.mark.unit
def test_delete_assignment_raises_not_found_when_missing(mock_session) -> None:
    """delete_assignment raises ResourceNotFoundError when nothing is deleted."""
    mock_session.query.return_value.filter.return_value.delete.return_value = 0

    repo = RoleRepository(mock_session)
    with pytest.raises(ResourceNotFoundError):
        repo.delete_assignment("emp_001", "role_missing")


# ---------------------------------------------------------------------------
# delete_all_assignments_for_employee
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_delete_all_assignments_for_employee_returns_count(mock_session) -> None:
    """delete_all_assignments_for_employee returns the number of deleted rows."""
    mock_session.query.return_value.filter.return_value.delete.return_value = 3

    repo = RoleRepository(mock_session)
    count = repo.delete_all_assignments_for_employee("emp_001")

    assert count == 3
    mock_session.flush.assert_called_once()


@pytest.mark.unit
def test_delete_all_assignments_for_employee_returns_zero_when_none(mock_session) -> None:
    """delete_all_assignments_for_employee returns 0 when no assignments exist."""
    mock_session.query.return_value.filter.return_value.delete.return_value = 0

    repo = RoleRepository(mock_session)
    assert repo.delete_all_assignments_for_employee("emp_new") == 0


# ---------------------------------------------------------------------------
# find_roles_by_department
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_find_roles_by_department_returns_matching_roles(mock_session) -> None:
    """find_roles_by_department returns roles whose JSON list includes the department."""
    role = RoleFactory()
    role.auto_assign_departments = json.dumps(["Engineering", "Product"])
    mock_session.query.return_value.filter.return_value.all.return_value = [role]

    repo = RoleRepository(mock_session)
    result = repo.find_roles_by_department("Engineering")

    assert role in result


@pytest.mark.unit
def test_find_roles_by_department_excludes_non_matching_roles(mock_session) -> None:
    """find_roles_by_department excludes roles whose department list doesn't match."""
    role = RoleFactory()
    role.auto_assign_departments = json.dumps(["Marketing"])
    mock_session.query.return_value.filter.return_value.all.return_value = [role]

    repo = RoleRepository(mock_session)
    result = repo.find_roles_by_department("Engineering")

    assert result == []


@pytest.mark.unit
def test_find_roles_by_department_skips_invalid_json(mock_session) -> None:
    """find_roles_by_department skips roles with unparseable auto_assign_departments."""
    role = RoleFactory()
    role.auto_assign_departments = "not-valid-json"
    mock_session.query.return_value.filter.return_value.all.return_value = [role]

    repo = RoleRepository(mock_session)
    result = repo.find_roles_by_department("Engineering")

    assert result == []


# ---------------------------------------------------------------------------
# get_default_permissions
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_get_default_permissions_returns_list_when_set(mock_session) -> None:
    """get_default_permissions parses and returns the stored permission list."""
    from src.adthub.db.models.config_tables import SystemSetting
    row = SystemSetting()
    row.key = "default_permissions"
    row.value = json.dumps([{"module": "employees", "action": "view"}])
    mock_session.query.return_value.filter_by.return_value.first.return_value = row

    repo = RoleRepository(mock_session)
    result = repo.get_default_permissions()

    assert result == [{"module": "employees", "action": "view"}]


@pytest.mark.unit
def test_get_default_permissions_returns_empty_list_when_not_set(mock_session) -> None:
    """get_default_permissions returns [] when no system setting row exists."""
    mock_session.query.return_value.filter_by.return_value.first.return_value = None

    repo = RoleRepository(mock_session)
    assert repo.get_default_permissions() == []


@pytest.mark.unit
def test_get_default_permissions_returns_empty_list_for_invalid_json(mock_session) -> None:
    """get_default_permissions returns [] when the stored value is not valid JSON."""
    from src.adthub.db.models.config_tables import SystemSetting
    row = SystemSetting()
    row.key = "default_permissions"
    row.value = "not-json"
    mock_session.query.return_value.filter_by.return_value.first.return_value = row

    repo = RoleRepository(mock_session)
    assert repo.get_default_permissions() == []


# ---------------------------------------------------------------------------
# set_default_permissions
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_set_default_permissions_creates_row_when_absent(mock_session) -> None:
    """set_default_permissions adds a new SystemSetting row when none exists."""
    mock_session.query.return_value.filter_by.return_value.first.return_value = None
    permissions = [{"module": "employees", "action": "view"}]

    repo = RoleRepository(mock_session)
    result = repo.set_default_permissions(permissions, updated_by="emp_admin")

    mock_session.add.assert_called_once()
    assert result == permissions


@pytest.mark.unit
def test_set_default_permissions_updates_existing_row(mock_session) -> None:
    """set_default_permissions updates value/updated_by on the existing row."""
    from src.adthub.db.models.config_tables import SystemSetting
    row = SystemSetting()
    row.key = "default_permissions"
    row.value = json.dumps([])
    row.updated_by = "emp_old"
    mock_session.query.return_value.filter_by.return_value.first.return_value = row

    permissions = [{"module": "assets", "action": "manage"}]
    repo = RoleRepository(mock_session)
    result = repo.set_default_permissions(permissions, updated_by="emp_new")

    assert json.loads(row.value) == permissions
    assert row.updated_by == "emp_new"
    assert result == permissions
