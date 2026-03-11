import pytest
from datetime import datetime, timezone
from src.adthub.db.repositories.timesheet_repository import TimesheetRepository
from src.adthub.exceptions import ResourceNotFoundError
from src.adthub.db.models.timesheets import Timesheet
from tests.factories.timesheet_factory import TimesheetFactory, ApprovedTimesheetFactory
from tests.factories.employee_factory import EmployeeFactory
from tests.factories.project_factory import ProjectFactory


@pytest.fixture
def linked_ids(db_session):
    """Create an employee and project, return their IDs for FK-linked timesheets."""
    emp = EmployeeFactory()
    proj = ProjectFactory()
    db_session.add_all([emp, proj])
    db_session.flush()
    return {"employee_id": emp.id, "project_id": proj.id}


@pytest.mark.integration
def test_find_by_id_returns_timesheet_when_found(db_session, linked_ids) -> None:
    """TimesheetRepository.find_by_id returns the correct timesheet."""
    ts = TimesheetFactory(
        employee_id=linked_ids["employee_id"],
        project_id=linked_ids["project_id"],
    )
    db_session.add(ts)
    db_session.flush()

    repo = TimesheetRepository(db_session)
    result = repo.find_by_id(ts.id)

    assert result is not None
    assert result.id == ts.id


@pytest.mark.integration
def test_find_by_id_returns_none_when_not_found(db_session) -> None:
    """TimesheetRepository.find_by_id returns None for non-existent ID."""
    repo = TimesheetRepository(db_session)
    result = repo.find_by_id("ts_doesnotexist")
    assert result is None


@pytest.mark.integration
def test_find_by_id_returns_none_when_soft_deleted(db_session, linked_ids) -> None:
    """TimesheetRepository.find_by_id does not return soft-deleted timesheets."""
    ts = TimesheetFactory(
        employee_id=linked_ids["employee_id"],
        project_id=linked_ids["project_id"],
    )
    ts.deleted_at = datetime.now(timezone.utc)
    db_session.add(ts)
    db_session.flush()

    repo = TimesheetRepository(db_session)
    result = repo.find_by_id(ts.id)

    assert result is None


@pytest.mark.integration
def test_find_all_returns_timesheets(db_session, linked_ids) -> None:
    """TimesheetRepository.find_all returns all active timesheets."""
    ts1 = TimesheetFactory(
        employee_id=linked_ids["employee_id"],
        project_id=linked_ids["project_id"],
    )
    ts2 = TimesheetFactory(
        employee_id=linked_ids["employee_id"],
        project_id=linked_ids["project_id"],
    )
    db_session.add_all([ts1, ts2])
    db_session.flush()

    repo = TimesheetRepository(db_session)
    results = repo.find_all()
    ids = [r.id for r in results]

    assert ts1.id in ids
    assert ts2.id in ids


@pytest.mark.integration
def test_find_all_excludes_deleted_timesheets(db_session, linked_ids) -> None:
    """TimesheetRepository.find_all does not return soft-deleted timesheets."""
    active = TimesheetFactory(
        employee_id=linked_ids["employee_id"],
        project_id=linked_ids["project_id"],
    )
    deleted = TimesheetFactory(
        employee_id=linked_ids["employee_id"],
        project_id=linked_ids["project_id"],
    )
    deleted.deleted_at = datetime.now(timezone.utc)
    db_session.add_all([active, deleted])
    db_session.flush()

    repo = TimesheetRepository(db_session)
    results = repo.find_all()
    result_ids = [r.id for r in results]

    assert active.id in result_ids
    assert deleted.id not in result_ids


@pytest.mark.integration
def test_find_all_paginates_with_cursor(db_session, linked_ids) -> None:
    """TimesheetRepository.find_all returns the next page when cursor is provided."""
    timesheets = [
        TimesheetFactory(
            employee_id=linked_ids["employee_id"],
            project_id=linked_ids["project_id"],
        )
        for _ in range(5)
    ]
    timesheets.sort(key=lambda t: t.id)
    db_session.add_all(timesheets)
    db_session.flush()

    repo = TimesheetRepository(db_session)
    first_page = repo.find_all(limit=2)
    assert len(first_page) <= 3

    cursor = first_page[1].id
    second_page = repo.find_all(limit=2, cursor=cursor)
    assert all(t.id > cursor for t in second_page)


