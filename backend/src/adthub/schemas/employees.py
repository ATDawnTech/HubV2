"""Pydantic request/response models for the Employee Management API (Epic 2)."""

from datetime import date, datetime
from pydantic import BaseModel


class EmployeeResponse(BaseModel):
    """A single employee returned by the API."""

    id: str
    employee_code: str | None
    first_name: str
    last_name: str
    work_email: str
    job_title: str | None
    department: str | None
    manager_id: str | None
    hire_date: date | None
    hire_type: str | None
    work_mode: str | None
    status: str
    location: str | None
    archived_at: datetime | None
    created_at: datetime
    updated_at: datetime


class CreateEmployeeRequest(BaseModel):
    """Request body for POST /v1/employees."""

    first_name: str
    last_name: str
    work_email: str
    department: str | None = None
    location: str | None = None
    hire_type: str | None = None
    work_mode: str | None = None
    job_title: str | None = None
    manager_id: str | None = None
    hire_date: date | None = None
    status: str = "active"


class UpdateEmployeeRequest(BaseModel):
    """Request body for PATCH /v1/employees/{id}. All fields optional."""

    first_name: str | None = None
    last_name: str | None = None
    job_title: str | None = None
    department: str | None = None
    manager_id: str | None = None
    hire_date: date | None = None
    hire_type: str | None = None
    work_mode: str | None = None
    location: str | None = None
    status: str | None = None


class ReassignTaskRequest(BaseModel):
    """Request body for PATCH …/offboarding-tasks/{task_id}/reassign."""

    assignee_id: str | None = None


class OffboardingTaskResponse(BaseModel):
    """A single offboarding task."""

    id: str
    employee_id: str
    task_type: str
    assigned_group: str
    assignee_id: str | None
    status: str
    due_at: datetime | None
    completed_by: str | None
    completed_at: datetime | None
    sign_off_notes: str | None
    created_at: datetime
    updated_at: datetime


class OffboardingEmployeeResponse(BaseModel):
    """An employee in the offboarding hub — includes their task checklist."""

    employee: EmployeeResponse
    tasks: list[OffboardingTaskResponse]
