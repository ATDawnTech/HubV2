"""Integration tests for DashboardRepository — runs against a real PostgreSQL database."""

import pytest
from src.adthub.db.repositories.dashboard_repository import DashboardRepository, _encode_cursor
from tests.factories.employee_factory import EmployeeFactory
from tests.factories.task_factory import (
    CompletedTaskFactory,
    NullDeadlineTaskFactory,
    OverdueTaskFactory,
    TaskFactory,
)


# ---------------------------------------------------------------------------
# get_module_task_counts
# ---------------------------------------------------------------------------

@pytest.mark.integration
def test_get_module_task_counts_returns_counts_per_module(db_session) -> None:
    """DashboardRepository.get_module_task_counts returns correct counts per module."""
    employee = EmployeeFactory()
    db_session.add(employee)
    db_session.flush()

    task1 = TaskFactory(assigned_to_id=employee.id, module="intake")
    task2 = TaskFactory(assigned_to_id=employee.id, module="intake")
    task3 = TaskFactory(assigned_to_id=employee.id, module="assets")
    db_session.add_all([task1, task2, task3])
    db_session.flush()

    repo = DashboardRepository(db_session)
    result = repo.get_module_task_counts(employee.id)

    assert result == {"intake": 2, "assets": 1}


@pytest.mark.integration
def test_get_module_task_counts_excludes_completed_tasks(db_session) -> None:
    """DashboardRepository.get_module_task_counts does not count completed tasks."""
    employee = EmployeeFactory()
    db_session.add(employee)
    db_session.flush()

    open_task = TaskFactory(assigned_to_id=employee.id, module="intake")
    completed_task = CompletedTaskFactory(assigned_to_id=employee.id, module="intake")
    db_session.add_all([open_task, completed_task])
    db_session.flush()

    repo = DashboardRepository(db_session)
    result = repo.get_module_task_counts(employee.id)

    assert result == {"intake": 1}


@pytest.mark.integration
def test_get_module_task_counts_excludes_other_users_tasks(db_session) -> None:
    """DashboardRepository.get_module_task_counts returns only the querying user's tasks."""
    emp1 = EmployeeFactory()
    emp2 = EmployeeFactory()
    db_session.add_all([emp1, emp2])
    db_session.flush()

    task_for_emp1 = TaskFactory(assigned_to_id=emp1.id, module="intake")
    task_for_emp2 = TaskFactory(assigned_to_id=emp2.id, module="intake")
    db_session.add_all([task_for_emp1, task_for_emp2])
    db_session.flush()

    repo = DashboardRepository(db_session)
    result = repo.get_module_task_counts(emp1.id)

    assert result == {"intake": 1}


@pytest.mark.integration
def test_get_module_task_counts_returns_empty_when_no_tasks(db_session) -> None:
    """DashboardRepository.get_module_task_counts returns empty dict when user has no tasks."""
    employee = EmployeeFactory()
    db_session.add(employee)
    db_session.flush()

    repo = DashboardRepository(db_session)
    result = repo.get_module_task_counts(employee.id)

    assert result == {}


# ---------------------------------------------------------------------------
# find_tasks_for_user
# ---------------------------------------------------------------------------

@pytest.mark.integration
def test_find_tasks_for_user_returns_open_tasks(db_session) -> None:
    """DashboardRepository.find_tasks_for_user returns the user's open tasks."""
    employee = EmployeeFactory()
    db_session.add(employee)
    db_session.flush()

    task = TaskFactory(assigned_to_id=employee.id)
    db_session.add(task)
    db_session.flush()

    repo = DashboardRepository(db_session)
    result = repo.find_tasks_for_user(employee.id, limit=20, cursor=None)

    assert any(t.id == task.id for t in result)


@pytest.mark.integration
def test_find_tasks_for_user_excludes_completed_tasks(db_session) -> None:
    """DashboardRepository.find_tasks_for_user does not return completed tasks."""
    employee = EmployeeFactory()
    db_session.add(employee)
    db_session.flush()

    completed = CompletedTaskFactory(assigned_to_id=employee.id)
    db_session.add(completed)
    db_session.flush()

    repo = DashboardRepository(db_session)
    result = repo.find_tasks_for_user(employee.id, limit=20, cursor=None)

    assert all(t.id != completed.id for t in result)


@pytest.mark.integration
def test_find_tasks_for_user_excludes_other_users_tasks(db_session) -> None:
    """DashboardRepository.find_tasks_for_user does not return tasks of other users."""
    emp1 = EmployeeFactory()
    emp2 = EmployeeFactory()
    db_session.add_all([emp1, emp2])
    db_session.flush()

    task_emp2 = TaskFactory(assigned_to_id=emp2.id)
    db_session.add(task_emp2)
    db_session.flush()

    repo = DashboardRepository(db_session)
    result = repo.find_tasks_for_user(emp1.id, limit=20, cursor=None)

    assert all(t.id != task_emp2.id for t in result)


@pytest.mark.integration
def test_find_tasks_for_user_returns_empty_list_when_no_tasks(db_session) -> None:
    """DashboardRepository.find_tasks_for_user returns empty list when user has no tasks."""
    employee = EmployeeFactory()
    db_session.add(employee)
    db_session.flush()

    repo = DashboardRepository(db_session)
    result = repo.find_tasks_for_user(employee.id, limit=20, cursor=None)

    assert result == []


