import pytest
import sqlalchemy as sa
import sqlalchemy.exc
from tests.factories.timesheet_factory import TimesheetFactory
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


@pytest.mark.schema
def test_d3_1_hours_check_above_24(db_session, linked_ids) -> None:
    """D.3.1: timesheets.hours CHECK — hours > 24 is rejected."""
    ts = TimesheetFactory(
        employee_id=linked_ids["employee_id"],
        project_id=linked_ids["project_id"],
        hours=25,
    )
    db_session.add(ts)
    with pytest.raises(sqlalchemy.exc.IntegrityError):
        db_session.flush()


@pytest.mark.schema
def test_d3_2_hours_check_zero(db_session, linked_ids) -> None:
    """D.3.2: timesheets.hours CHECK — hours = 0 is rejected."""
    ts = TimesheetFactory(
        employee_id=linked_ids["employee_id"],
        project_id=linked_ids["project_id"],
        hours=0,
    )
    db_session.add(ts)
    with pytest.raises(sqlalchemy.exc.IntegrityError):
        db_session.flush()


@pytest.mark.schema
def test_d3_3_hours_check_negative(db_session, linked_ids) -> None:
    """D.3.3: timesheets.hours CHECK — negative hours is rejected."""
    ts = TimesheetFactory(
        employee_id=linked_ids["employee_id"],
        project_id=linked_ids["project_id"],
        hours=-1,
    )
    db_session.add(ts)
    with pytest.raises(sqlalchemy.exc.IntegrityError):
        db_session.flush()


@pytest.mark.schema
def test_d3_4_employee_id_not_null(db_session) -> None:
    """D.3.4: timesheets.employee_id NOT NULL — null employee_id is rejected."""
    proj = ProjectFactory()
    db_session.add(proj)
    db_session.flush()

    with pytest.raises(sqlalchemy.exc.IntegrityError):
        db_session.execute(
            sa.text(
                "INSERT INTO timesheets (id, project_id, employee_id, work_date, hours, status, is_billable) "
                "VALUES (:id, :project_id, NULL, CURRENT_DATE, 8, 'submitted', TRUE)"
            ),
            {"id": "ts_nullemp00001", "project_id": proj.id},
        )


@pytest.mark.schema
def test_d3_5_project_id_not_null(db_session) -> None:
    """D.3.5: timesheets.project_id NOT NULL — null project_id is rejected."""
    emp = EmployeeFactory()
    db_session.add(emp)
    db_session.flush()

    with pytest.raises(sqlalchemy.exc.IntegrityError):
        db_session.execute(
            sa.text(
                "INSERT INTO timesheets (id, employee_id, project_id, work_date, hours, status, is_billable) "
                "VALUES (:id, :employee_id, NULL, CURRENT_DATE, 8, 'submitted', TRUE)"
            ),
            {"id": "ts_nullproj0001", "employee_id": emp.id},
        )
