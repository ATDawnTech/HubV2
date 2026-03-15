"""Unit tests for DashboardService — repository mocked."""

import pytest
from unittest.mock import MagicMock

from src.adthub.services.dashboard_service import DashboardService
from src.adthub.exceptions import TaskNotFoundError, TaskAlreadyCompletedError
from tests.factories.task_factory import TaskFactory, CompletedTaskFactory


@pytest.fixture
def mock_repo() -> MagicMock:
    """Mock DashboardRepository for service unit tests."""
    from src.adthub.db.repositories.dashboard_repository import DashboardRepository
    return MagicMock(spec=DashboardRepository)


@pytest.fixture
def service(mock_repo: MagicMock) -> DashboardService:
    """DashboardService wired with a mock repository."""
    return DashboardService(repository=mock_repo)


# ---------------------------------------------------------------------------
# get_module_summaries
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_get_module_summaries_returns_all_modules(service: DashboardService, mock_repo: MagicMock) -> None:
    """DashboardService.get_module_summaries returns a summary for every module."""
    mock_repo.get_module_task_counts.return_value = {}

    result = service.get_module_summaries("emp_user1")

    assert len(result) == 10
    mock_repo.get_module_task_counts.assert_called_once_with("emp_user1")


@pytest.mark.unit
def test_get_module_summaries_populates_pending_counts(service: DashboardService, mock_repo: MagicMock) -> None:
    """DashboardService.get_module_summaries sets pending_count from repository counts."""
    mock_repo.get_module_task_counts.return_value = {"intake": 3, "assets": 1}

    result = service.get_module_summaries("emp_user1")

    intake = next(m for m in result if m.id == "intake")
    assets = next(m for m in result if m.id == "assets")
    employees = next(m for m in result if m.id == "employees")

    assert intake.pending_count == 3
    assert assets.pending_count == 1
    assert employees.pending_count == 0


@pytest.mark.unit
def test_get_module_summaries_returns_zero_counts_when_no_tasks(
    service: DashboardService, mock_repo: MagicMock
) -> None:
    """DashboardService.get_module_summaries returns 0 pending for all modules with no tasks."""
    mock_repo.get_module_task_counts.return_value = {}

    result = service.get_module_summaries("emp_user1")

    assert all(m.pending_count == 0 for m in result)


# ---------------------------------------------------------------------------
# get_my_tasks
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_get_my_tasks_returns_tasks_and_total(service: DashboardService, mock_repo: MagicMock) -> None:
    """DashboardService.get_my_tasks returns (tasks, total) tuple."""
    tasks = [TaskFactory(assigned_to_id="emp_user1")]
    mock_repo.find_tasks_for_user.return_value = tasks
    mock_repo.count_open_tasks_for_user.return_value = 1

    result_tasks, total = service.get_my_tasks("emp_user1", limit=20, cursor=None)

    assert result_tasks == tasks
    assert total == 1
    mock_repo.find_tasks_for_user.assert_called_once_with("emp_user1", 20, None)
    mock_repo.count_open_tasks_for_user.assert_called_once_with("emp_user1")


@pytest.mark.unit
def test_get_my_tasks_returns_empty_list_when_no_tasks(
    service: DashboardService, mock_repo: MagicMock
) -> None:
    """DashboardService.get_my_tasks returns empty list and zero total when no tasks."""
    mock_repo.find_tasks_for_user.return_value = []
    mock_repo.count_open_tasks_for_user.return_value = 0

    result_tasks, total = service.get_my_tasks("emp_user1", limit=20, cursor=None)

    assert result_tasks == []
    assert total == 0


# ---------------------------------------------------------------------------
# complete_task
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_complete_task_returns_completed_task(service: DashboardService, mock_repo: MagicMock) -> None:
    """DashboardService.complete_task returns the completed task."""
    task = TaskFactory(id="task_abc123", assigned_to_id="emp_user1", status="open")
    completed = CompletedTaskFactory(id="task_abc123", assigned_to_id="emp_user1")
    mock_repo.find_task_by_id.return_value = task
    mock_repo.complete_task.return_value = completed

    result = service.complete_task("task_abc123", "emp_user1")

    assert result is completed
    mock_repo.find_task_by_id.assert_called_once_with("task_abc123")
    mock_repo.complete_task.assert_called_once_with(task)


@pytest.mark.unit
def test_complete_task_raises_not_found_when_task_missing(
    service: DashboardService, mock_repo: MagicMock
) -> None:
    """DashboardService.complete_task raises TaskNotFoundError when task does not exist."""
    mock_repo.find_task_by_id.return_value = None

    with pytest.raises(TaskNotFoundError):
        service.complete_task("task_missing", "emp_user1")


@pytest.mark.unit
def test_complete_task_raises_not_found_when_assigned_to_different_user(
    service: DashboardService, mock_repo: MagicMock
) -> None:
    """DashboardService.complete_task raises TaskNotFoundError when task belongs to another user.

    Returns TaskNotFoundError (not Forbidden) to avoid leaking task existence to
    users who do not own the task.
    """
    task = TaskFactory(id="task_abc123", assigned_to_id="emp_other_user", status="open")
    mock_repo.find_task_by_id.return_value = task

    with pytest.raises(TaskNotFoundError):
        service.complete_task("task_abc123", "emp_user1")


@pytest.mark.unit
def test_complete_task_raises_already_completed_when_task_is_done(
    service: DashboardService, mock_repo: MagicMock
) -> None:
    """DashboardService.complete_task raises TaskAlreadyCompletedError for completed tasks."""
    task = CompletedTaskFactory(id="task_abc123", assigned_to_id="emp_user1")
    mock_repo.find_task_by_id.return_value = task

    with pytest.raises(TaskAlreadyCompletedError):
        service.complete_task("task_abc123", "emp_user1")
