"""Unit tests for EntraSyncService — Entra directory sync.

All tests use mock repositories and a mock GraphService — no database,
no HTTP calls, no Entra dependency.
"""

from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest

from src.adthub.services.entra_sync_service import EntraSyncService, _parse_entra_date


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_service():
    mock_session = MagicMock()
    service = EntraSyncService.__new__(EntraSyncService)
    service._session = mock_session
    service._employee_repo = MagicMock()
    service._role_repo = MagicMock()
    service._dropdown_repo = MagicMock()
    service._graph = MagicMock()
    service._known_dropdowns = set()
    return service, mock_session


def _make_member(
    oid: str = "oid-abc",
    email: str = "user@example.com",
    given_name: str = "Alice",
    surname: str = "Smith",
    job_title: str = "Engineer",
    department: str = "Engineering",
    office_location: str = "Main Office",
    created_date_time: str | None = None,
) -> dict:
    return {
        "id": oid,
        "mail": email,
        "givenName": given_name,
        "surname": surname,
        "jobTitle": job_title,
        "department": department,
        "officeLocation": office_location,
        "displayName": f"{given_name} {surname}",
        "createdDateTime": created_date_time,
    }


def _make_mapping(group_id: str = "grp-1", role_id: str = "role_sys_admin") -> MagicMock:
    m = MagicMock()
    m.entra_group_id = group_id
    m.role_id = role_id
    return m


# ---------------------------------------------------------------------------
# sync_all_groups — top-level orchestration
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_sync_all_groups_returns_zeros_when_no_mappings_configured() -> None:
    """sync_all_groups returns all-zero stats when no group mappings exist."""
    service, _ = _make_service()
    service._role_repo.find_all_entra_group_mappings.return_value = []

    result = service.sync_all_groups()

    assert result == {"created": 0, "updated": 0, "skipped": 0, "errors": 0}
    service._graph.get_group_members.assert_not_called()


@pytest.mark.unit
def test_sync_all_groups_counts_created_member() -> None:
    """sync_all_groups increments 'created' when a new employee is provisioned."""
    service, _ = _make_service()
    service._role_repo.find_all_entra_group_mappings.return_value = [_make_mapping()]
    service._graph.get_group_members.return_value = [_make_member()]
    service._employee_repo.find_by_entra_oid.return_value = None
    service._employee_repo.find_by_email.return_value = None
    service._employee_repo.count_all_including_archived.return_value = 0

    result = service.sync_all_groups()

    assert result["created"] == 1
    assert result["errors"] == 0


@pytest.mark.unit
def test_sync_all_groups_deduplicates_members_across_groups() -> None:
    """sync_all_groups only processes each OID once even if it appears in multiple groups."""
    service, _ = _make_service()
    mapping1 = _make_mapping("grp-1")
    mapping2 = _make_mapping("grp-2")
    service._role_repo.find_all_entra_group_mappings.return_value = [mapping1, mapping2]
    member = _make_member(oid="oid-shared")
    service._graph.get_group_members.return_value = [member]
    service._employee_repo.find_by_entra_oid.return_value = None
    service._employee_repo.find_by_email.return_value = None
    service._employee_repo.count_all_including_archived.return_value = 0

    result = service.sync_all_groups()

    # Member appears in 2 groups but should only be provisioned once
    assert result["created"] == 1


@pytest.mark.unit
def test_sync_all_groups_increments_errors_on_graph_failure() -> None:
    """sync_all_groups increments 'errors' and continues when Graph API raises."""
    service, _ = _make_service()
    service._role_repo.find_all_entra_group_mappings.return_value = [_make_mapping()]
    service._graph.get_group_members.side_effect = Exception("Graph unavailable")

    result = service.sync_all_groups()

    assert result["errors"] == 1
    assert result["created"] == 0


@pytest.mark.unit
def test_sync_all_groups_skips_members_with_no_oid() -> None:
    """sync_all_groups skips members where 'id' is missing or falsy."""
    service, _ = _make_service()
    service._role_repo.find_all_entra_group_mappings.return_value = [_make_mapping()]
    service._graph.get_group_members.return_value = [{"id": None, "mail": "x@example.com"}]

    result = service.sync_all_groups()

    assert result["created"] == 0
    assert result["skipped"] == 0
    assert result["errors"] == 0