@pytest.mark.integration
def test_save_creates_timesheet_with_correct_fields(db_session, linked_ids) -> None:
    """TimesheetRepository.save persists a new timesheet with correct fields."""
    ts = TimesheetFactory(
        employee_id=linked_ids["employee_id"],
        project_id=linked_ids["project_id"],
        hours=8,
        status="submitted",
        is_billable=True,
    )

    repo = TimesheetRepository(db_session)
    saved = repo.save(ts)

    assert saved.id == ts.id
    assert saved.hours == 8
    assert saved.status == "submitted"
    assert saved.is_billable is True
    assert saved.deleted_at is None


@pytest.mark.integration
def test_save_updates_timesheet_status(db_session, linked_ids) -> None:
    """TimesheetRepository.save updates an existing timesheet's status."""
    ts = TimesheetFactory(
        employee_id=linked_ids["employee_id"],
        project_id=linked_ids["project_id"],
        status="submitted",
    )
    db_session.add(ts)
    db_session.flush()

    ts.status = "approved"
    repo = TimesheetRepository(db_session)
    repo.save(ts)

    result = repo.find_by_id(ts.id)
    assert result.status == "approved"


@pytest.mark.integration
def test_soft_delete_sets_deleted_at(db_session, linked_ids) -> None:
    """TimesheetRepository.soft_delete sets deleted_at on the record."""
    ts = TimesheetFactory(
        employee_id=linked_ids["employee_id"],
        project_id=linked_ids["project_id"],
    )
    db_session.add(ts)
    db_session.flush()

    repo = TimesheetRepository(db_session)
    repo.soft_delete(ts.id)

    raw = db_session.query(Timesheet).filter(Timesheet.id == ts.id).first()
    assert raw.deleted_at is not None


@pytest.mark.integration
def test_soft_delete_record_no_longer_returned(db_session, linked_ids) -> None:
    """TimesheetRepository.soft_delete causes find_by_id to return None."""
    ts = TimesheetFactory(
        employee_id=linked_ids["employee_id"],
        project_id=linked_ids["project_id"],
    )
    db_session.add(ts)
    db_session.flush()

    repo = TimesheetRepository(db_session)
    repo.soft_delete(ts.id)

    result = repo.find_by_id(ts.id)
    assert result is None


@pytest.mark.integration
def test_soft_delete_raises_error_when_not_found(db_session) -> None:
    """TimesheetRepository.soft_delete raises ResourceNotFoundError for missing ID."""
    repo = TimesheetRepository(db_session)
    with pytest.raises(ResourceNotFoundError):
        repo.soft_delete("ts_doesnotexist")


@pytest.mark.integration
def test_find_by_employee_returns_employee_timesheets(db_session) -> None:
    """TimesheetRepository.find_by_employee returns timesheets for the given employee."""
    employee = EmployeeFactory()
    project = ProjectFactory()
    db_session.add_all([employee, project])
    db_session.flush()

    ts1 = TimesheetFactory(employee_id=employee.id, project_id=project.id)
    ts2 = TimesheetFactory(employee_id=employee.id, project_id=project.id)
    db_session.add_all([ts1, ts2])
    db_session.flush()

    repo = TimesheetRepository(db_session)
    results = repo.find_by_employee(employee.id)
    result_ids = [r.id for r in results]

    assert ts1.id in result_ids
    assert ts2.id in result_ids