@pytest.mark.integration
def test_find_tasks_for_user_paginates_with_cursor(db_session) -> None:
    """DashboardRepository.find_tasks_for_user returns next page when cursor is provided."""
    employee = EmployeeFactory()
    db_session.add(employee)
    db_session.flush()

    tasks = [OverdueTaskFactory(assigned_to_id=employee.id) for _ in range(5)]
    db_session.add_all(tasks)
    db_session.flush()

    repo = DashboardRepository(db_session)
    first_page = repo.find_tasks_for_user(employee.id, limit=2, cursor=None)
    # limit+1 rows are fetched; trim to page size for cursor construction
    page = first_page[:2]
    assert len(page) == 2

    cursor = _encode_cursor(page[-1].deadline, page[-1].id)
    second_page = repo.find_tasks_for_user(employee.id, limit=2, cursor=cursor)

    first_page_ids = {t.id for t in page}
    assert all(t.id not in first_page_ids for t in second_page[:2])


@pytest.mark.integration
def test_find_tasks_for_user_places_null_deadline_tasks_last(db_session) -> None:
    """DashboardRepository.find_tasks_for_user returns tasks with deadlines before nulls."""
    employee = EmployeeFactory()
    db_session.add(employee)
    db_session.flush()

    null_task = NullDeadlineTaskFactory(assigned_to_id=employee.id)
    dated_task = TaskFactory(assigned_to_id=employee.id)
    db_session.add_all([null_task, dated_task])
    db_session.flush()

    repo = DashboardRepository(db_session)
    result = repo.find_tasks_for_user(employee.id, limit=20, cursor=None)

    result_ids = [t.id for t in result]
    assert result_ids.index(dated_task.id) < result_ids.index(null_task.id)


# ---------------------------------------------------------------------------
# count_open_tasks_for_user
# ---------------------------------------------------------------------------

@pytest.mark.integration
def test_count_open_tasks_for_user_returns_correct_count(db_session) -> None:
    """DashboardRepository.count_open_tasks_for_user returns total open task count."""
    employee = EmployeeFactory()
    db_session.add(employee)
    db_session.flush()

    tasks = [TaskFactory(assigned_to_id=employee.id) for _ in range(3)]
    completed = CompletedTaskFactory(assigned_to_id=employee.id)
    db_session.add_all(tasks + [completed])
    db_session.flush()

    repo = DashboardRepository(db_session)
    result = repo.count_open_tasks_for_user(employee.id)

    assert result == 3


@pytest.mark.integration
def test_count_open_tasks_for_user_returns_zero_when_no_tasks(db_session) -> None:
    """DashboardRepository.count_open_tasks_for_user returns 0 when user has no tasks."""
    employee = EmployeeFactory()
    db_session.add(employee)
    db_session.flush()

    repo = DashboardRepository(db_session)
    result = repo.count_open_tasks_for_user(employee.id)

    assert result == 0


# ---------------------------------------------------------------------------
# find_task_by_id
# ---------------------------------------------------------------------------

@pytest.mark.integration
def test_find_task_by_id_returns_task_when_found(db_session) -> None:
    """DashboardRepository.find_task_by_id returns the correct task."""
    employee = EmployeeFactory()
    db_session.add(employee)
    db_session.flush()

    task = TaskFactory(assigned_to_id=employee.id)
    db_session.add(task)
    db_session.flush()

    repo = DashboardRepository(db_session)
    result = repo.find_task_by_id(task.id)

    assert result is not None
    assert result.id == task.id


@pytest.mark.integration
def test_find_task_by_id_returns_none_when_not_found(db_session) -> None:
    """DashboardRepository.find_task_by_id returns None for unknown ID."""
    repo = DashboardRepository(db_session)
    result = repo.find_task_by_id("task_doesnotexist")
    assert result is None


# ---------------------------------------------------------------------------
# complete_task
# ---------------------------------------------------------------------------

@pytest.mark.integration
def test_complete_task_sets_status_to_completed(db_session) -> None:
    """DashboardRepository.complete_task sets status=completed on the record."""
    employee = EmployeeFactory()
    db_session.add(employee)
    db_session.flush()

    task = TaskFactory(assigned_to_id=employee.id, status="open")
    db_session.add(task)
    db_session.flush()

    repo = DashboardRepository(db_session)
    repo.complete_task(task)

    # Re-query to confirm persisted state.
    from src.adthub.db.models.tasks import DashboardTask
    refreshed = db_session.query(DashboardTask).filter(DashboardTask.id == task.id).first()
    assert refreshed.status == "completed"
    assert refreshed.completed_at is not None


@pytest.mark.integration
def test_complete_task_record_not_returned_by_find_tasks_for_user(db_session) -> None:
    """DashboardRepository.complete_task causes the task to be excluded from active queries."""
    employee = EmployeeFactory()
    db_session.add(employee)
    db_session.flush()

    task = TaskFactory(assigned_to_id=employee.id)
    db_session.add(task)
    db_session.flush()

    repo = DashboardRepository(db_session)
    repo.complete_task(task)

    result = repo.find_tasks_for_user(employee.id, limit=20, cursor=None)
    assert all(t.id != task.id for t in result)
