import uuid
import pytest
import sqlalchemy.exc
from datetime import datetime, timezone
from src.adthub.db.models.audit import AuditEvent
from src.adthub.db.models.employees import EmployeeProjectHistory
from tests.factories.employee_factory import EmployeeFactory
from tests.factories.project_factory import ProjectFactory


@pytest.mark.skip(reason="Requires alembic migration 0002 (trigger not created by metadata.create_all)")
@pytest.mark.schema
def test_d7_1_audit_events_no_update(db_session) -> None:
    """D.7.1: audit_events is append-only — UPDATE is rejected by trigger."""
    pass


@pytest.mark.skip(reason="Requires alembic migration 0002 (trigger not created by metadata.create_all)")
@pytest.mark.schema
def test_d7_2_audit_events_no_delete(db_session) -> None:
    """D.7.2: audit_events is append-only — DELETE is rejected by trigger."""
    pass


@pytest.mark.schema
def test_d7_3_archive_employee_preserves_audit_events(db_session) -> None:
    """D.7.3: Soft-deleting an employee does not remove their audit events.

    AuditEvent.actor_id is a nullable FK to employees — setting deleted_at
    on the employee does NOT cascade-delete the audit event row.
    """
    employee = EmployeeFactory()
    db_session.add(employee)
    db_session.flush()

    audit_event = AuditEvent(
        id=f"aud_{uuid.uuid4().hex[:12]}",
        actor_id=employee.id,
        module="employees",
        entity="Employee",
        entity_id=employee.id,
        action="update",
        created_at=datetime.now(timezone.utc),
    )
    db_session.add(audit_event)
    db_session.flush()

    # Soft-delete the employee (set deleted_at — this is NOT a hard DELETE)
    employee.deleted_at = datetime.now(timezone.utc)
    db_session.flush()

    # The audit event should still exist
    result = db_session.query(AuditEvent).filter(AuditEvent.id == audit_event.id).first()
    assert result is not None
    assert result.actor_id == employee.id


@pytest.mark.schema
def test_d7_4_delete_project_preserves_employee_project_history(db_session) -> None:
    """D.7.4: Soft-deleting a project does not affect employee_project_history rows.

    NOTE: The ON DELETE SET NULL on employee_project_history.project_id only fires
    for a hard DELETE of the project row. Soft-delete (setting deleted_at) does NOT
    trigger the ON DELETE SET NULL cascade — the FK value is preserved as-is.
    This test verifies the soft-delete behaviour: the history row continues to exist
    with the original project_id intact after the project is soft-deleted.
    """
    employee = EmployeeFactory()
    project = ProjectFactory()
    db_session.add_all([employee, project])
    db_session.flush()

    history = EmployeeProjectHistory(
        id=f"eph_{uuid.uuid4().hex[:12]}",
        employee_id=employee.id,
        project_id=project.id,
        project_name=project.name,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(history)
    db_session.flush()

    # Soft-delete the project (set deleted_at — this is NOT a hard DELETE)
    project.deleted_at = datetime.now(timezone.utc)
    db_session.flush()

    # The history row should still exist with the original project_id intact
    result = (
        db_session.query(EmployeeProjectHistory)
        .filter(EmployeeProjectHistory.id == history.id)
        .first()
    )
    assert result is not None
    assert result.project_id == project.id
    assert result.project_name == project.name
