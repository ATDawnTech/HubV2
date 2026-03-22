from sqlalchemy.orm import Session
from typing import Any
from ..db.models.audit import AuditEvent

class AuditService:
    def __init__(self, db: Session):
        self.db = db

    def log_event(
        self,
        module: str,
        entity: str,
        action: str,
        entity_id: str | None = None,
        old_value: dict[str, Any] | None = None,
        new_value: dict[str, Any] | None = None,
        actor_id: str | None = None,
        severity: str = "info",
        commit: bool = False
    ) -> AuditEvent:
        """Create a new audit event log."""
        event = AuditEvent(
            module=module,
            entity=entity,
            entity_id=str(entity_id) if entity_id else None,
            action=action,
            old_value=old_value,
            new_value=new_value,
            actor_id=actor_id,
            severity=severity
        )
        self.db.add(event)
        if commit:
            self.db.commit()
            self.db.refresh(event)
        return event
