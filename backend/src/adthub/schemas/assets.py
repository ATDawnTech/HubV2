"""Pydantic schemas for Assets API."""

from datetime import date, datetime
from uuid import UUID
from pydantic import BaseModel, Field


class AssetResponse(BaseModel):
    """Pydantic schema for Asset response."""
    id: UUID
    asset_tag: str
    model: str | None = None
    manufacturer: str | None = None
    category_id: UUID | None = None
    serial_number: str | None = None
    location: str | None = None
    assigned_to: UUID | None = None
    status: str | None = None
    condition: str | None = None
    procurement_date: date | None = None
    warranty_start_date: date | None = None
    warranty_end_date: date | None = None
    warranty_type: str | None = None
    vendor: str | None = None
    invoice_verified_status: str | None = None
    import_source: str | None = None
    import_date: date | None = None
    notes: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    deleted_at: datetime | None = None

    model_config = {"from_attributes": True}


class CreateAssetRequest(BaseModel):
    """Pydantic schema for creating an Asset."""
    asset_tag: str = Field(..., min_length=1, max_length=100)
    model: str = Field(..., min_length=1, max_length=255)
    manufacturer: str | None = Field(None, max_length=255)
    category_id: UUID | None = Field(None)
    serial_number: str | None = Field(None, max_length=255)
    location: str | None = Field(None, max_length=255)
    assigned_to: UUID | None = Field(None)
    status: str | None = Field("available", max_length=50)
    condition: str | None = Field(None, max_length=50)
    procurement_date: date | None = None
    warranty_start_date: date | None = None
    warranty_end_date: date | None = None
    warranty_type: str | None = Field(None, max_length=50)
    vendor: str | None = Field(None, max_length=255)
    invoice_verified_status: str | None = Field("unverified", max_length=50)
    import_source: str | None = Field(None, max_length=255)
    import_date: date | None = None
    notes: str | None = None


class UpdateAssetRequest(BaseModel):
    """Pydantic schema for updating an Asset."""
    asset_tag: str | None = Field(None, min_length=1, max_length=100)
    model: str | None = Field(None, min_length=1, max_length=255)
    manufacturer: str | None = Field(None, max_length=255)
    category_id: UUID | None = Field(None)
    serial_number: str | None = Field(None, max_length=255)
    location: str | None = Field(None, max_length=255)
    assigned_to: UUID | None = Field(None)
    status: str | None = Field(None, max_length=50)
    condition: str | None = Field(None, max_length=50)
    procurement_date: date | None = None
    warranty_start_date: date | None = None
    warranty_end_date: date | None = None
    warranty_type: str | None = Field(None, max_length=50)
    vendor: str | None = Field(None, max_length=255)
    invoice_verified_status: str | None = Field(None, max_length=50)
    import_source: str | None = Field(None, max_length=255)
    import_date: date | None = None
    notes: str | None = None

class AssetCategoryResponse(BaseModel):
    """Pydantic schema for AssetCategory response."""
    id: UUID
    name: str
    code: str | None = None
    description: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    deleted_at: datetime | None = None

    model_config = {"from_attributes": True}

class CreateAssetCategoryRequest(BaseModel):
    """Pydantic schema for creating an AssetCategory."""
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(None, max_length=255)
    code: str = Field(..., min_length=1, max_length=255)

class UpdateAssetCategoryRequest(BaseModel):
    """Pydantic schema for updating an AssetCategory."""
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = Field(None, max_length=255)
    code: str | None = Field(None, min_length=1, max_length=255)