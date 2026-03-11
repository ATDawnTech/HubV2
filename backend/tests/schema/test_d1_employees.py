import pytest
import sqlalchemy.exc
from tests.factories.employee_factory import EmployeeFactory


@pytest.mark.schema
def test_d1_1_work_email_unique_violation(db_session) -> None:
    """D.1.1: employees.work_email UNIQUE — duplicate email is rejected."""
    emp1 = EmployeeFactory(work_email="duplicate@example.com")
    emp2 = EmployeeFactory(work_email="duplicate@example.com")
    db_session.add(emp1)
    db_session.flush()

    db_session.add(emp2)
    with pytest.raises(sqlalchemy.exc.IntegrityError):
        db_session.flush()


@pytest.mark.schema
def test_d1_2_work_email_not_null_violation(db_session) -> None:
    """D.1.2: employees.work_email NOT NULL — null email is rejected."""
    emp = EmployeeFactory()
    emp.work_email = None
    db_session.add(emp)
    with pytest.raises(sqlalchemy.exc.IntegrityError):
        db_session.flush()


@pytest.mark.schema
def test_d1_4_status_check_violation(db_session) -> None:
    """D.1.4: employees.status CHECK — invalid status value is rejected.

    The CHECK constraint (status IN ('active', 'archiving', 'archived')) is added
    in alembic migration 0002 and also defined in the model via __table_args__,
    so it is enforced when the schema is created via Base.metadata.create_all.
    """
    emp = EmployeeFactory(status="invalid_value")
    db_session.add(emp)
    with pytest.raises(sqlalchemy.exc.IntegrityError):
        db_session.flush()


@pytest.mark.schema
def test_d1_5_personal_email_unique_violation(db_session) -> None:
    """D.1.5: employees.personal_email UNIQUE — duplicate personal email is rejected."""
    emp1 = EmployeeFactory(personal_email="personal_dup@example.com")
    emp2 = EmployeeFactory(personal_email="personal_dup@example.com")
    db_session.add(emp1)
    db_session.flush()

    db_session.add(emp2)
    with pytest.raises(sqlalchemy.exc.IntegrityError):
        db_session.flush()
