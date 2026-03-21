from sqlalchemy import Column, Date, DateTime, ForeignKey, Index, Numeric, String, Text, text
from sqlalchemy.dialects.postgresql import UUID


from ..base import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), nullable=True, default="pipeline")
    category = Column(String(255), nullable=True)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    project_manager_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    sales_manager_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    internal_lead_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    client = Column(String(255), nullable=True)
    discount_pct = Column(Numeric, nullable=True, default=0)
    discount_reason = Column(Text, nullable=True)
    tag_color = Column(String(7), nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True, default=None)

    __table_args__ = (
        Index("idx_projects_project_manager_id", "project_manager_id"),
        Index("idx_projects_sales_manager_id", "sales_manager_id"),
        Index("idx_projects_internal_lead_id", "internal_lead_id"),
        Index("idx_projects_created_by", "created_by"),
        Index("idx_projects_status", "status"),
    )


class ProjectMember(Base):
    __tablename__ = "project_members"

    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        primary_key=True,
    )
    employee_id = Column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        primary_key=True,
    )
    bill_rate_usd = Column(Numeric, nullable=False)
    role = Column(String(255), nullable=True)
    member_discount_pct = Column(Numeric, nullable=True, default=0)
    effective_from = Column(Date, nullable=True)
    effective_to = Column(Date, nullable=True)
    status = Column(String(50), nullable=True, default="active")
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("idx_project_members_project_id", "project_id"),
        Index("idx_project_members_employee_id", "employee_id"),
    )
