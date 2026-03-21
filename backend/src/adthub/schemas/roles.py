"""Pydantic schemas for Role & Permission Management API."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Permission — read / write (shared shape)
# ---------------------------------------------------------------------------

class PermissionEntry(BaseModel):
    module: str = Field(..., min_length=1, max_length=100)
    action: str = Field(..., min_length=1, max_length=100)


# ---------------------------------------------------------------------------
# Role — read
# ---------------------------------------------------------------------------

class RoleResponse(BaseModel):
    id: UUID
    name: str
    description: str | None
    is_system: bool
    sort_order: int
    auto_assign_departments: list[str]
    dashboard_config: dict | None
    created_at: datetime | None
    updated_at: datetime | None


class RoleWithPermissionsResponse(RoleResponse):
    permissions: list[PermissionEntry]
    manager_permissions: list[PermissionEntry]


# ---------------------------------------------------------------------------
# Role — write
# ---------------------------------------------------------------------------

class CreateRoleRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=1000)
    auto_assign_departments: list[str] = Field(default_factory=list)
    dashboard_config: dict | None = None


class UpdateRoleRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    auto_assign_departments: list[str] | None = None
    dashboard_config: dict | None = None


# ---------------------------------------------------------------------------
# Permissions — write
# ---------------------------------------------------------------------------

class SetPermissionsRequest(BaseModel):
    permissions: list[PermissionEntry]


# ---------------------------------------------------------------------------
# Manager permissions — write
# ---------------------------------------------------------------------------

class SetManagerPermissionsRequest(BaseModel):
    permissions: list[PermissionEntry]


# ---------------------------------------------------------------------------
# Grant permissions hierarchy — write
# ---------------------------------------------------------------------------

class SetGrantableRolesRequest(BaseModel):
    assignable_role_ids: list[UUID]


# ---------------------------------------------------------------------------
# Role assignment — read / write
# ---------------------------------------------------------------------------

class RoleAssignmentResponse(BaseModel):
    employee_id: UUID
    role_id: UUID
    assigned_by: UUID | None
    assigned_at: datetime
    is_manager: bool
    manager_permissions: list[PermissionEntry]


class AssignRoleRequest(BaseModel):
    employee_id: UUID
    is_manager: bool = Field(default=False)
    manager_permissions: list[PermissionEntry] = Field(default_factory=list)


class UpdateAssignmentRequest(BaseModel):
    is_manager: bool
    manager_permissions: list[PermissionEntry] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Sort order — hierarchy management
# ---------------------------------------------------------------------------

class RoleSortOrderEntry(BaseModel):
    role_id: UUID
    sort_order: int = Field(..., ge=0)


class SetSortOrdersRequest(BaseModel):
    orders: list[RoleSortOrderEntry]
