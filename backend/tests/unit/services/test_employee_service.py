"""Unit tests for EmployeeService (Epic 2).

All tests use mock repositories — no database is touched.
Tests are written before implementation (TDD / Red-Green-Refactor).
"""

from datetime import datetime, timezone

import pytest
from unittest.mock import MagicMock

from src.adthub.db.models.employees import OffboardingTask
from src.adthub.exceptions import ConflictError, ResourceNotFoundError
from src.adthub.schemas.employees import CreateEmployeeRequest, UpdateEmployeeRequest
from src.adthub.services.employee_service import EmployeeService
from tests.factories.employee_factory import EmployeeFactory

_LIVE_STATUSES = ["active", "new_onboard"]


def _make_service(
    mock_repo: MagicMock,
    mock_task_repo: MagicMock | None = None,
    mock_role_repo: MagicMock | None = None,
) -> EmployeeService:
    return EmployeeService(
        repository=mock_repo,
        task_repository=mock_task_repo or MagicMock(),
        role_repository=mock_role_repo,
    )


# ---------------------------------------------------------------------------
# list_employees
# ---------------------------------------------------------------------------


@pytest.mark.unit
def test_list_employees_returns_employees_and_total() -> None:
    """list_employees returns (employees, total) and defaults to live statuses."""
    employees = [EmployeeFactory(), EmployeeFactory()]
    mock_repo = MagicMock()
    mock_repo.find_with_filters.return_value = employees
    mock_repo.count_with_filters.return_value = 2

    service = _make_service(mock_repo)
    result, total = service.list_employees(limit=20)

    assert result == employees
    assert total == 2
    mock_repo.find_with_filters.assert_called_once_with(
        limit=20, cursor=None, q=None, statuses=_LIVE_STATUSES,
        departments=None, locations=None, hire_types=None, work_modes=None,
        job_title=None, hire_date_from=None, hire_date_to=None, role_ids=None,
    )


@pytest.mark.unit
def test_list_employees_passes_cursor_to_repository() -> None:
    """list_employees forwards cursor parameter to repository."""
    mock_repo = MagicMock()
    mock_repo.find_with_filters.return_value = []
    mock_repo.count_with_filters.return_value = 0

    service = _make_service(mock_repo)
    service.list_employees(limit=10, cursor="emp_abc123")

    mock_repo.find_with_filters.assert_called_once_with(
        limit=10, cursor="emp_abc123", q=None, statuses=_LIVE_STATUSES,
        departments=None, locations=None, hire_types=None, work_modes=None,
        job_title=None, hire_date_from=None, hire_date_to=None, role_ids=None,
    )


@pytest.mark.unit
def test_list_employees_forwards_search_and_filter_params() -> None:
    """list_employees passes q, statuses, departments, and locations to repository."""
    mock_repo = MagicMock()
    mock_repo.find_with_filters.return_value = []
    mock_repo.count_with_filters.return_value = 0

    service = _make_service(mock_repo)
    service.list_employees(q="Alice", statuses=["active"], departments=["Engineering"], locations=["NYC"])

    mock_repo.find_with_filters.assert_called_once_with(
        limit=20, cursor=None, q="Alice", statuses=["active"],
        departments=["Engineering"], locations=["NYC"], hire_types=None, work_modes=None,
        job_title=None, hire_date_from=None, hire_date_to=None, role_ids=None,
    )


# ---------------------------------------------------------------------------
# get_employee
# ---------------------------------------------------------------------------


@pytest.mark.unit
def test_get_employee_returns_employee_when_found() -> None:
    """get_employee returns the employee from the repository."""
    employee = EmployeeFactory()
    mock_repo = MagicMock()
    mock_repo.find_by_id.return_value = employee

    service = _make_service(mock_repo)
    result = service.get_employee(employee.id)

    assert result == employee
    mock_repo.find_by_id.assert_called_once_with(employee.id)


@pytest.mark.unit
def test_get_employee_raises_not_found_when_missing() -> None:
    """get_employee raises ResourceNotFoundError for unknown ID."""
    mock_repo = MagicMock()
    mock_repo.find_by_id.return_value = None

    service = _make_service(mock_repo)
    with pytest.raises(ResourceNotFoundError):
        service.get_employee("emp_doesnotexist")


# ---------------------------------------------------------------------------
# create_employee
# ---------------------------------------------------------------------------


