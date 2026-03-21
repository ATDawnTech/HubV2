"""Dashboard task model — cross-module task registry for the Hub Dashboard."""

from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Index, CheckConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from ..base import Base


class DashboardTask(Base):
    """Central task registry aggregated by the Hub Dashboard.

    Each row represents one actionable item originating from a source module
    (e.g. Onboarding, Assets, Intake). Tasks are routed to users by assignment.
    Completing a task here is the authoritative state — source modules observe
    this table to sync their own status.
    """

    __tablename__ = "dashboard_tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    module = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    source_record_id = Column(UUID(as_uuid=True), nullable=False)
    assigned_to_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    deadline = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(20), nullable=False, default="open")
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    deleted_at = Column(DateTime(timezone=True), nullable=True, default=None)

    __table_args__ = (
        CheckConstraint(
            "status IN ('open', 'completed')",
            name="ck_dashboard_tasks_status",
        ),
        CheckConstraint(
            "module IN ('employees', 'admin', 'assets', 'intake', 'onboarding', "
            "'projects', 'audit', 'timesheets', 'productivity', 'ats')",
            name="ck_dashboard_tasks_module",
        ),
        Index("idx_dashboard_tasks_assigned_to_id", "assigned_to_id"),
        Index("idx_dashboard_tasks_status", "status"),
        Index("idx_dashboard_tasks_module", "module"),
        Index("idx_dashboard_tasks_deadline", "deadline"),
    )
