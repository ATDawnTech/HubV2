"""Route handlers for Role & Permission Management.

GET    /v1/admin/roles                                        — list all roles
POST   /v1/admin/roles                                        — create role
GET    /v1/admin/roles/{role_id}                              — get role with permissions
PATCH  /v1/admin/roles/{role_id}                              — update role metadata
DELETE /v1/admin/roles/{role_id}                              — soft-delete role

GET    /v1/admin/roles/{role_id}/permissions                  — list permissions
PUT    /v1/admin/roles/{role_id}/permissions                  — replace permission set

GET    /v1/admin/roles/{role_id}/grantable                    — list grantable role IDs
PUT    /v1/admin/roles/{role_id}/grantable                    — replace grantable role set

GET    /v1/admin/roles/{role_id}/assignments                  — list employees with this role
POST   /v1/admin/roles/{role_id}/assignments                  — assign role to employee
PATCH  /v1/admin/roles/{role_id}/assignments/{emp_id}         — update manager context
DELETE /v1/admin/roles/{role_id}/assignments/{emp_id}         — revoke role from employee

GET    /v1/admin/roles/default-permissions                    — get default permissions
PUT    /v1/admin/roles/default-permissions                    — set default permissions
"""

from fastapi import APIRouter, Depends, Query, Request, status
from fastapi.responses import JSONResponse, Response
from slowapi import Limiter
from slowapi.util import get_remote_address

from ..exceptions import (
    ConflictError,
    ResourceNotFoundError,
    SystemRoleDeleteError,
    ValidationError,
)
from ..schemas.common import ApiError, ApiResponse, PaginationMeta
from ..schemas.roles import (
    AssignRoleRequest,
    CreateRoleRequest,
    PermissionEntry,
    RoleAssignmentResponse,
    RoleWithPermissionsResponse,
    SetGrantableRolesRequest,
    SetManagerPermissionsRequest,
    SetPermissionsRequest,
    SetSortOrdersRequest,
    UpdateAssignmentRequest,
    UpdateRoleRequest,
)
from ..services.role_service import RoleService
from .dependencies import get_current_user_id, get_request_id, get_role_service

router = APIRouter(prefix="/v1/admin/roles", tags=["roles"])
_limiter = Limiter(key_func=get_remote_address)


# ---------------------------------------------------------------------------
# Serialisation helpers
# ---------------------------------------------------------------------------

def _to_role_response(role, permissions=None, manager_permissions=None) -> dict:
    mgr_pairs = RoleService.deserialize_manager_permissions(role.manager_permissions)
    data = RoleWithPermissionsResponse(
        id=role.id,
        name=role.name,
        description=role.description,
        is_system=role.is_system,
        sort_order=role.sort_order if role.sort_order is not None else 9999,
        auto_assign_departments=RoleService.deserialize_auto_assign_departments(role.auto_assign_departments),
        dashboard_config=RoleService.deserialize_dashboard_config(role.dashboard_config),
        created_at=role.created_at,
        updated_at=role.updated_at,
        permissions=[
            PermissionEntry(module=p.module, action=p.action)
            for p in (permissions or [])
        ],
        manager_permissions=[
            PermissionEntry(module=p["module"], action=p["action"])
            for p in (manager_permissions if manager_permissions is not None else mgr_pairs)
        ],
    )
    return data.model_dump(mode="json")


def _to_assignment(a) -> dict:
    mgr_perms = RoleService.deserialize_manager_permissions(a.manager_permissions)
    return RoleAssignmentResponse(
        employee_id=a.employee_id,
        role_id=a.role_id,
        assigned_by=a.assigned_by,
        assigned_at=a.assigned_at,
        is_manager=bool(a.is_manager),
        manager_permissions=[PermissionEntry(module=p["module"], action=p["action"]) for p in mgr_perms],
    ).model_dump(mode="json")


def _error(code: str, message: str, request_id: str) -> dict:
    return ApiResponse(
        data=None,
        meta=None,
        error=ApiError(code=code, message=message, request_id=request_id),
    ).model_dump(mode="json")


