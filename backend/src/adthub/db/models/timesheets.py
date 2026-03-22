from sqlalchemy import (
    Column, String, Text, Date, DateTime, Numeric, Boolean,
    ForeignKey, Index, CheckConstraint, text
)
from sqlalchemy.dialects.postgresql import UUID

from ..base import Base


class Timesheet(Base):
    __tablename__ = "timesheets"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    project_id = Column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    employee_id = Column(
        UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False
    )
    work_date = Column(Date, nullable=False)
    hours = Column(Numeric, nullable=False)
    notes = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="submitted")
    is_billable = Column(Boolean, nullable=False, default=True)
    week_start = Column(Date, nullable=True)
    approved_by = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True, default=None)

    __table_args__ = (
        CheckConstraint("hours > 0 AND hours <= 24", name="ck_timesheets_hours_range"),
        Index("idx_timesheets_project_id", "project_id"),
        Index("idx_timesheets_employee_id", "employee_id"),
        Index("idx_timesheets_approved_by", "approved_by"),
        Index("idx_timesheets_status", "status"),
    )


class FxRate(Base):
    __tablename__ = "fx_rates"

    code = Column(String(10), primary_key=True)
    rate_to_usd = Column(Numeric, nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=True)


class Holiday(Base):
    __tablename__ = "holidays"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    region = Column(String(100), nullable=False)
    holiday_date = Column(Date, nullable=False)
    name = Column(String(255), nullable=False)

    __table_args__ = (
        Index("idx_holidays_region_holiday_date", "region", "holiday_date"),
    )


class Leave(Base):
    __tablename__ = "leaves"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    type = Column(String(100), nullable=False)
    is_approved = Column(Boolean, nullable=True, default=False)
    status = Column(String(50), nullable=True, default="pending")
    approved_by = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True, default=None)

    __table_args__ = (
        Index("idx_leaves_employee_id", "employee_id"),
        Index("idx_leaves_approved_by", "approved_by"),
    )