# ---------------------------------------------------------------------------
# _sync_member — individual member provisioning
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_sync_member_creates_new_employee_on_first_sync() -> None:
    """_sync_member creates an Employee record when neither OID nor email exists."""
    service, mock_session = _make_service()
    service._employee_repo.find_by_entra_oid.return_value = None
    service._employee_repo.find_by_email.return_value = None
    service._employee_repo.count_all_including_archived.return_value = 3

    result, employee = service._sync_member(_make_member(oid="new-oid", email="new@example.com"))

    assert result == "created"
    assert employee is not None
    mock_session.add.assert_called_once()
    added = mock_session.add.call_args[0][0]
    assert added.entra_oid == "new-oid"
    assert added.work_email == "new@example.com"
    assert added.employee_code == "ATD-0004"


@pytest.mark.unit
def test_sync_member_returns_skipped_when_no_email() -> None:
    """_sync_member returns 'skipped' and does not create a record when email is absent."""
    service, mock_session = _make_service()
    member = {"id": "oid-abc", "mail": None, "userPrincipalName": None, "displayName": "NoEmail"}

    result, employee = service._sync_member(member)

    assert result == "skipped"
    assert employee is None
    mock_session.add.assert_not_called()


@pytest.mark.unit
def test_sync_member_updates_existing_employee_fields() -> None:
    """_sync_member updates name/job_title/department when they differ."""
    from src.adthub.db.models.employees import Employee

    service, mock_session = _make_service()
    existing = Employee()
    existing.id = "emp_abc"
    existing.entra_oid = "oid-abc"
    existing.first_name = "Old"
    existing.last_name = "Name"
    existing.work_email = "user@example.com"
    existing.job_title = "Junior Engineer"
    existing.department = "Engineering"
    existing.updated_at = datetime(2024, 1, 1, tzinfo=timezone.utc)

    service._employee_repo.find_by_entra_oid.return_value = existing

    result, employee = service._sync_member(_make_member(
        oid="oid-abc",
        given_name="New",
        surname="Name",
        job_title="Senior Engineer",
    ))

    assert result == "updated"
    assert employee is existing
    assert existing.first_name == "New"
    assert existing.job_title == "Senior Engineer"
    mock_session.flush.assert_called()


@pytest.mark.unit
def test_sync_member_returns_skipped_when_no_changes() -> None:
    """_sync_member returns 'skipped' and the employee when the record is already up to date."""
    from src.adthub.db.models.employees import Employee

    service, mock_session = _make_service()
    # Pre-populate the dropdown cache so no DB query is needed
    service._known_dropdowns = {
        ("employees", "department", "Engineering"),
        ("global", "location", "Main Office"),
    }

    existing = Employee()
    existing.id = "emp_abc"
    existing.entra_oid = "oid-abc"
    existing.first_name = "Alice"
    existing.last_name = "Smith"
    existing.work_email = "user@example.com"
    existing.job_title = "Engineer"
    existing.department = "Engineering"
    existing.location = "Main Office"

    service._employee_repo.find_by_entra_oid.return_value = existing

    result, employee = service._sync_member(_make_member(
        oid="oid-abc",
        given_name="Alice",
        surname="Smith",
        job_title="Engineer",
        department="Engineering",
        office_location="Main Office",
    ))

    assert result == "skipped"
    assert employee is existing


@pytest.mark.unit
def test_sync_member_falls_back_to_display_name_when_given_surname_absent() -> None:
    """_sync_member splits displayName into first/last when givenName and surname are missing."""
    service, mock_session = _make_service()
    service._employee_repo.find_by_entra_oid.return_value = None
    service._employee_repo.find_by_email.return_value = None
    service._employee_repo.count_all_including_archived.return_value = 0

    member = {
        "id": "oid-xyz",
        "mail": "display@example.com",
        "givenName": None,
        "surname": None,
        "displayName": "Alice Smith",
        "jobTitle": None,
        "department": None,
    }

    service._sync_member(member)

    added = mock_session.add.call_args[0][0]
    assert added.first_name == "Alice"
    assert added.last_name == "Smith"


