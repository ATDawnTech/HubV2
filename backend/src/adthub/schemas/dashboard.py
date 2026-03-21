"""Pydantic request/response models for the Hub Dashboard API (Epic 1)."""

from datetime import datetime

from pydantic import BaseModel


class ModuleSummaryResponse(BaseModel):
    """A single module card returned by GET /v1/dashboard/modules."""

    id: str
    label: str
    path: str
    pending_count: int


class TaskResponse(BaseModel):
    """A single task item returned by GET /v1/dashboard/tasks."""

    task_id: str
    module: str
    title: str
    source_record_id: str
    assigned_to_id: str | None
    deadline: datetime | None
    status: str
    completed_at: datetime | None