# ---------------------------------------------------------------------------
# Role CRUD
# ---------------------------------------------------------------------------

@router.get("", summary="List all roles")
@_limiter.limit("100/minute")
def list_roles(
    request: Request,
    limit: int = Query(default=20, ge=1, le=100),
    cursor: str | None = Query(default=None, max_length=500),
    service: RoleService = Depends(get_role_service),
    _user_id: str = Depends(get_current_user_id),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    roles, total, next_cursor = service.list_roles(limit=limit, cursor=cursor)
    return JSONResponse(
        content=ApiResponse(
            data=[_to_role_response(r) for r in roles],
            meta=PaginationMeta(
                total=total,
                page_size=len(roles),
                next_cursor=next_cursor,
                prev_cursor=None,
            ).model_dump(mode="json"),
            error=None,
        ).model_dump(mode="json"),
        headers={"X-Request-ID": request_id},
    )


@router.get("/me/effective-permissions", summary="List the current user's effective permissions across all roles (includes defaults)")
@_limiter.limit("100/minute")
def get_my_effective_permissions(
    request: Request,
    service: RoleService = Depends(get_role_service),
    user_id: str = Depends(get_current_user_id),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    result = service.get_effective_permissions_with_defaults(user_id)
    return JSONResponse(
        content=ApiResponse(data=result, meta=None, error=None).model_dump(mode="json"),
        headers={"X-Request-ID": request_id},
    )


@router.get("/default-permissions", summary="Get default permissions applied to all users without a role")
@_limiter.limit("100/minute")
def get_default_permissions(
    request: Request,
    service: RoleService = Depends(get_role_service),
    _user_id: str = Depends(get_current_user_id),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    perms = service.get_default_permissions()
    return JSONResponse(
        content=ApiResponse(data=perms, meta=None, error=None).model_dump(mode="json"),
        headers={"X-Request-ID": request_id},
    )


@router.put("/default-permissions", summary="Set default permissions applied to all users without a role")
@_limiter.limit("30/minute")
def set_default_permissions(
    request: Request,
    body: SetPermissionsRequest,
    service: RoleService = Depends(get_role_service),
    user_id: str = Depends(get_current_user_id),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    try:
        result = service.set_default_permissions(
            [{"module": p.module, "action": p.action} for p in body.permissions],
            updated_by=user_id,
        )
    except ValidationError as exc:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=_error("PERMISSION_VALIDATION_ERROR", str(exc), request_id),
            headers={"X-Request-ID": request_id},
        )
    return JSONResponse(
        content=ApiResponse(data=result, meta=None, error=None).model_dump(mode="json"),
        headers={"X-Request-ID": request_id},
    )


# ---------------------------------------------------------------------------
# Role hierarchy — sort order management (literal route; must precede /{role_id}/…)
# ---------------------------------------------------------------------------

@router.put("/sort-orders", summary="Update sort_order for role hierarchy")
@_limiter.limit("30/minute")
def set_sort_orders(
    request: Request,
    body: SetSortOrdersRequest,
    service: RoleService = Depends(get_role_service),
    _user_id: str = Depends(get_current_user_id),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    service.set_sort_orders([e.model_dump() for e in body.orders])
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content=ApiResponse(data=None, meta=None, error=None).model_dump(mode="json"),
        headers={"X-Request-ID": request_id},
    )


@router.delete("/me/assignments", status_code=status.HTTP_204_NO_CONTENT, summary="Remove all role assignments for the current user")
@_limiter.limit("30/minute")
def unassign_all_my_roles(
    request: Request,
    service: RoleService = Depends(get_role_service),
    user_id: str = Depends(get_current_user_id),
    request_id: str = Depends(get_request_id),
) -> Response:
    service.unassign_all_roles(user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT, headers={"X-Request-ID": request_id})


@router.post("", status_code=status.HTTP_201_CREATED, summary="Create a new role")
@_limiter.limit("30/minute")
def create_role(
    request: Request,
    body: CreateRoleRequest,
    service: RoleService = Depends(get_role_service),
    _user_id: str = Depends(get_current_user_id),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    try:
        role = service.create_role(
            name=body.name,
            description=body.description,
            auto_assign_departments=body.auto_assign_departments,
            dashboard_config=body.dashboard_config,
        )
    except ConflictError as exc:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content=_error("ROLE_CONFLICT", str(exc), request_id),
            headers={"X-Request-ID": request_id},
        )
    except ValidationError as exc:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=_error("ROLE_VALIDATION_ERROR", str(exc), request_id),
            headers={"X-Request-ID": request_id},
        )
    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content=ApiResponse(
            data=_to_role_response(role),
            meta=None,
            error=None,
        ).model_dump(mode="json"),
        headers={"X-Request-ID": request_id},
    )


@router.get("/{role_id}", summary="Get a role with its current permissions")
@_limiter.limit("100/minute")
def get_role(
    request: Request,
    role_id: str,
    service: RoleService = Depends(get_role_service),
    _user_id: str = Depends(get_current_user_id),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    try:
        role = service.get_role(role_id)
        permissions = service.get_permissions(role_id)
    except ResourceNotFoundError as exc:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=_error("ROLE_NOT_FOUND", str(exc), request_id),
            headers={"X-Request-ID": request_id},
        )
    return JSONResponse(
        content=ApiResponse(
            data=_to_role_response(role, permissions),
            meta=None,
            error=None,
        ).model_dump(mode="json"),
        headers={"X-Request-ID": request_id},
    )


@router.patch("/{role_id}", summary="Update role metadata")
@_limiter.limit("30/minute")
def update_role(
    request: Request,
    role_id: str,
    body: UpdateRoleRequest,
    service: RoleService = Depends(get_role_service),
    _user_id: str = Depends(get_current_user_id),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    try:
        role = service.update_role(
            role_id=role_id,
            name=body.name,
            description=body.description,
            auto_assign_departments=body.auto_assign_departments,
            dashboard_config=body.dashboard_config,
        )
    except ResourceNotFoundError as exc:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=_error("ROLE_NOT_FOUND", str(exc), request_id),
            headers={"X-Request-ID": request_id},
        )
    except ConflictError as exc:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content=_error("ROLE_CONFLICT", str(exc), request_id),
            headers={"X-Request-ID": request_id},
        )
    except ValidationError as exc:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=_error("ROLE_VALIDATION_ERROR", str(exc), request_id),
            headers={"X-Request-ID": request_id},
        )
    return JSONResponse(
        content=ApiResponse(
            data=_to_role_response(role),
            meta=None,
            error=None,
        ).model_dump(mode="json"),
        headers={"X-Request-ID": request_id},
    )