@pytest.mark.unit
def test_sync_member_links_entra_oid_to_existing_employee_found_by_email() -> None:
    """_sync_member links entra_oid when employee exists by email but not OID."""
    from src.adthub.db.models.employees import Employee

    service, _ = _make_service()
    existing = Employee()
    existing.id = "emp_old"
    existing.entra_oid = None
    existing.first_name = "Alice"
    existing.last_name = "Smith"
    existing.work_email = "user@example.com"
    existing.job_title = "Engineer"
    existing.department = "Engineering"

    service._employee_repo.find_by_entra_oid.return_value = None
    service._employee_repo.find_by_email.return_value = existing

    _, employee = service._sync_member(_make_member(oid="new-oid"))

    assert existing.entra_oid == "new-oid"
    assert employee is existing


# ---------------------------------------------------------------------------
# _ensure_role_assigned
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_ensure_role_assigned_creates_assignment_when_none_exists() -> None:
    """_ensure_role_assigned saves a new RoleAssignment when the employee has none."""
    from src.adthub.db.models.employees import Employee

    service, _ = _make_service()
    emp = Employee()
    emp.id = "emp_abc"
    service._role_repo.find_assignment.return_value = None

    service._ensure_role_assigned(emp, "role_sys_admin")

    service._role_repo.save_assignment.assert_called_once()
    assignment = service._role_repo.save_assignment.call_args[0][0]
    assert assignment.employee_id == "emp_abc"
    assert assignment.role_id == "role_sys_admin"
    assert assignment.is_manager is False


@pytest.mark.unit
def test_ensure_role_assigned_skips_when_already_assigned() -> None:
    """_ensure_role_assigned does nothing when the assignment already exists."""
    from src.adthub.db.models.employees import Employee

    service, _ = _make_service()
    emp = Employee()
    emp.id = "emp_abc"
    service._role_repo.find_assignment.return_value = MagicMock()

    service._ensure_role_assigned(emp, "role_sys_admin")

    service._role_repo.save_assignment.assert_not_called()


# ---------------------------------------------------------------------------
# _parse_entra_date
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_parse_entra_date_extracts_date_from_utc_string() -> None:
    """_parse_entra_date returns the date portion of an Entra createdDateTime string."""
    from datetime import date
    result = _parse_entra_date("2023-06-15T10:30:00Z")
    assert result == date(2023, 6, 15)


@pytest.mark.unit
def test_parse_entra_date_returns_none_for_none_input() -> None:
    """_parse_entra_date returns None when no value is provided."""
    assert _parse_entra_date(None) is None


@pytest.mark.unit
def test_parse_entra_date_returns_none_for_empty_string() -> None:
    """_parse_entra_date returns None for an empty string."""
    assert _parse_entra_date("") is None


@pytest.mark.unit
def test_parse_entra_date_returns_none_for_unparseable_value() -> None:
    """_parse_entra_date returns None rather than raising for malformed input."""
    assert _parse_entra_date("not-a-date") is None


@pytest.mark.unit
def test_sync_member_sets_hire_date_from_entra_created_date_time() -> None:
    """_sync_member sets hire_date from createdDateTime when provisioning a new employee."""
    from datetime import date

    service, mock_session = _make_service()
    service._employee_repo.find_by_entra_oid.return_value = None
    service._employee_repo.find_by_email.return_value = None
    service._employee_repo.count_all_including_archived.return_value = 0

    member = _make_member(oid="new-oid", created_date_time="2022-03-01T08:00:00Z")
    service._sync_member(member)

    added = mock_session.add.call_args[0][0]
    assert added.hire_date == date(2022, 3, 1)


@pytest.mark.unit
def test_sync_member_sets_hire_date_to_none_when_created_date_time_absent() -> None:
    """_sync_member sets hire_date to None when createdDateTime is not provided."""
    service, mock_session = _make_service()
    service._employee_repo.find_by_entra_oid.return_value = None
    service._employee_repo.find_by_email.return_value = None
    service._employee_repo.count_all_including_archived.return_value = 0

    service._sync_member(_make_member(oid="new-oid"))

    added = mock_session.add.call_args[0][0]
    assert added.hire_date is None