@pytest.mark.unit
def test_create_employee_sets_active_status() -> None:
    """create_employee sets status to 'active' for new hires."""
    mock_repo = MagicMock()
    mock_repo.find_by_email.return_value = None
    mock_repo.count_all_including_archived.return_value = 0
    mock_repo.save.side_effect = lambda e: e

    service = _make_service(mock_repo)
    service.create_employee(
        CreateEmployeeRequest(
            first_name="Alice", last_name="Smith", work_email="alice@example.com",
            department="Engineering", location="NYC", hire_type="full_time", work_mode="hybrid",
        )
    )

    saved = mock_repo.save.call_args[0][0]
    assert saved.status == "active"


@pytest.mark.unit
def test_create_employee_generates_sequential_employee_code() -> None:
    """create_employee auto-generates ATD-{n:04d} code based on total count."""
    mock_repo = MagicMock()
    mock_repo.find_by_email.return_value = None
    mock_repo.count_all_including_archived.return_value = 4
    mock_repo.save.side_effect = lambda e: e

    service = _make_service(mock_repo)
    service.create_employee(
        CreateEmployeeRequest(
            first_name="Alice", last_name="Smith", work_email="alice@example.com",
            department="Engineering", location="NYC", hire_type="full_time", work_mode="hybrid",
        )
    )

    saved = mock_repo.save.call_args[0][0]
    assert saved.employee_code == "ATD-0005"


@pytest.mark.unit
def test_create_employee_saves_and_returns_employee() -> None:
    """create_employee persists and returns the new employee."""
    mock_repo = MagicMock()
    mock_repo.find_by_email.return_value = None
    mock_repo.count_all_including_archived.return_value = 0
    saved = EmployeeFactory(first_name="Alice", last_name="Smith", work_email="alice@example.com")
    mock_repo.save.return_value = saved

    service = _make_service(mock_repo)
    result = service.create_employee(
        CreateEmployeeRequest(
            first_name="Alice", last_name="Smith", work_email="alice@example.com",
            department="Engineering", location="NYC", hire_type="full_time", work_mode="hybrid",
        )
    )

    mock_repo.find_by_email.assert_called_once_with("alice@example.com")
    mock_repo.save.assert_called_once()
    assert result == saved


@pytest.mark.unit
def test_create_employee_raises_conflict_for_duplicate_email() -> None:
    """create_employee raises ConflictError when the work email is already registered."""
    existing = EmployeeFactory(work_email="taken@example.com")
    mock_repo = MagicMock()
    mock_repo.find_by_email.return_value = existing

    service = _make_service(mock_repo)
    with pytest.raises(ConflictError):
        service.create_employee(
            CreateEmployeeRequest(
                first_name="Bob", last_name="Jones", work_email="taken@example.com",
                department="HR", location="LA", hire_type="contractor", work_mode="remote",
            )
        )

    mock_repo.save.assert_not_called()


# ---------------------------------------------------------------------------
# update_employee
# ---------------------------------------------------------------------------


@pytest.mark.unit
def test_update_employee_applies_provided_fields() -> None:
    """update_employee sets only provided fields on the existing record."""
    employee = EmployeeFactory(job_title="Developer")
    mock_repo = MagicMock()
    mock_repo.find_by_id.return_value = employee
    mock_repo.save.return_value = employee

    service = _make_service(mock_repo)
    service.update_employee(employee.id, UpdateEmployeeRequest(job_title="Senior Developer"))

    assert employee.job_title == "Senior Developer"
    mock_repo.save.assert_called_once_with(employee)


@pytest.mark.unit
def test_update_employee_raises_not_found_when_missing() -> None:
    """update_employee raises ResourceNotFoundError for unknown ID."""
    mock_repo = MagicMock()
    mock_repo.find_by_id.return_value = None

    service = _make_service(mock_repo)
    with pytest.raises(ResourceNotFoundError):
        service.update_employee("emp_doesnotexist", UpdateEmployeeRequest())


# ---------------------------------------------------------------------------
# archive_employee
# ---------------------------------------------------------------------------


@pytest.mark.unit
def test_archive_employee_sets_archiving_status() -> None:
    """archive_employee transitions status to 'archiving' (not soft-delete)."""
    employee = EmployeeFactory(status="active")
    mock_repo = MagicMock()
    mock_repo.find_by_id.return_value = employee
    mock_task_repo = MagicMock()

    service = _make_service(mock_repo, mock_task_repo)
    service.archive_employee(employee.id)

    assert employee.status == "archiving"
    assert employee.archived_at is not None
    mock_repo.save.assert_called_once_with(employee)