@router.delete(
    "/{role_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft-delete a role (system roles are protected)",
)
@_limiter.limit("30/minute")
def delete_role(
    request: Request,
    role_id: str,
    service: RoleService = Depends(get_role_service),
    _user_id: str = Depends(get_current_user_id),
    request_id: str = Depends(get_request_id),
) -> Response:
    try:
        service.delete_role(role_id)
    except ResourceNotFoundError:
        pass  # idempotent
    except SystemRoleDeleteError as exc:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content=_error("SYSTEM_ROLE_DELETE_DENIED", str(exc), request_id),
            headers={"X-Request-ID": request_id},
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Permissions
# ---------------------------------------------------------------------------

@router.get("/{role_id}/permissions", summary="List permissions for a role")
@_limiter.limit("100/minute")
def get_permissions(
    request: Request,
    role_id: str,
    service: RoleService = Depends(get_role_service),
    _user_id: str = Depends(get_current_user_id),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    try:
        perms = service.get_permissions(role_id)
    except ResourceNotFoundError as exc:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=_error("ROLE_NOT_FOUND", str(exc), request_id),
            headers={"X-Request-ID": request_id},
        )
    return JSONResponse(
        content=ApiResponse(
            data=[PermissionEntry(module=p.module, action=p.action).model_dump(mode="json") for p in perms],
            meta=None,
            error=None,
        ).model_dump(mode="json"),
        headers={"X-Request-ID": request_id},
    )


