import uuid
import pytest
import sqlalchemy.exc
from datetime import datetime, timezone
from src.adthub.db.models.ats import AtsCandidate, Requisition, Application


def _make_candidate(db_session):
    """Create and flush a minimal AtsCandidate, returning it."""
    candidate = AtsCandidate(
        id=f"cand_{uuid.uuid4().hex[:12]}",
        full_name="Test Candidate",
        email=f"cand_{uuid.uuid4().hex[:8]}@test.com",
        current_step="sourced",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(candidate)
    db_session.flush()
    return candidate


def _make_requisition(db_session):
    """Create and flush a minimal Requisition, returning it."""
    requisition = Requisition(
        id=f"req_{uuid.uuid4().hex[:12]}",
        title="Test Requisition",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(requisition)
    db_session.flush()
    return requisition


@pytest.mark.schema
def test_d5_1_application_unique_candidate_requisition(db_session) -> None:
    """D.5.1: applications UNIQUE(candidate_id, requisition_id) — duplicate is rejected."""
    candidate = _make_candidate(db_session)
    requisition = _make_requisition(db_session)

    app1 = Application(
        id=f"app_{uuid.uuid4().hex[:12]}",
        candidate_id=candidate.id,
        requisition_id=requisition.id,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    app2 = Application(
        id=f"app_{uuid.uuid4().hex[:12]}",
        candidate_id=candidate.id,
        requisition_id=requisition.id,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(app1)
    db_session.flush()

    db_session.add(app2)
    with pytest.raises(sqlalchemy.exc.IntegrityError):
        db_session.flush()


@pytest.mark.schema
def test_d5_2_application_candidate_fk_violation(db_session) -> None:
    """D.5.2: applications.candidate_id FK — non-existent candidate_id is rejected."""
    requisition = _make_requisition(db_session)

    app = Application(
        id=f"app_{uuid.uuid4().hex[:12]}",
        candidate_id="cand_doesnotexist00",  # non-existent FK
        requisition_id=requisition.id,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(app)
    with pytest.raises(sqlalchemy.exc.IntegrityError):
        db_session.flush()


@pytest.mark.schema
def test_d5_3_application_requisition_fk_violation(db_session) -> None:
    """D.5.3: applications.requisition_id FK — non-existent requisition_id is rejected."""
    candidate = _make_candidate(db_session)

    app = Application(
        id=f"app_{uuid.uuid4().hex[:12]}",
        candidate_id=candidate.id,
        requisition_id="req_doesnotexist000",  # non-existent FK
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(app)
    with pytest.raises(sqlalchemy.exc.IntegrityError):
        db_session.flush()


@pytest.mark.schema
def test_d5_4_requisition_null_intake_accepted(db_session) -> None:
    """D.5.4: requisitions.intake_id is nullable — NULL intake_id is accepted."""
    requisition = Requisition(
        id=f"req_{uuid.uuid4().hex[:12]}",
        title="Requisition Without Intake",
        intake_id=None,  # explicitly NULL — should be accepted
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(requisition)
    db_session.flush()  # should not raise

    # Verify the record was saved with intake_id = None
    assert requisition.intake_id is None