@pytest.mark.unit
def test_sync_member_backfills_hire_date_for_existing_employee_with_no_hire_date() -> None:
    """_sync_member sets hire_date on an existing employee when it was previously null."""
    from datetime import date
    from src.adthub.db.models.employees import Employee

    service, _ = _make_service()
    existing = Employee()
    existing.id = "emp_abc"
    existing.entra_oid = "oid-abc"
    existing.first_name = "Alice"
    existing.last_name = "Smith"
    existing.work_email = "user@example.com"
    existing.job_title = "Engineer"
    existing.department = "Engineering"
    existing.hire_date = None

    service._employee_repo.find_by_entra_oid.return_value = existing

    result, employee = service._sync_member(
        _make_member(oid="oid-abc", created_date_time="2021-09-01T00:00:00Z")
    )

    assert result == "updated"
    assert employee.hire_date == date(2021, 9, 1)


@pytest.mark.unit
def test_sync_member_overwrites_existing_hire_date_with_entra_date() -> None:
    """_sync_member replaces hire_date with the Entra createdDateTime date even when already set."""
    from datetime import date
    from src.adthub.db.models.employees import Employee

    service, _ = _make_service()
    existing = Employee()
    existing.id = "emp_abc"
    existing.entra_oid = "oid-abc"
    existing.first_name = "Alice"
    existing.last_name = "Smith"
    existing.work_email = "user@example.com"
    existing.job_title = "Engineer"
    existing.department = "Engineering"
    existing.hire_date = date(2020, 1, 1)

    service._employee_repo.find_by_entra_oid.return_value = existing

    result, employee = service._sync_member(
        _make_member(oid="oid-abc", created_date_time="2021-09-01T00:00:00Z")
    )

    assert result == "updated"
    assert existing.hire_date == date(2021, 9, 1)


@pytest.mark.unit
def test_sync_all_groups_assigns_role_to_synced_member() -> None:
    """sync_all_groups calls _ensure_role_assigned for each successfully synced member."""
    service, _ = _make_service()
    mapping = _make_mapping(role_id="role_sys_admin")
    service._role_repo.find_all_entra_group_mappings.return_value = [mapping]
    service._graph.get_group_members.return_value = [_make_member()]
    service._employee_repo.find_by_entra_oid.return_value = None
    service._employee_repo.find_by_email.return_value = None
    service._employee_repo.count_all_including_archived.return_value = 0
    service._role_repo.find_assignment.return_value = None

    service.sync_all_groups()

    service._role_repo.save_assignment.assert_called_once()
    assignment = service._role_repo.save_assignment.call_args[0][0]
    assert assignment.role_id == "role_sys_admin"


# ---------------------------------------------------------------------------
# _ensure_dropdown_exists — auto-create missing dropdown values
# ---------------------------------------------------------------------------

def _mock_dropdown_query(mock_session, existing_dropdown=None):
    """Wire mock_session.query(...).filter(...).first() to return *existing_dropdown*."""
    chain = mock_session.query.return_value.filter.return_value
    chain.first.return_value = existing_dropdown


@pytest.mark.unit
def test_ensure_dropdown_exists_creates_entry_when_missing() -> None:
    """_ensure_dropdown_exists creates a config_dropdown entry for a new value."""
    service, mock_session = _make_service()
    _mock_dropdown_query(mock_session, None)

    result = service._ensure_dropdown_exists("employees", "department", "Marketing")

    assert result == "Marketing"
    service._dropdown_repo.save.assert_called_once()
    saved = service._dropdown_repo.save.call_args[0][0]
    assert saved.module == "employees"
    assert saved.category == "department"
    assert saved.value == "Marketing"
    assert saved.is_active is True


@pytest.mark.unit
def test_ensure_dropdown_exists_skips_when_already_exists() -> None:
    """_ensure_dropdown_exists does nothing when the value already exists."""
    service, mock_session = _make_service()
    existing = MagicMock()
    existing.value = "Engineering"
    _mock_dropdown_query(mock_session, existing)

    result = service._ensure_dropdown_exists("employees", "department", "Engineering")

    assert result == "Engineering"
    service._dropdown_repo.save.assert_not_called()


@pytest.mark.unit
def test_ensure_dropdown_exists_returns_canonical_case() -> None:
    """_ensure_dropdown_exists returns the existing value when casing differs."""
    service, mock_session = _make_service()
    existing = MagicMock()
    existing.value = "Engineering"
    _mock_dropdown_query(mock_session, existing)

    result = service._ensure_dropdown_exists("employees", "department", "engineering")

    assert result == "Engineering"
    service._dropdown_repo.save.assert_not_called()