@router.put("/{role_id}/permissions", summary="Replace the full permission set for a role")
@_limiter.limit("30/minute")
def set_permissions(
    request: Request,
    role_id: str,
    body: SetPermissionsRequest,
    service: RoleService = Depends(get_role_service),
    _user_id: str = Depends(get_current_user_id),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    try:
        perms = service.set_permissions(
            role_id=role_id,
            permission_pairs=[p.model_dump() for p in body.permissions],
        )
    except ResourceNotFoundError as exc:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=_error("ROLE_NOT_FOUND", str(exc), request_id),
            headers={"X-Request-ID": request_id},
        )
    except ValidationError as exc:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=_error("PERMISSION_VALIDATION_ERROR", str(exc), request_id),
            headers={"X-Request-ID": request_id},
        )
    return JSONResponse(
        content=ApiResponse(
            data=[PermissionEntry(module=p.module, action=p.action).model_dump(mode="json") for p in perms],
            meta=None,
            error=None,
        ).model_dump(mode="json"),
        headers={"X-Request-ID": request_id},
    )


# ---------------------------------------------------------------------------
# Manager permissions (role-level template)
# ---------------------------------------------------------------------------

@router.get("/{role_id}/manager-permissions", summary="Get manager permission template for a role")
@_limiter.limit("100/minute")
def get_manager_permissions(
    request: Request,
    role_id: str,
    service: RoleService = Depends(get_role_service),
    _user_id: str = Depends(get_current_user_id),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    try:
        perms = service.get_manager_permissions(role_id)
    except ResourceNotFoundError as exc:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=_error("ROLE_NOT_FOUND", str(exc), request_id),
            headers={"X-Request-ID": request_id},
        )
    return JSONResponse(
        content=ApiResponse(
            data=[{"module": p["module"], "action": p["action"]} for p in perms],
            meta=None,
            error=None,
        ).model_dump(mode="json"),
        headers={"X-Request-ID": request_id},
    )


@router.put("/{role_id}/manager-permissions", summary="Replace manager permission template for a role")
@_limiter.limit("30/minute")
def set_manager_permissions(
    request: Request,
    role_id: str,
    body: SetManagerPermissionsRequest,
    service: RoleService = Depends(get_role_service),
    _user_id: str = Depends(get_current_user_id),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    try:
        perms = service.set_manager_permissions(
            role_id=role_id,
            permission_pairs=[p.model_dump() for p in body.permissions],
        )
    except ResourceNotFoundError as exc:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=_error("ROLE_NOT_FOUND", str(exc), request_id),
            headers={"X-Request-ID": request_id},
        )
    except ValidationError as exc:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=_error("PERMISSION_VALIDATION_ERROR", str(exc), request_id),
            headers={"X-Request-ID": request_id},
        )
    return JSONResponse(
        content=ApiResponse(
            data=[{"module": p["module"], "action": p["action"]} for p in perms],
            meta=None,
            error=None,
        ).model_dump(mode="json"),
        headers={"X-Request-ID": request_id},
    )


# ---------------------------------------------------------------------------
# Grant permission hierarchy
# ---------------------------------------------------------------------------

@router.get("/{role_id}/grantable", summary="List role IDs this role can assign to employees")
@_limiter.limit("100/minute")
def get_grantable_roles(
    request: Request,
    role_id: str,
    service: RoleService = Depends(get_role_service),
    _user_id: str = Depends(get_current_user_id),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    try:
        ids = service.get_grantable_roles(role_id)
    except ResourceNotFoundError as exc:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=_error("ROLE_NOT_FOUND", str(exc), request_id),
            headers={"X-Request-ID": request_id},
        )
    return JSONResponse(
        content=ApiResponse(data=ids, meta=None, error=None).model_dump(mode="json"),
        headers={"X-Request-ID": request_id},
    )


