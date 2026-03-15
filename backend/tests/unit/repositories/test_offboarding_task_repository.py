"""Unit tests for OffboardingTaskRepository — all dependencies mocked."""

import pytest
from unittest.mock import MagicMock

from src.adthub.db.repositories.offboarding_task_repository import OffboardingTaskRepository
from src.adthub.db.models.employees import OffboardingTask


def _make_task(employee_id: str = "emp_001", status: str = "pending") -> OffboardingTask:
    t = OffboardingTask()
    t.id = "obt_test001"
    t.employee_id = employee_id
    t.task_type = "hr_paperwork"
    t.status = status
    t.deleted_at = None
    return t


# ---------------------------------------------------------------------------
# find_by_employee
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_find_by_employee_returns_task_list(mock_session) -> None:
    """find_by_employee returns the list of tasks from the query."""
    tasks = [_make_task(), _make_task(status="completed")]
    (
        mock_session.query.return_value
        .filter.return_value
        .order_by.return_value
        .all.return_value
    ) = tasks

    repo = OffboardingTaskRepository(mock_session)
    result = repo.find_by_employee("emp_001")

    assert result == tasks


@pytest.mark.unit
def test_find_by_employee_returns_empty_list_when_no_tasks(mock_session) -> None:
    """find_by_employee returns [] when the employee has no offboarding tasks."""
    (
        mock_session.query.return_value
        .filter.return_value
        .order_by.return_value
        .all.return_value
    ) = []

    repo = OffboardingTaskRepository(mock_session)
    result = repo.find_by_employee("emp_missing")

    assert result == []


# ---------------------------------------------------------------------------
# find_task_by_id
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_find_task_by_id_returns_task_when_found(mock_session) -> None:
    """find_task_by_id returns the matching task."""
    task = _make_task()
    mock_session.query.return_value.filter.return_value.first.return_value = task

    repo = OffboardingTaskRepository(mock_session)
    result = repo.find_task_by_id("obt_test001")

    assert result == task


@pytest.mark.unit
def test_find_task_by_id_returns_none_when_not_found(mock_session) -> None:
    """find_task_by_id returns None for an unknown task ID."""
    mock_session.query.return_value.filter.return_value.first.return_value = None

    repo = OffboardingTaskRepository(mock_session)
    result = repo.find_task_by_id("obt_missing")

    assert result is None


# ---------------------------------------------------------------------------
# count_pending_for_employee
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_count_pending_for_employee_returns_count(mock_session) -> None:
    """count_pending_for_employee returns the pending task count."""
    mock_session.query.return_value.filter.return_value.count.return_value = 3

    repo = OffboardingTaskRepository(mock_session)
    result = repo.count_pending_for_employee("emp_001")

    assert result == 3


@pytest.mark.unit
def test_count_pending_for_employee_returns_zero_when_all_complete(mock_session) -> None:
    """count_pending_for_employee returns 0 when no pending tasks remain."""
    mock_session.query.return_value.filter.return_value.count.return_value = 0

    repo = OffboardingTaskRepository(mock_session)
    result = repo.count_pending_for_employee("emp_done")

    assert result == 0


# ---------------------------------------------------------------------------
# save
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_save_calls_add_and_flush(mock_session) -> None:
    """save calls session.add and session.flush and returns the task."""
    task = _make_task()

    repo = OffboardingTaskRepository(mock_session)
    result = repo.save(task)

    mock_session.add.assert_called_once_with(task)
    mock_session.flush.assert_called_once()
    assert result == task
