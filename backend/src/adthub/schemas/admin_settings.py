"""Pydantic schemas for Epic 3 – Admin System Settings API."""

from datetime import datetime
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Dropdown option — read
# ---------------------------------------------------------------------------

class DropdownOptionResponse(BaseModel):
    id: str
    module: str
    category: str
    value: str
    sort_order: int
    is_active: bool
    created_by: str | None
    created_at: datetime | None
    updated_at: datetime | None


# ---------------------------------------------------------------------------
# Dropdown option — write
# ---------------------------------------------------------------------------

class CreateDropdownRequest(BaseModel):
    module: str = Field(..., min_length=1, max_length=100)
    category: str = Field(..., min_length=1, max_length=255)
    value: str = Field(..., min_length=1, max_length=255)
    sort_order: int = Field(default=0, ge=0)


class UpdateDropdownRequest(BaseModel):
    value: str | None = Field(default=None, min_length=1, max_length=255)
    sort_order: int | None = Field(default=None, ge=0)
    is_active: bool | None = None


class ReassignEmployeesRequest(BaseModel):
    module: str = Field(..., min_length=1, max_length=100)
    category: str = Field(..., min_length=1, max_length=255)
    from_value: str = Field(..., min_length=1, max_length=255)
    to_value: str = Field(..., min_length=1, max_length=255)
