from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB

from ..base import Base


class IntakeRecord(Base):
    __tablename__ = "intake_records"

    id = Column(String(255), primary_key=True)
    reference_number = Column(String(50), nullable=False, unique=True)
    status = Column(String(50), nullable=False, default="draft")
    role_title = Column(String(255), nullable=False)
    department = Column(String(255), nullable=True)
    location = Column(String(255), nullable=True)
    work_model = Column(String(50), nullable=True)
    hire_type = Column(String(50), nullable=False)
    reason_for_hire = Column(Text, nullable=True)
    priority = Column(String(50), nullable=True)
    number_of_positions = Column(Integer, nullable=False, default=1)
    experience_range_min = Column(Integer, nullable=True)
    experience_range_max = Column(Integer, nullable=True)
    salary_range_min = Column(Numeric, nullable=True)
    salary_range_max = Column(Numeric, nullable=True)
    salary_currency = Column(String(10), nullable=False, default="USD")
    budget_approved = Column(Boolean, nullable=True)
    preferred_start_date = Column(Date, nullable=True)
    client_facing = Column(Boolean, nullable=True, default=False)
    client_expectations = Column(Text, nullable=True)
    key_perks_benefits = Column(Text, nullable=True)
    comments_notes = Column(Text, nullable=True)
    hiring_manager_id = Column(String(255), ForeignKey("employees.id"), nullable=True)
    ai_generated_jd = Column(Text, nullable=True)
    ai_jd_generated_at = Column(DateTime(timezone=True), nullable=True)
    submitted_by = Column(String(255), ForeignKey("employees.id"), nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True, default=None)

    __table_args__ = (
        Index("idx_intake_records_hiring_manager_id", "hiring_manager_id"),
        Index("idx_intake_records_submitted_by", "submitted_by"),
    )


class IntakeSkill(Base):
    __tablename__ = "intake_skills"

    id = Column(String(255), primary_key=True)
    intake_id = Column(
        String(255), ForeignKey("intake_records.id", ondelete="CASCADE"), nullable=False
    )
    skill_id = Column(String(255), ForeignKey("skills_catalog.id"), nullable=False)
    type = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        UniqueConstraint("intake_id", "skill_id", "type", name="uq_intake_skills_intake_skill_type"),
        Index("idx_intake_skills_intake_id", "intake_id"),
        Index("idx_intake_skills_skill_id", "skill_id"),
    )


class IntakeApproval(Base):
    __tablename__ = "intake_approvals"

    id = Column(String(255), primary_key=True)
    intake_id = Column(
        String(255), ForeignKey("intake_records.id", ondelete="CASCADE"), nullable=False
    )
    approver_id = Column(String(255), ForeignKey("employees.id"), nullable=False)
    status = Column(String(50), nullable=False, default="pending")
    comments = Column(Text, nullable=True)
    decided_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True, default=None)

    __table_args__ = (
        Index("idx_intake_approvals_intake_id", "intake_id"),
        Index("idx_intake_approvals_approver_id", "approver_id"),
    )


class IntakeAudit(Base):
    __tablename__ = "intake_audit"

    id = Column(String(255), primary_key=True)
    intake_id = Column(
        String(255), ForeignKey("intake_records.id", ondelete="CASCADE"), nullable=False
    )
    actor_id = Column(String(255), ForeignKey("employees.id"), nullable=True)
    action = Column(String(100), nullable=False)
    snapshot = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_intake_audit_intake_id", "intake_id"),
        Index("idx_intake_audit_actor_id", "actor_id"),
    )
