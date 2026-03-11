import uuid
import pytest
import sqlalchemy.exc
from datetime import datetime, timezone
from src.adthub.db.models.employees import OffboardingTask
from src.adthub.db.models.projects import ProjectMember
from src.adthub.db.models.intake import IntakeSkill
from tests.factories.employee_factory import EmployeeFactory
from tests.factories.project_factory import ProjectFactory
from tests.factories.config_factory import SkillsCatalogFactory


@pytest.mark.schema
def test_d9_1_offboarding_task_employee_fk_violation(db_session) -> None:
    """D.9.1: offboarding_tasks.employee_id FK — non-existent employee_id is rejected."""
    task = OffboardingTask(
        id=f"obt_{uuid.uuid4().hex[:12]}",
        employee_id="emp_doesnotexist00",  # non-existent FK
        task_type="return_equipment",
        assigned_group="it",
        status="pending",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(task)
    with pytest.raises(sqlalchemy.exc.IntegrityError):
        db_session.flush()


@pytest.mark.schema
def test_d9_2_project_member_project_fk_violation(db_session) -> None:
    """D.9.2: project_members.project_id FK — non-existent project_id is rejected."""
    employee = EmployeeFactory()
    db_session.add(employee)
    db_session.flush()

    member = ProjectMember(
        project_id="proj_doesnotexist0",  # non-existent FK
        employee_id=employee.id,
        bill_rate_usd=100,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(member)
    with pytest.raises(sqlalchemy.exc.IntegrityError):
        db_session.flush()


@pytest.mark.schema
def test_d9_3_project_member_employee_fk_violation(db_session) -> None:
    """D.9.3: project_members.employee_id FK — non-existent employee_id is rejected."""
    project = ProjectFactory()
    db_session.add(project)
    db_session.flush()

    member = ProjectMember(
        project_id=project.id,
        employee_id="emp_doesnotexist00",  # non-existent FK
        bill_rate_usd=100,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(member)
    with pytest.raises(sqlalchemy.exc.IntegrityError):
        db_session.flush()


@pytest.mark.schema
def test_d9_4_intake_skill_skill_fk_violation(db_session) -> None:
    """D.9.4: intake_skills.skill_id FK — non-existent skill_id is rejected.

    Requires a valid intake_record to exist first (to satisfy the intake_id FK).
    We use a fake skill_id to trigger the violation.
    """
    from src.adthub.db.models.intake import IntakeRecord

    intake = IntakeRecord(
        id=f"int_{uuid.uuid4().hex[:12]}",
        reference_number=f"REF-{uuid.uuid4().hex[:8].upper()}",
        status="draft",
        role_title="Test Role",
        hire_type="full_time",
        number_of_positions=1,
        salary_currency="USD",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(intake)
    db_session.flush()

    intake_skill = IntakeSkill(
        id=f"isk_{uuid.uuid4().hex[:12]}",
        intake_id=intake.id,
        skill_id="skl_doesnotexist00",  # non-existent FK
        type="required",
        created_at=datetime.now(timezone.utc),
    )
    db_session.add(intake_skill)
    with pytest.raises(sqlalchemy.exc.IntegrityError):
        db_session.flush()
