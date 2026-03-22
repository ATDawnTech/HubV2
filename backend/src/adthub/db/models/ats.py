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
    text,
)
from sqlalchemy import Text as SAText
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID


from ..base import Base


class AtsCandidate(Base):
    __tablename__ = "ats_candidates"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, unique=True)
    phone = Column(String(50), nullable=True)
    location = Column(String(255), nullable=True)
    source = Column(String(255), nullable=True)
    current_company = Column(String(255), nullable=True)
    current_title = Column(String(255), nullable=True)
    resume_url = Column(Text, nullable=True)
    linkedin_profile = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    resume_score = Column(Numeric(5, 2), nullable=True)
    resume_analysis = Column(JSONB, nullable=True)
    ai_parsed_skills = Column(JSONB, nullable=True)
    last_scored_at = Column(DateTime(timezone=True), nullable=True)
    ai_summary = Column(Text, nullable=True)
    ai_summary_generated_at = Column(DateTime(timezone=True), nullable=True)
    current_step = Column(String(100), nullable=True, default="sourced")
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True, default=None)


class Requisition(Base):
    __tablename__ = "requisitions"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    intake_id = Column(UUID(as_uuid=True), ForeignKey("intake_records.id"), nullable=True)
    title = Column(String(255), nullable=False)
    dept = Column(String(255), nullable=True)
    location = Column(String(255), nullable=True)
    employment_type = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)
    min_experience = Column(Integer, nullable=True, default=0)
    max_experience = Column(Integer, nullable=True)
    priority = Column(String(50), nullable=True)
    budget_min = Column(Numeric, nullable=True)
    budget_max = Column(Numeric, nullable=True)
    posting_start_date = Column(Date, nullable=True)
    posting_end_date = Column(Date, nullable=True)
    status = Column(String(50), nullable=True, default="draft")
    hiring_manager_id = Column(
        UUID(as_uuid=True), ForeignKey("employees.id", ondelete="SET NULL"), nullable=True
    )
    created_by = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    linkedin_job_id = Column(String(255), nullable=True)
    linkedin_posted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True, default=None)

    __table_args__ = (
        Index("idx_requisitions_intake_id", "intake_id"),
        Index("idx_requisitions_hiring_manager_id", "hiring_manager_id"),
        Index("idx_requisitions_created_by", "created_by"),
    )


class RequisitionSkill(Base):
    __tablename__ = "requisition_skills"

    requisition_id = Column(
        UUID(as_uuid=True),
        ForeignKey("requisitions.id", ondelete="CASCADE"),
        nullable=False,
        primary_key=True,
    )
    skill_id = Column(
        UUID(as_uuid=True), ForeignKey("skills_catalog.id"), nullable=False, primary_key=True
    )
    type = Column(String(50), nullable=False)

    __table_args__ = (
        Index("idx_requisition_skills_requisition_id", "requisition_id"),
        Index("idx_requisition_skills_skill_id", "skill_id"),
    )


class Application(Base):
    __tablename__ = "applications"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    candidate_id = Column(
        UUID(as_uuid=True), ForeignKey("ats_candidates.id", ondelete="CASCADE"), nullable=True
    )
    requisition_id = Column(
        UUID(as_uuid=True), ForeignKey("requisitions.id", ondelete="CASCADE"), nullable=True
    )
    stage = Column(String(50), nullable=True, default="sourced")
    status = Column(String(50), nullable=True, default="active")
    owner_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True, default=None)

    __table_args__ = (
        UniqueConstraint("candidate_id", "requisition_id", name="uq_applications_candidate_requisition"),
        Index("idx_applications_candidate_id", "candidate_id"),
        Index("idx_applications_requisition_id", "requisition_id"),
        Index("idx_applications_owner_id", "owner_id"),
    )


class Interview(Base):
    __tablename__ = "interviews"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    application_id = Column(
        UUID(as_uuid=True), ForeignKey("applications.id", ondelete="CASCADE"), nullable=True
    )
    requisition_id = Column(UUID(as_uuid=True), ForeignKey("requisitions.id"), nullable=True)
    interviewer_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    candidate_id = Column(
        UUID(as_uuid=True), ForeignKey("ats_candidates.id", ondelete="CASCADE"), nullable=True
    )
    type = Column(String(50), nullable=True)
    scheduled_start = Column(DateTime(timezone=True), nullable=True)
    scheduled_end = Column(DateTime(timezone=True), nullable=True)
    meeting_link = Column(Text, nullable=True)
    status = Column(String(50), nullable=True, default="scheduled")
    notes = Column(Text, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True, default=None)

    __table_args__ = (
        Index("idx_interviews_application_id", "application_id"),
        Index("idx_interviews_requisition_id", "requisition_id"),
        Index("idx_interviews_interviewer_id", "interviewer_id"),
        Index("idx_interviews_candidate_id", "candidate_id"),
        Index("idx_interviews_created_by", "created_by"),
    )


class InterviewAssignment(Base):
    __tablename__ = "interview_assignments"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    interview_id = Column(
        UUID(as_uuid=True), ForeignKey("interviews.id", ondelete="CASCADE"), nullable=True
    )
    interviewer_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    candidate_id = Column(
        UUID(as_uuid=True), ForeignKey("ats_candidates.id", ondelete="CASCADE"), nullable=True
    )
    role = Column(String(50), nullable=True, default="primary")
    created_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint(
            "interview_id", "interviewer_id", name="uq_interview_assignments_interview_interviewer"
        ),
        Index("idx_interview_assignments_interview_id", "interview_id"),
        Index("idx_interview_assignments_interviewer_id", "interviewer_id"),
        Index("idx_interview_assignments_candidate_id", "candidate_id"),
    )


class InterviewFeedback(Base):
    __tablename__ = "interview_feedback"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    interview_id = Column(
        UUID(as_uuid=True), ForeignKey("interviews.id", ondelete="CASCADE"), nullable=True
    )
    interviewer_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    ratings = Column(JSONB, nullable=True)
    summary = Column(Text, nullable=True)
    recommendation = Column(String(50), nullable=True)
    is_final = Column(Boolean, nullable=True, default=False)
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True, default=None)

    __table_args__ = (
        Index("idx_interview_feedback_interview_id", "interview_id"),
        Index("idx_interview_feedback_interviewer_id", "interviewer_id"),
    )


class CandidateActivity(Base):
    __tablename__ = "candidate_activities"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    candidate_id = Column(
        UUID(as_uuid=True), ForeignKey("ats_candidates.id", ondelete="CASCADE"), nullable=False
    )
    actor_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    activity_type = Column(String(100), nullable=False)
    activity_description = Column(Text, nullable=False)
    activity_metadata = Column("metadata", JSONB, nullable=True)
    seen_by = Column(ARRAY(SAText()), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("idx_candidate_activities_candidate_id", "candidate_id"),
        Index("idx_candidate_activities_actor_id", "actor_id"),
    )