@router.put("/{role_id}/grantable", summary="Replace the set of roles this role can assign")
@_limiter.limit("30/minute")
def set_grantable_roles(
    request: Request,
    role_id: str,
    body: SetGrantableRolesRequest,
    service: RoleService = Depends(get_role_service),
    _user_id: str = Depends(get_current_user_id),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    try:
        service.set_grantable_roles(role_id, body.assignable_role_ids)
    except ResourceNotFoundError as exc:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=_error("ROLE_NOT_FOUND", str(exc), request_id),
            headers={"X-Request-ID": request_id},
        )
    except ValidationError as exc:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=_error("ROLE_VALIDATION_ERROR", str(exc), request_id),
            headers={"X-Request-ID": request_id},
        )
    return JSONResponse(
        content=ApiResponse(data={"ok": True}, meta=None, error=None).model_dump(mode="json"),
        headers={"X-Request-ID": request_id},
    )


# ---------------------------------------------------------------------------
# Role assignments
# ---------------------------------------------------------------------------

@router.get("/{role_id}/assignments", summary="List employees assigned to this role")
@_limiter.limit("100/minute")
def list_role_assignments(
    request: Request,
    role_id: str,
    service: RoleService = Depends(get_role_service),
    _user_id: str = Depends(get_current_user_id),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    try:
        assignments = service.get_role_assignments(role_id)
    except ResourceNotFoundError as exc:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=_error("ROLE_NOT_FOUND", str(exc), request_id),
            headers={"X-Request-ID": request_id},
        )
    return JSONResponse(
        content=ApiResponse(
            data=[_to_assignment(a) for a in assignments],
            meta=None,
            error=None,
        ).model_dump(mode="json"),
        headers={"X-Request-ID": request_id},
    )


@router.post(
    "/{role_id}/assignments",
    status_code=status.HTTP_201_CREATED,
    summary="Assign a role to an employee",
)
@_limiter.limit("30/minute")
def assign_role(
    request: Request,
    role_id: str,
    body: AssignRoleRequest,
    service: RoleService = Depends(get_role_service),
    _user_id: str = Depends(get_current_user_id),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    try:
        assignment = service.assign_role(
            employee_id=body.employee_id,
            role_id=role_id,
            assigned_by=_user_id,
            is_manager=body.is_manager,
            manager_permissions=[p.model_dump() for p in body.manager_permissions],
        )
    except ResourceNotFoundError as exc:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=_error("ROLE_NOT_FOUND", str(exc), request_id),
            headers={"X-Request-ID": request_id},
        )
    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content=ApiResponse(
            data=_to_assignment(assignment),
            meta=None,
            error=None,
        ).model_dump(mode="json"),
        headers={"X-Request-ID": request_id},
    )


@router.patch(
    "/{role_id}/assignments/{employee_id}",
    summary="Update manager context for a role assignment",
)
@_limiter.limit("30/minute")
def update_assignment(
    request: Request,
    role_id: str,
    employee_id: str,
    body: UpdateAssignmentRequest,
    service: RoleService = Depends(get_role_service),
    _user_id: str = Depends(get_current_user_id),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    try:
        assignment = service.update_assignment(
            employee_id=employee_id,
            role_id=role_id,
            is_manager=body.is_manager,
            manager_permissions=[p.model_dump() for p in body.manager_permissions],
        )
    except ResourceNotFoundError as exc:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=_error("ASSIGNMENT_NOT_FOUND", str(exc), request_id),
            headers={"X-Request-ID": request_id},
        )
    return JSONResponse(
        content=ApiResponse(
            data=_to_assignment(assignment),
            meta=None,
            error=None,
        ).model_dump(mode="json"),
        headers={"X-Request-ID": request_id},
    )


@router.delete(
    "/{role_id}/assignments/{employee_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Revoke a role from an employee",
)
@_limiter.limit("30/minute")
def unassign_role(
    request: Request,
    role_id: str,
    employee_id: str,
    blacklist: bool = Query(default=False, description="Add to auto-assign blacklist to prevent re-assignment"),
    service: RoleService = Depends(get_role_service),
    _user_id: str = Depends(get_current_user_id),
    request_id: str = Depends(get_request_id),
) -> Response:
    try:
        service.unassign_role(employee_id=employee_id, role_id=role_id, blacklist=blacklist)
    except ResourceNotFoundError:
        pass  # idempotent
    return Response(status_code=status.HTTP_204_NO_CONTENT)