@pytest.mark.unit
def test_archive_employee_creates_four_offboarding_tasks() -> None:
    """archive_employee creates all 4 mandatory offboarding task records."""
    employee = EmployeeFactory(status="active")
    mock_repo = MagicMock()
    mock_repo.find_by_id.return_value = employee
    mock_task_repo = MagicMock()

    service = _make_service(mock_repo, mock_task_repo)
    service.archive_employee(employee.id)

    assert mock_task_repo.save.call_count == 4


@pytest.mark.unit
def test_archive_employee_raises_not_found_when_missing() -> None:
    """archive_employee raises ResourceNotFoundError for unknown ID."""
    mock_repo = MagicMock()
    mock_repo.find_by_id.return_value = None

    service = _make_service(mock_repo)
    with pytest.raises(ResourceNotFoundError):
        service.archive_employee("emp_doesnotexist")


# ---------------------------------------------------------------------------
# list_offboarding
# ---------------------------------------------------------------------------


@pytest.mark.unit
def test_list_offboarding_returns_archiving_employees() -> None:
    """list_offboarding returns employees with status='archiving'."""
    employees = [EmployeeFactory(status="archiving"), EmployeeFactory(status="archiving")]
    mock_repo = MagicMock()
    mock_repo.find_with_filters.return_value = employees
    mock_repo.count_with_filters.return_value = 2

    service = _make_service(mock_repo)
    result, total = service.list_offboarding(limit=20)

    assert result == employees
    assert total == 2
    mock_repo.find_with_filters.assert_called_once_with(
        limit=20, cursor=None, q=None, statuses=["archiving"],
        departments=None, locations=None, hire_types=None, work_modes=None,
        job_title=None, hire_date_from=None, hire_date_to=None, role_ids=None,
    )


# ---------------------------------------------------------------------------
# get_offboarding_tasks
# ---------------------------------------------------------------------------


