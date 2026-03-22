from datetime import UTC, datetime

from sqlalchemy import Column, DateTime, ForeignKey, Index, String, text
from sqlalchemy.dialects.postgresql import JSONB, UUID


from ..base import Base


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    actor_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    module = Column(String(100), nullable=False)
    entity = Column(String(100), nullable=False)
    entity_id = Column(String(255), nullable=True)
    action = Column(String(50), nullable=False)
    severity = Column(String(20), nullable=True, default="info")
    old_value = Column(JSONB, nullable=True)
    new_value = Column(JSONB, nullable=True)
    event_metadata = Column("metadata", JSONB, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
    )

    __table_args__ = (
        Index("idx_audit_events_actor_id", "actor_id"),
        Index("idx_audit_events_module_entity", "module", "entity"),
        Index("idx_audit_events_entity_id", "entity_id"),
    )
