"""Pydantic schemas for the Skill Management API (Epic 3.2)."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class SkillResponse(BaseModel):
    """Read model returned for a single skill in list and create responses."""

    id: str
    name: str
    category: str | None
    usage_count: int
    intake_count: int = 0
    created_at: datetime | None

    model_config = {"from_attributes": True}


class CreateSkillRequest(BaseModel):
    """Validated payload for adding a new skill to the global library."""

    name: str = Field(..., min_length=1, max_length=255)
    category: str | None = Field(None, max_length=255)

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        """Strip leading/trailing whitespace from the skill name."""
        return v.strip()


class BulkDeleteSkillsRequest(BaseModel):
    """Payload for the bulk-delete endpoint — one or more skill IDs."""

    ids: list[str] = Field(..., min_length=1)


class BulkDeleteSkillsResponse(BaseModel):
    """Summary returned after a bulk-delete operation."""

    deleted_count: int
    skipped_count: int
    skipped_ids: list[str]


class BulkRecategorizeRequest(BaseModel):
    """Payload for bulk-reassigning all skills from one category to another."""

    from_category: str | None = Field(None, description="Source category (null = uncategorized)")
    to_category: str | None = Field(None, description="Target category (null = uncategorize)")


class BulkRecategorizeResponse(BaseModel):
    """Summary returned after a bulk-recategorize operation."""

    updated_count: int