@pytest.mark.integration
def test_find_by_employee_excludes_deleted_timesheets(db_session) -> None:
    """TimesheetRepository.find_by_employee excludes soft-deleted timesheets."""
    employee = EmployeeFactory()
    project = ProjectFactory()
    db_session.add_all([employee, project])
    db_session.flush()

    active_ts = TimesheetFactory(employee_id=employee.id, project_id=project.id)
    deleted_ts = TimesheetFactory(employee_id=employee.id, project_id=project.id)
    deleted_ts.deleted_at = datetime.now(timezone.utc)
    db_session.add_all([active_ts, deleted_ts])
    db_session.flush()

    repo = TimesheetRepository(db_session)
    results = repo.find_by_employee(employee.id)
    result_ids = [r.id for r in results]

    assert active_ts.id in result_ids
    assert deleted_ts.id not in result_ids


@pytest.mark.integration
def test_find_by_employee_excludes_other_employees(db_session) -> None:
    """TimesheetRepository.find_by_employee excludes timesheets for other employees."""
    emp1 = EmployeeFactory()
    emp2 = EmployeeFactory()
    project = ProjectFactory()
    db_session.add_all([emp1, emp2, project])
    db_session.flush()

    ts_emp1 = TimesheetFactory(employee_id=emp1.id, project_id=project.id)
    ts_emp2 = TimesheetFactory(employee_id=emp2.id, project_id=project.id)
    db_session.add_all([ts_emp1, ts_emp2])
    db_session.flush()

    repo = TimesheetRepository(db_session)
    results = repo.find_by_employee(emp1.id)
    result_ids = [r.id for r in results]

    assert ts_emp1.id in result_ids
    assert ts_emp2.id not in result_ids


@pytest.mark.integration
def test_find_by_project_returns_project_timesheets(db_session) -> None:
    """TimesheetRepository.find_by_project returns timesheets for the given project."""
    employee = EmployeeFactory()
    project = ProjectFactory()
    other_project = ProjectFactory()
    db_session.add_all([employee, project, other_project])
    db_session.flush()

    ts1 = TimesheetFactory(employee_id=employee.id, project_id=project.id)
    ts2 = TimesheetFactory(employee_id=employee.id, project_id=project.id)
    other_ts = TimesheetFactory(employee_id=employee.id, project_id=other_project.id)
    db_session.add_all([ts1, ts2, other_ts])
    db_session.flush()

    repo = TimesheetRepository(db_session)
    results = repo.find_by_project(project.id)
    result_ids = [r.id for r in results]

    assert ts1.id in result_ids
    assert ts2.id in result_ids
    assert other_ts.id not in result_ids


@pytest.mark.integration
def test_find_by_status_returns_matching_timesheets(db_session, linked_ids) -> None:
    """TimesheetRepository.find_by_status returns timesheets with the given status."""
    submitted1 = TimesheetFactory(
        employee_id=linked_ids["employee_id"],
        project_id=linked_ids["project_id"],
        status="submitted",
    )
    submitted2 = TimesheetFactory(
        employee_id=linked_ids["employee_id"],
        project_id=linked_ids["project_id"],
        status="submitted",
    )
    approved = ApprovedTimesheetFactory(
        employee_id=linked_ids["employee_id"],
        project_id=linked_ids["project_id"],
    )
    db_session.add_all([submitted1, submitted2, approved])
    db_session.flush()

    repo = TimesheetRepository(db_session)
    results = repo.find_by_status("submitted")
    result_ids = [r.id for r in results]

    assert submitted1.id in result_ids
    assert submitted2.id in result_ids
    assert approved.id not in result_ids


@pytest.mark.integration
def test_find_by_status_excludes_other_statuses(db_session, linked_ids) -> None:
    """TimesheetRepository.find_by_status excludes timesheets with other statuses."""
    approved = ApprovedTimesheetFactory(
        employee_id=linked_ids["employee_id"],
        project_id=linked_ids["project_id"],
    )
    rejected = TimesheetFactory(
        employee_id=linked_ids["employee_id"],
        project_id=linked_ids["project_id"],
        status="rejected",
    )
    db_session.add_all([approved, rejected])
    db_session.flush()

    repo = TimesheetRepository(db_session)
    results = repo.find_by_status("approved")
    result_ids = [r.id for r in results]

    assert approved.id in result_ids
    assert rejected.id not in result_ids
