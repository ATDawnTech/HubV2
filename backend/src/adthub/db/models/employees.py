from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Text, Date, DateTime, Numeric, Boolean,
    ForeignKey, UniqueConstraint, Index, CheckConstraint
)
from ..base import Base


class Employee(Base):
    __tablename__ = "employees"

    id = Column(String(255), primary_key=True)
    first_name = Column(String(255), nullable=False)
    last_name = Column(String(255), nullable=False)
    work_email = Column(String(255), nullable=False, unique=True)
    personal_email = Column(String(255), nullable=True, unique=True)
    phone = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    employee_code = Column(String(100), nullable=True, unique=True)
    employee_number = Column(String(100), nullable=True, unique=True)
    job_title = Column(String(255), nullable=True)
    department = Column(String(255), nullable=True)
    manager_id = Column(String(255), ForeignKey("employees.id"), nullable=True)
    hire_date = Column(Date, nullable=True)
    hire_type = Column(String(50), nullable=True)
    work_mode = Column(String(50), nullable=True)
    status = Column(String(50), nullable=False, default="active")
    photo_path = Column(Text, nullable=True)
    location = Column(String(255), nullable=True)
    cost_annual = Column(Numeric, nullable=True)
    currency_code = Column(String(10), nullable=True, default="USD")
    margin_pct = Column(Numeric, nullable=True, default=30)
    archived_at = Column(DateTime(timezone=True), nullable=True)
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
            "status IN ('new_onboard', 'active', 'archiving', 'archived')",
            name="ck_employees_status",
        ),
        Index("idx_employees_manager_id", "manager_id"),
        Index("idx_employees_status", "status"),
    )


class EmployeeSkill(Base):
    __tablename__ = "employee_skills"

    employee_id = Column(String(255), ForeignKey("employees.id"), nullable=False, primary_key=True)
    skill_id = Column(String(255), ForeignKey("skills_catalog.id"), nullable=False, primary_key=True)
    level = Column(Integer, nullable=False)
    years = Column(Numeric, nullable=True, default=0)
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("idx_employee_skills_employee_id", "employee_id"),
        Index("idx_employee_skills_skill_id", "skill_id"),
    )


class EmployeeCertification(Base):
    __tablename__ = "employee_certifications"

    id = Column(String(255), primary_key=True)
    employee_id = Column(String(255), ForeignKey("employees.id"), nullable=False)
    name = Column(String(255), nullable=False)
    authority = Column(String(255), nullable=True)
    credential_id = Column(String(100), nullable=True)
    issued_on = Column(Date, nullable=True)
    expires_on = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True, default=None)

    __table_args__ = (
        Index("idx_employee_certifications_employee_id", "employee_id"),
    )


class EmployeeRate(Base):
    __tablename__ = "employee_rates"

    id = Column(String(255), primary_key=True)
    employee_id = Column(String(255), ForeignKey("employees.id"), nullable=False)
    base_rate_usd = Column(Numeric, nullable=False)
    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("idx_employee_rates_employee_id", "employee_id"),
    )


class EmployeeEmergencyContact(Base):
    __tablename__ = "employee_emergency_contacts"

    id = Column(String(255), primary_key=True)
    employee_id = Column(
        String(255), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False
    )
    name = Column(String(255), nullable=False)
    relationship = Column(String(100), nullable=False)
    phone = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True, default=None)

    __table_args__ = (
        Index("idx_employee_emergency_contacts_employee_id", "employee_id"),
    )


class EmployeeAttachment(Base):
    __tablename__ = "employee_attachments"

    id = Column(String(255), primary_key=True)
    employee_id = Column(
        String(255), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False
    )
    file_url = Column(Text, nullable=False)
    file_name = Column(String(255), nullable=False)
    label = Column(String(255), nullable=True)
    uploaded_by = Column(String(255), ForeignKey("employees.id"), nullable=True)
    uploaded_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_employee_attachments_employee_id", "employee_id"),
        Index("idx_employee_attachments_uploaded_by", "uploaded_by"),
    )


class EmployeeProjectHistory(Base):
    __tablename__ = "employee_project_history"

    id = Column(String(255), primary_key=True)
    employee_id = Column(
        String(255), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False
    )
    project_id = Column(
        String(255), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True
    )
    project_name = Column(String(255), nullable=False)
    role = Column(String(255), nullable=True)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    created_by = Column(String(255), ForeignKey("employees.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True, default=None)

    __table_args__ = (
        Index("idx_employee_project_history_employee_id", "employee_id"),
        Index("idx_employee_project_history_project_id", "project_id"),
        Index("idx_employee_project_history_created_by", "created_by"),
    )


class OffboardingTask(Base):
    __tablename__ = "offboarding_tasks"

    id = Column(String(255), primary_key=True)
    employee_id = Column(
        String(255), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False
    )
    task_type = Column(String(100), nullable=False)
    assigned_group = Column(String(50), nullable=False)
    assignee_id = Column(String(255), ForeignKey("employees.id"), nullable=True)
    status = Column(String(50), nullable=False, default="pending")
    due_at = Column(DateTime(timezone=True), nullable=True)
    completed_by = Column(String(255), ForeignKey("employees.id"), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    sign_off_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True, default=None)

    __table_args__ = (
        Index("idx_offboarding_tasks_employee_id", "employee_id"),
        Index("idx_offboarding_tasks_assignee_id", "assignee_id"),
        Index("idx_offboarding_tasks_completed_by", "completed_by"),
    )
