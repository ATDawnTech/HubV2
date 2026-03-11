import uuid
import pytest
import sqlalchemy.exc
from datetime import datetime, timezone
from src.adthub.db.models.onboarding import (
    OnboardingTemplate,
    OnboardingTaskTemplate,
    OnboardingJourney,
    OnboardingTask,
)
from tests.factories.employee_factory import EmployeeFactory


def _make_template(db_session):
    """Create and flush a minimal OnboardingTemplate, returning it."""
    template = OnboardingTemplate(
        id=f"otpl_{uuid.uuid4().hex[:12]}",
        name=f"Template {uuid.uuid4().hex[:8]}",
        version=1,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(template)
    db_session.flush()
    return template


def _make_journey(db_session, employee_id, template_id):
    """Create and flush a minimal OnboardingJourney, returning it."""
    journey = OnboardingJourney(
        id=f"ojrn_{uuid.uuid4().hex[:12]}",
        employee_id=employee_id,
        template_id=template_id,
        template_version=1,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(journey)
    db_session.flush()
    return journey


@pytest.mark.skip(
    reason=(
        "Requires alembic migration 0002 to be applied "
        "(CHECK constraint ck_onboarding_task_dep_no_self_ref is not created by metadata.create_all)"
    )
)
@pytest.mark.schema
def test_d4_1_task_dependency_self_reference_rejected(db_session) -> None:
    """D.4.1: onboarding_task_dependencies — self-reference is rejected by CHECK constraint."""
    pass


@pytest.mark.schema
def test_d4_2_task_template_fk_violation(db_session) -> None:
    """D.4.2: onboarding_task_templates.template_id FK — non-existent template_id is rejected."""
    task_template = OnboardingTaskTemplate(
        id=f"ott_{uuid.uuid4().hex[:12]}",
        template_id="otpl_doesnotexist00",  # non-existent FK
        block="pre_joining",
        name="Test Task Template",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(task_template)
    with pytest.raises(sqlalchemy.exc.IntegrityError):
        db_session.flush()


@pytest.mark.schema
def test_d4_3_onboarding_task_journey_fk_violation(db_session) -> None:
    """D.4.3: onboarding_tasks.journey_id FK — non-existent journey_id is rejected."""
    task = OnboardingTask(
        id=f"otsk_{uuid.uuid4().hex[:12]}",
        journey_id="ojrn_doesnotexist00",  # non-existent FK
        block="pre_joining",
        name="Test Task",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(task)
    with pytest.raises(sqlalchemy.exc.IntegrityError):
        db_session.flush()