@pytest.mark.unit
def test_ensure_dropdown_exists_skips_empty_string() -> None:
    """_ensure_dropdown_exists does nothing for empty values."""
    service, _ = _make_service()

    result = service._ensure_dropdown_exists("employees", "department", "")

    assert result == ""
    service._dropdown_repo.save.assert_not_called()


@pytest.mark.unit
def test_ensure_dropdown_exists_uses_cache_on_second_call() -> None:
    """_ensure_dropdown_exists only queries the DB once per value."""
    service, mock_session = _make_service()
    _mock_dropdown_query(mock_session, None)

    service._ensure_dropdown_exists("employees", "department", "Sales")
    service._ensure_dropdown_exists("employees", "department", "Sales")

    # Only one DB query and one save despite two calls
    mock_session.query.assert_called_once()
    service._dropdown_repo.save.assert_called_once()


@pytest.mark.unit
def test_ensure_dropdown_exists_works_for_location() -> None:
    """_ensure_dropdown_exists auto-creates location dropdown entries."""
    service, mock_session = _make_service()
    _mock_dropdown_query(mock_session, None)

    result = service._ensure_dropdown_exists("global", "location", "New York")

    assert result == "New York"
    saved = service._dropdown_repo.save.call_args[0][0]
    assert saved.module == "global"
    assert saved.category == "location"
    assert saved.value == "New York"


@pytest.mark.unit
def test_sync_member_sets_location_from_entra() -> None:
    """_sync_member sets location from officeLocation on a new employee."""
    service, mock_session = _make_service()
    service._employee_repo.find_by_entra_oid.return_value = None
    service._employee_repo.find_by_email.return_value = None
    service._employee_repo.count_all_including_archived.return_value = 0
    _mock_dropdown_query(mock_session, None)

    service._sync_member(_make_member(office_location="Sydney"))

    added = mock_session.add.call_args[0][0]
    assert added.location == "Sydney"


@pytest.mark.unit
def test_sync_member_updates_location_on_existing_employee() -> None:
    """_sync_member updates location when it differs from Entra."""
    from src.adthub.db.models.employees import Employee

    service, mock_session = _make_service()
    _mock_dropdown_query(mock_session, None)

    existing = Employee()
    existing.id = "emp_abc"
    existing.entra_oid = "oid-abc"
    existing.first_name = "Alice"
    existing.last_name = "Smith"
    existing.work_email = "user@example.com"
    existing.job_title = "Engineer"
    existing.department = "Engineering"
    existing.location = "Old Office"

    service._employee_repo.find_by_entra_oid.return_value = existing

    result, employee = service._sync_member(
        _make_member(oid="oid-abc", office_location="New Office")
    )

    assert result == "updated"
    assert existing.location == "New Office"


@pytest.mark.unit
def test_sync_member_auto_creates_department_dropdown() -> None:
    """_sync_member auto-creates a department dropdown for a new department."""
    service, mock_session = _make_service()
    service._employee_repo.find_by_entra_oid.return_value = None
    service._employee_repo.find_by_email.return_value = None
    service._employee_repo.count_all_including_archived.return_value = 0
    _mock_dropdown_query(mock_session, None)

    service._sync_member(_make_member(department="New Department"))

    # Both department and location dropdowns may be created
    saves = service._dropdown_repo.save.call_args_list
    values = [call[0][0].value for call in saves]
    assert "New Department" in values


@pytest.mark.unit
def test_sync_member_uses_canonical_department_from_dropdown() -> None:
    """_sync_member normalises the department to the existing dropdown value."""
    service, mock_session = _make_service()
    existing_dropdown = MagicMock()
    existing_dropdown.value = "Engineering"
    _mock_dropdown_query(mock_session, existing_dropdown)

    service._employee_repo.find_by_entra_oid.return_value = None
    service._employee_repo.find_by_email.return_value = None
    service._employee_repo.count_all_including_archived.return_value = 0

    service._sync_member(_make_member(department="engineering"))

    added = mock_session.add.call_args[0][0]
    assert added.department == "Engineering"
