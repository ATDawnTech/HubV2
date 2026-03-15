"""D.10 Schema tests for the dashboard_tasks table (Epic 1)."""

import pytest
import sqlalchemy.exc

from tests.factories.employee_factory import EmployeeFactory
from tests.factories.task_factory import TaskFactory


@pytest.mark.schema
def test_d10_1_status_check_rejects_invalid_value(db_session) -> None:
    """D.10.1: dashboard_tasks.status CHECK — invalid status value is rejected."""
    task = TaskFactory(status="in_progress")  # not in ('open', 'completed')
    db_session.add(task)
    with pytest.raises(sqlalchemy.exc.IntegrityError):
        db_session.flush()


@pytest.mark.schema
def test_d10_2_module_check_rejects_invalid_value(db_session) -> None:
    """D.10.2: dashboard_tasks.module CHECK — invalid module identifier is rejected."""
    task = TaskFactory(module="unknown_module")
    db_session.add(task)
    with pytest.raises(sqlalchemy.exc.IntegrityError):
        db_session.flush()


@pytest.mark.schema
def test_d10_3_module_not_null(db_session) -> None:
    """D.10.3: dashboard_tasks.module NOT NULL — null module is rejected."""
    task = TaskFactory()
    task.module = None
    db_session.add(task)
    with pytest.raises(sqlalchemy.exc.IntegrityError):
        db_session.flush()


@pytest.mark.schema
def test_d10_4_title_not_null(db_session) -> None:
    """D.10.4: dashboard_tasks.title NOT NULL — null title is rejected."""
    task = TaskFactory()
    task.title = None
    db_session.add(task)
    with pytest.raises(sqlalchemy.exc.IntegrityError):
        db_session.flush()


@pytest.mark.schema
def test_d10_5_source_record_id_not_null(db_session) -> None:
    """D.10.5: dashboard_tasks.source_record_id NOT NULL — null source_record_id is rejected."""
    task = TaskFactory()
    task.source_record_id = None
    db_session.add(task)
    with pytest.raises(sqlalchemy.exc.IntegrityError):
        db_session.flush()


@pytest.mark.schema
def test_d10_6_assigned_to_id_fk_rejects_nonexistent_employee(db_session) -> None:
    """D.10.6: dashboard_tasks.assigned_to_id FK — non-existent employee ID is rejected."""
    task = TaskFactory(assigned_to_id="emp_doesnotexist")
    db_session.add(task)
    with pytest.raises(sqlalchemy.exc.IntegrityError):
        db_session.flush()


@pytest.mark.schema
def test_d10_7_assigned_to_id_nullable(db_session) -> None:
    """D.10.7: dashboard_tasks.assigned_to_id nullable — NULL assigned_to_id is accepted.

    Tasks start unassigned (pool model) and are claimed by users later.
    """
    task = TaskFactory(assigned_to_id=None)
    db_session.add(task)
    db_session.flush()  # must not raise

    from src.adthub.db.models.tasks import DashboardTask
    result = db_session.query(DashboardTask).filter(DashboardTask.id == task.id).first()
    assert result is not None
    assert result.assigned_to_id is None


@pytest.mark.schema
def test_d10_8_assigned_to_id_fk_accepts_valid_employee(db_session) -> None:
    """D.10.8: dashboard_tasks.assigned_to_id FK — valid employee ID is accepted."""
    employee = EmployeeFactory()
    db_session.add(employee)
    db_session.flush()

    task = TaskFactory(assigned_to_id=employee.id)
    db_session.add(task)
    db_session.flush()  # must not raise
