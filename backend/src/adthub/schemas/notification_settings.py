"""Pydantic schemas for Epic 3.4 – Notification Module."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class NotificationSettingsResponse(BaseModel):
    email_enabled: bool
    inapp_enabled: bool
    offboarding_deadline_hours: int
    escalation_warning_hours: int
    warranty_alert_days: int
    updated_by: UUID | None
    updated_at: datetime


class UpdateNotificationSettingsRequest(BaseModel):
    email_enabled: bool | None = None
    inapp_enabled: bool | None = None
    offboarding_deadline_hours: int | None = Field(default=None, gt=0)
    escalation_warning_hours: int | None = Field(default=None, gt=0)
    warranty_alert_days: int | None = Field(default=None, gt=0)


class ModuleToggleEntry(BaseModel):
    module: str
    channel: str
    enabled: bool


class SetModuleTogglesRequest(BaseModel):
    toggles: list[ModuleToggleEntry]