@pytest.mark.unit
def test_get_offboarding_tasks_returns_tasks_for_employee() -> None:
    """get_offboarding_tasks returns all offboarding tasks for an employee."""
    employee = EmployeeFactory(status="archiving")
    tasks = [
        OffboardingTask(
            id="t1",
            employee_id=employee.id,
            task_type="email_decommission",
            assigned_group="it",
            status="pending",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
    ]
    mock_repo = MagicMock()
    mock_repo.find_by_id.return_value = employee
    mock_task_repo = MagicMock()
    mock_task_repo.find_by_employee.return_value = tasks

    service = _make_service(mock_repo, mock_task_repo)
    result = service.get_offboarding_tasks(employee.id)

    assert result == tasks
    mock_task_repo.find_by_employee.assert_called_once_with(employee.id)


@pytest.mark.unit
def test_get_offboarding_tasks_raises_not_found_for_unknown_employee() -> None:
    """get_offboarding_tasks raises ResourceNotFoundError for unknown employee."""
    mock_repo = MagicMock()
    mock_repo.find_by_id.return_value = None

    service = _make_service(mock_repo)
    with pytest.raises(ResourceNotFoundError):
        service.get_offboarding_tasks("emp_ghost")


# ---------------------------------------------------------------------------
# complete_offboarding_task
# ---------------------------------------------------------------------------


@pytest.mark.unit
def test_complete_offboarding_task_marks_task_completed() -> None:
    """complete_offboarding_task sets status, completed_by, and completed_at."""
    employee = EmployeeFactory(status="archiving")
    task = OffboardingTask(
        id="task_001",
        employee_id=employee.id,
        task_type="email_decommission",
        assigned_group="it",
        status="pending",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    mock_repo = MagicMock()
    mock_repo.find_by_id.return_value = employee
    mock_task_repo = MagicMock()
    mock_task_repo.find_task_by_id.return_value = task
    mock_task_repo.count_pending_for_employee.return_value = 1  # others still pending

    service = _make_service(mock_repo, mock_task_repo)
    service.complete_offboarding_task("task_001", completed_by="emp_admin")

    assert task.status == "completed"
    assert task.completed_by == "emp_admin"
    assert task.completed_at is not None


@pytest.mark.unit
def test_complete_offboarding_task_archives_employee_when_all_done() -> None:
    """complete_offboarding_task transitions employee to 'archived' when all tasks complete."""
    employee = EmployeeFactory(status="archiving")
    task = OffboardingTask(
        id="task_001",
        employee_id=employee.id,
        task_type="email_decommission",
        assigned_group="it",
        status="pending",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    mock_repo = MagicMock()
    mock_repo.find_by_id.return_value = employee
    mock_task_repo = MagicMock()
    mock_task_repo.find_task_by_id.return_value = task
    mock_task_repo.count_pending_for_employee.return_value = 0  # last task done

    service = _make_service(mock_repo, mock_task_repo)
    service.complete_offboarding_task("task_001", completed_by="emp_admin")

    assert employee.status == "archived"
    mock_repo.save.assert_called_once_with(employee)


@pytest.mark.unit
def test_complete_offboarding_task_raises_not_found_for_unknown_task() -> None:
    """complete_offboarding_task raises ResourceNotFoundError for unknown task ID."""
    mock_repo = MagicMock()
    mock_task_repo = MagicMock()
    mock_task_repo.find_task_by_id.return_value = None

    service = _make_service(mock_repo, mock_task_repo)
    with pytest.raises(ResourceNotFoundError):
        service.complete_offboarding_task("task_ghost", completed_by="emp_admin")


# ---------------------------------------------------------------------------
# archive_employee — 72-hour deadline
# ---------------------------------------------------------------------------


@pytest.mark.unit
def test_archive_employee_tasks_have_72h_due_at() -> None:
    """archive_employee sets due_at to ~72 hours after archival timestamp on each task."""
    from datetime import timedelta

    employee = EmployeeFactory(status="active")
    mock_repo = MagicMock()
    mock_repo.find_by_id.return_value = employee
    mock_task_repo = MagicMock()

    service = _make_service(mock_repo, mock_task_repo)
    service.archive_employee(employee.id)

    for call in mock_task_repo.save.call_args_list:
        task = call[0][0]
        assert task.due_at is not None
        delta = task.due_at - task.created_at
        assert timedelta(hours=71, minutes=59) <= delta <= timedelta(hours=72, seconds=5)


# ---------------------------------------------------------------------------
# check_email_exists
# ---------------------------------------------------------------------------


@pytest.mark.unit
def test_check_email_exists_returns_false_when_no_match() -> None:
    """check_email_exists returns False when the email is not registered."""
    mock_repo = MagicMock()
    mock_repo.find_by_email.return_value = None

    service = _make_service(mock_repo)
    assert service.check_email_exists("new@example.com") is False
    mock_repo.find_by_email.assert_called_once_with("new@example.com")


@pytest.mark.unit
def test_check_email_exists_returns_true_when_match() -> None:
    """check_email_exists returns True when the email is already registered."""
    existing = EmployeeFactory(work_email="taken@example.com")
    mock_repo = MagicMock()
    mock_repo.find_by_email.return_value = existing

    service = _make_service(mock_repo)
    assert service.check_email_exists("taken@example.com") is True


@pytest.mark.unit
def test_check_email_exists_strips_whitespace_before_lookup() -> None:
    """U.6.3: check_email_exists trims leading/trailing whitespace before querying."""
    mock_repo = MagicMock()
    mock_repo.find_by_email.return_value = None

    service = _make_service(mock_repo)
    service.check_email_exists("  user@example.com  ")

    mock_repo.find_by_email.assert_called_once_with("user@example.com")


# ---------------------------------------------------------------------------
# reassign_offboarding_task
# ---------------------------------------------------------------------------


@pytest.mark.unit
def test_reassign_offboarding_task_updates_assignee_id() -> None:
    """reassign_offboarding_task sets the assignee_id on the task."""
    employee = EmployeeFactory(status="archiving")
    task = OffboardingTask(
        id="task_001",
        employee_id=employee.id,
        task_type="email_decommission",
        assigned_group="it",
        status="pending",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    mock_repo = MagicMock()
    mock_task_repo = MagicMock()
    mock_task_repo.find_task_by_id.return_value = task

    service = _make_service(mock_repo, mock_task_repo)
    service.reassign_offboarding_task("task_001", assignee_id="emp_manager1")

    assert task.assignee_id == "emp_manager1"
    mock_task_repo.save.assert_called_once_with(task)


@pytest.mark.unit
def test_reassign_offboarding_task_clears_assignee_when_none() -> None:
    """reassign_offboarding_task can clear the assignee by passing None."""
    employee = EmployeeFactory(status="archiving")
    task = OffboardingTask(
        id="task_001",
        employee_id=employee.id,
        task_type="asset_retrieval",
        assigned_group="hr",
        assignee_id="emp_old",
        status="pending",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    mock_repo = MagicMock()
    mock_task_repo = MagicMock()
    mock_task_repo.find_task_by_id.return_value = task

    service = _make_service(mock_repo, mock_task_repo)
    service.reassign_offboarding_task("task_001", assignee_id=None)

    assert task.assignee_id is None


@pytest.mark.unit
def test_reassign_offboarding_task_raises_not_found_for_unknown_task() -> None:
    """reassign_offboarding_task raises ResourceNotFoundError for unknown task ID."""
    mock_repo = MagicMock()
    mock_task_repo = MagicMock()
    mock_task_repo.find_task_by_id.return_value = None

    service = _make_service(mock_repo, mock_task_repo)
    with pytest.raises(ResourceNotFoundError):
        service.reassign_offboarding_task("task_ghost", assignee_id="emp_x")


# ---------------------------------------------------------------------------
# archive_employee — role removal
# ---------------------------------------------------------------------------


@pytest.mark.unit
def test_archive_employee_removes_all_role_assignments() -> None:
    """archive_employee deletes all role assignments when role_repository is provided."""
    employee = EmployeeFactory(status="active")
    mock_repo = MagicMock()
    mock_repo.find_by_id.return_value = employee
    mock_task_repo = MagicMock()
    mock_role_repo = MagicMock()

    service = _make_service(mock_repo, mock_task_repo, mock_role_repo)
    service.archive_employee(employee.id)

    mock_role_repo.delete_all_assignments_for_employee.assert_called_once_with(employee.id)


@pytest.mark.unit
def test_archive_employee_skips_role_removal_when_no_role_repo() -> None:
    """archive_employee does not fail when role_repository is None."""
    employee = EmployeeFactory(status="active")
    mock_repo = MagicMock()
    mock_repo.find_by_id.return_value = employee
    mock_task_repo = MagicMock()

    service = _make_service(mock_repo, mock_task_repo, mock_role_repo=None)
    service.archive_employee(employee.id)

    assert employee.status == "archiving"


# ---------------------------------------------------------------------------
# create_employee — auto-assign roles
# ---------------------------------------------------------------------------


@pytest.mark.unit
def test_create_employee_auto_assigns_roles_for_department() -> None:
    """create_employee calls _auto_assign_roles after saving when role_repository is provided."""
    from src.adthub.db.models.config_tables import Role

    mock_repo = MagicMock()
    mock_repo.find_by_email.return_value = None
    mock_repo.count_all_including_archived.return_value = 0
    mock_repo.save.side_effect = lambda e: e

    role = Role()
    role.id = "role_fin"
    role.auto_assign_departments = '["Engineering"]'

    mock_role_repo = MagicMock()
    mock_role_repo.find_roles_by_department.return_value = [role]
    mock_role_repo.find_assignments_for_employee.return_value = []

    service = _make_service(mock_repo, mock_role_repo=mock_role_repo)
    service.create_employee(
        CreateEmployeeRequest(
            first_name="Alice", last_name="Smith", work_email="alice@example.com",
            department="Engineering", location="NYC", hire_type="full_time", work_mode="hybrid",
        )
    )

    mock_role_repo.find_roles_by_department.assert_called_once_with("Engineering")
    mock_role_repo.save_assignment.assert_called_once()


# ---------------------------------------------------------------------------
# update_employee — auto-assign on department change
# ---------------------------------------------------------------------------


@pytest.mark.unit
def test_update_employee_auto_assigns_roles_on_department_change() -> None:
    """update_employee triggers _auto_assign_roles when department changes."""
    from src.adthub.db.models.config_tables import Role

    employee = EmployeeFactory(department="HR")
    mock_repo = MagicMock()
    mock_repo.find_by_id.return_value = employee
    mock_repo.save.return_value = employee

    role = Role()
    role.id = "role_fin"

    mock_role_repo = MagicMock()
    mock_role_repo.find_roles_by_department.return_value = [role]
    mock_role_repo.find_assignments_for_employee.return_value = []

    service = _make_service(mock_repo, mock_role_repo=mock_role_repo)
    service.update_employee(employee.id, UpdateEmployeeRequest(department="Finance"))

    # Called once for old dept (to revoke) and once for new dept (to assign)
    from unittest.mock import call
    mock_role_repo.find_roles_by_department.assert_any_call("HR")
    mock_role_repo.find_roles_by_department.assert_any_call("Finance")


@pytest.mark.unit
def test_update_employee_does_not_auto_assign_when_department_unchanged() -> None:
    """update_employee skips _auto_assign_roles when department has not changed."""
    employee = EmployeeFactory(department="Finance")
    mock_repo = MagicMock()
    mock_repo.find_by_id.return_value = employee
    mock_repo.save.return_value = employee

    mock_role_repo = MagicMock()

    service = _make_service(mock_repo, mock_role_repo=mock_role_repo)
    service.update_employee(employee.id, UpdateEmployeeRequest(job_title="Senior"))

    mock_role_repo.find_roles_by_department.assert_not_called()
