from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy import Text as SAText
from sqlalchemy.dialects.postgresql import ARRAY, JSONB

from ..base import Base


class OnboardingTemplate(Base):
    __tablename__ = "onboarding_templates"

    id = Column(String(255), primary_key=True)
    name = Column(String(255), nullable=False)
    version = Column(Integer, nullable=False, default=1)
    is_active = Column(Boolean, nullable=True, default=True)
    settings = Column(JSONB, nullable=True)
    location = Column(String(255), nullable=True)
    applicable_roles = Column(ARRAY(SAText()), nullable=True)
    notification_config = Column(JSONB, nullable=True)
    created_by = Column(String(255), ForeignKey("employees.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True, default=None)

    __table_args__ = (
        Index("idx_onboarding_templates_created_by", "created_by"),
    )


class OnboardingTaskTemplate(Base):
    __tablename__ = "onboarding_task_templates"

    id = Column(String(255), primary_key=True)
    template_id = Column(
        String(255), ForeignKey("onboarding_templates.id", ondelete="CASCADE"), nullable=False
    )
    block = Column(String(50), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    owner_group_id = Column(String(255), ForeignKey("owner_groups.id"), nullable=True)
    sla_hours = Column(Integer, nullable=True, default=72)
    depends_on = Column(String(255), ForeignKey("onboarding_task_templates.id"), nullable=True)
    dynamic_rules = Column(JSONB, nullable=True)
    external_completion = Column(Boolean, nullable=True, default=False)
    required_attachments = Column(JSONB, nullable=True)
    order_index = Column(Integer, nullable=True, default=0)
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True, default=None)

    __table_args__ = (
        Index("idx_onboarding_task_templates_template_id", "template_id"),
        Index("idx_onboarding_task_templates_owner_group_id", "owner_group_id"),
        Index("idx_onboarding_task_templates_depends_on", "depends_on"),
    )


class OnboardingTaskTemplateDependency(Base):
    __tablename__ = "onboarding_task_template_dependencies"

    id = Column(String(255), primary_key=True)
    task_template_id = Column(
        String(255),
        ForeignKey("onboarding_task_templates.id", ondelete="CASCADE"),
        nullable=False,
    )
    depends_on_task_template_id = Column(
        String(255),
        ForeignKey("onboarding_task_templates.id", ondelete="CASCADE"),
        nullable=False,
    )
    created_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint(
            "task_template_id",
            "depends_on_task_template_id",
            name="uq_onboarding_task_template_dep",
        ),
        Index("idx_onboarding_task_template_dep_task_template_id", "task_template_id"),
        Index(
            "idx_onboarding_task_template_dep_depends_on",
            "depends_on_task_template_id",
        ),
    )


class OnboardingJourney(Base):
    __tablename__ = "onboarding_journeys"

    id = Column(String(255), primary_key=True)
    employee_id = Column(String(255), ForeignKey("employees.id"), nullable=False)
    template_id = Column(String(255), ForeignKey("onboarding_templates.id"), nullable=False)
    template_version = Column(Integer, nullable=False)
    status = Column(String(50), nullable=True, default="in_progress")
    doj = Column(Date, nullable=True)
    geo = Column(String(100), nullable=True)
    location = Column(String(255), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    paused_reason = Column(Text, nullable=True)
    created_by = Column(String(255), ForeignKey("employees.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True, default=None)

    __table_args__ = (
        Index("idx_onboarding_journeys_employee_id", "employee_id"),
        Index("idx_onboarding_journeys_template_id", "template_id"),
        Index("idx_onboarding_journeys_created_by", "created_by"),
    )


class OnboardingTask(Base):
    __tablename__ = "onboarding_tasks"

    id = Column(String(255), primary_key=True)
    journey_id = Column(
        String(255), ForeignKey("onboarding_journeys.id", ondelete="CASCADE"), nullable=False
    )
    template_task_id = Column(
        String(255), ForeignKey("onboarding_task_templates.id"), nullable=True
    )
    block = Column(String(50), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    owner_group_id = Column(String(255), ForeignKey("owner_groups.id"), nullable=True)
    assignee_id = Column(
        String(255), ForeignKey("employees.id", ondelete="SET NULL"), nullable=True
    )
    status = Column(String(50), nullable=True, default="pending")
    due_at = Column(DateTime(timezone=True), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    notification_sent_at = Column(DateTime(timezone=True), nullable=True)
    sla_hours = Column(Integer, nullable=True, default=72)
    depends_on = Column(String(255), ForeignKey("onboarding_tasks.id"), nullable=True)
    external_completion = Column(Boolean, nullable=True, default=False)
    required_attachments = Column(JSONB, nullable=True)
    meta = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True, default=None)

    __table_args__ = (
        Index("idx_onboarding_tasks_journey_id", "journey_id"),
        Index("idx_onboarding_tasks_template_task_id", "template_task_id"),
        Index("idx_onboarding_tasks_owner_group_id", "owner_group_id"),
        Index("idx_onboarding_tasks_assignee_id", "assignee_id"),
        Index("idx_onboarding_tasks_depends_on", "depends_on"),
    )


class OnboardingTaskDependency(Base):
    __tablename__ = "onboarding_task_dependencies"

    task_id = Column(
        String(255),
        ForeignKey("onboarding_tasks.id", ondelete="CASCADE"),
        nullable=False,
        primary_key=True,
    )
    depends_on_task_id = Column(
        String(255),
        ForeignKey("onboarding_tasks.id", ondelete="CASCADE"),
        nullable=False,
        primary_key=True,
    )

    __table_args__ = (
        Index("idx_onboarding_task_dep_task_id", "task_id"),
        Index("idx_onboarding_task_dep_depends_on_task_id", "depends_on_task_id"),
    )


class TaskSlaEvent(Base):
    __tablename__ = "task_sla_events"

    id = Column(String(255), primary_key=True)
    task_id = Column(
        String(255), ForeignKey("onboarding_tasks.id", ondelete="CASCADE"), nullable=False
    )
    event = Column(String(100), nullable=False)
    meta = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_task_sla_events_task_id", "task_id"),
    )


class TaskAttachment(Base):
    __tablename__ = "task_attachments"

    id = Column(String(255), primary_key=True)
    task_id = Column(
        String(255), ForeignKey("onboarding_tasks.id", ondelete="CASCADE"), nullable=False
    )
    file_url = Column(Text, nullable=False)
    file_name = Column(String(255), nullable=True)
    kind = Column(String(100), nullable=True)
    uploaded_by = Column(String(255), ForeignKey("employees.id"), nullable=True)
    uploaded_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_task_attachments_task_id", "task_id"),
        Index("idx_task_attachments_uploaded_by", "uploaded_by"),
    )


class Approval(Base):
    __tablename__ = "approvals"

    id = Column(String(255), primary_key=True)
    resource_type = Column(String(100), nullable=False)
    resource_id = Column(String(255), nullable=False)
    task_id = Column(
        String(255), ForeignKey("onboarding_tasks.id", ondelete="CASCADE"), nullable=True
    )
    approver_group_id = Column(String(255), ForeignKey("owner_groups.id"), nullable=True)
    approver_user_id = Column(String(255), ForeignKey("employees.id"), nullable=True)
    status = Column(String(50), nullable=True, default="requested")
    comments = Column(Text, nullable=True)
    decided_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True, default=None)

    __table_args__ = (
        Index("idx_approvals_task_id", "task_id"),
        Index("idx_approvals_approver_group_id", "approver_group_id"),
        Index("idx_approvals_approver_user_id", "approver_user_id"),
    )
