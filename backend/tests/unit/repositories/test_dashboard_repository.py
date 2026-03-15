"""Unit tests for DashboardRepository — all dependencies mocked."""

import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone

from src.adthub.db.repositories.dashboard_repository import DashboardRepository
from tests.factories.task_factory import TaskFactory, CompletedTaskFactory


# ---------------------------------------------------------------------------
# get_module_task_counts
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_get_module_task_counts_returns_dict_of_counts(mock_session) -> None:
    """DashboardRepository.get_module_task_counts returns module→count mapping."""
    mock_session.query.return_value.filter.return_value.group_by.return_value.all.return_value = [
        ("intake", 3),
        ("assets", 1),
    ]

    repo = DashboardRepository(mock_session)
    result = repo.get_module_task_counts("emp_user1")

    assert result == {"intake": 3, "assets": 1}


@pytest.mark.unit
def test_get_module_task_counts_returns_empty_dict_when_no_tasks(mock_session) -> None:
    """DashboardRepository.get_module_task_counts returns empty dict when no open tasks."""
    mock_session.query.return_value.filter.return_value.group_by.return_value.all.return_value = []

    repo = DashboardRepository(mock_session)
    result = repo.get_module_task_counts("emp_user1")

    assert result == {}


# ---------------------------------------------------------------------------
# find_tasks_for_user
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_find_tasks_for_user_returns_list_of_tasks(mock_session) -> None:
    """DashboardRepository.find_tasks_for_user returns tasks for the given user."""
    tasks = [TaskFactory(assigned_to_id="emp_user1"), TaskFactory(assigned_to_id="emp_user1")]
    (
        mock_session.query.return_value
        .filter.return_value
        .order_by.return_value
        .limit.return_value
        .all.return_value
    ) = tasks

    repo = DashboardRepository(mock_session)
    result = repo.find_tasks_for_user("emp_user1", limit=20, cursor=None)

    assert result == tasks


@pytest.mark.unit
def test_find_tasks_for_user_returns_empty_list_when_no_tasks(mock_session) -> None:
    """DashboardRepository.find_tasks_for_user returns empty list when no tasks assigned."""
    (
        mock_session.query.return_value
        .filter.return_value
        .order_by.return_value
        .limit.return_value
        .all.return_value
    ) = []

    repo = DashboardRepository(mock_session)
    result = repo.find_tasks_for_user("emp_user1", limit=20, cursor=None)

    assert result == []


# ---------------------------------------------------------------------------
# count_open_tasks_for_user
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_count_open_tasks_for_user_returns_integer_count(mock_session) -> None:
    """DashboardRepository.count_open_tasks_for_user returns total open task count."""
    mock_session.query.return_value.filter.return_value.scalar.return_value = 5

    repo = DashboardRepository(mock_session)
    result = repo.count_open_tasks_for_user("emp_user1")

    assert result == 5


@pytest.mark.unit
def test_count_open_tasks_for_user_returns_zero_when_no_tasks(mock_session) -> None:
    """DashboardRepository.count_open_tasks_for_user returns 0 when user has no tasks."""
    mock_session.query.return_value.filter.return_value.scalar.return_value = 0

    repo = DashboardRepository(mock_session)
    result = repo.count_open_tasks_for_user("emp_user1")

    assert result == 0


# ---------------------------------------------------------------------------
# find_task_by_id
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_find_task_by_id_returns_task_when_found(mock_session) -> None:
    """DashboardRepository.find_task_by_id returns the task when it exists."""
    task = TaskFactory(id="task_abc123")
    mock_session.query.return_value.filter.return_value.first.return_value = task

    repo = DashboardRepository(mock_session)
    result = repo.find_task_by_id("task_abc123")

    assert result is task


@pytest.mark.unit
def test_find_task_by_id_returns_none_when_not_found(mock_session) -> None:
    """DashboardRepository.find_task_by_id returns None for unknown ID."""
    mock_session.query.return_value.filter.return_value.first.return_value = None

    repo = DashboardRepository(mock_session)
    result = repo.find_task_by_id("task_missing")

    assert result is None


# ---------------------------------------------------------------------------
# complete_task
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_complete_task_sets_status_and_completed_at(mock_session) -> None:
    """DashboardRepository.complete_task sets status=completed and completed_at."""
    task = TaskFactory(status="open", completed_at=None)

    repo = DashboardRepository(mock_session)
    result = repo.complete_task(task)

    assert result.status == "completed"
    assert result.completed_at is not None
    mock_session.flush.assert_called_once()


@pytest.mark.unit
def test_complete_task_returns_the_updated_task(mock_session) -> None:
    """DashboardRepository.complete_task returns the mutated task object."""
    task = TaskFactory()

    repo = DashboardRepository(mock_session)
    result = repo.complete_task(task)

    assert result is task
