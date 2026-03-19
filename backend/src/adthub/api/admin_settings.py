"""Route handlers for Epic 3 – Admin System Settings.

Sub-module 3.1: Dropdown Settings
  GET    /v1/admin/dropdowns           — paginated list (admin management)
  GET    /v1/admin/dropdowns/options   — lightweight options list for consumer forms
  POST   /v1/admin/dropdowns           — create a new dropdown value
  PATCH  /v1/admin/dropdowns/{id}      — update value / sort_order / is_active
  DELETE /v1/admin/dropdowns/{id}      — soft-delete a dropdown value
"""

from fastapi import APIRouter, Depends, Query, Request, status
from fastapi.responses import JSONResponse, Response
from slowapi import Limiter
from slowapi.util import get_remote_address

from ..exceptions import ConflictError, ResourceNotFoundError, ValidationError
from ..schemas.admin_settings import (
    CreateDropdownRequest,
    DropdownOptionResponse,
    ReassignEmployeesRequest,
    UpdateDropdownRequest,
)
from ..schemas.common import ApiError, ApiResponse, PaginationMeta
from ..services.admin_settings_service import AdminSettingsService
from .dependencies import (
    get_admin_settings_service,
    get_current_user_id,
    get_request_id,
    require_permission,
)

router = APIRouter(prefix="/v1/admin", tags=["admin-settings"])
_limiter = Limiter(key_func=get_remote_address)


def _to_option(entry) -> DropdownOptionResponse:
    return DropdownOptionResponse(
        id=entry.id,
        module=entry.module,
        category=entry.category,
        value=entry.value,
        sort_order=entry.sort_order or 0,
        is_active=entry.is_active,
        created_by=entry.created_by,
        created_at=entry.created_at,
        updated_at=entry.updated_at,
    )


# ---------------------------------------------------------------------------
# 3.1 Dropdown Settings — consumer endpoint (used by employee forms etc.)
# ---------------------------------------------------------------------------

@router.get(
    "/dropdowns/options",
    summary="List active dropdown options for a module/category (consumer use)",
)
@_limiter.limit("100/minute")
def list_dropdown_options(
    request: Request,
    module: str = Query(..., min_length=1, max_length=100),
    category: str | None = Query(default=None, max_length=255),
    service: AdminSettingsService = Depends(get_admin_settings_service),
    request_id: str = Depends(get_request_id),
    _user_id: str = Depends(get_current_user_id),
) -> JSONResponse:
    options = service.get_options(module, category)
    return JSONResponse(
        content=ApiResponse(
            data=[_to_option(o).model_dump(mode="json") for o in options],
            meta=None,
            error=None,
        ).model_dump(mode="json"),
        headers={"X-Request-ID": request_id},
    )


# ---------------------------------------------------------------------------
# 3.1 Dropdown Settings — admin CRUD
# ---------------------------------------------------------------------------

@router.get(
    "/dropdowns",
    summary="Paginated list of dropdown entries (admin view)",
)
@_limiter.limit("100/minute")
def list_dropdowns(
    request: Request,
    module: str | None = Query(default=None, max_length=100),
    category: str | None = Query(default=None, max_length=255),
    active_only: bool = Query(default=False),
    limit: int = Query(default=20, ge=1, le=100),
    cursor: str | None = Query(default=None, max_length=500),
    service: AdminSettingsService = Depends(get_admin_settings_service),
    request_id: str = Depends(get_request_id),
    _user_id: str = Depends(require_permission("admin", "manage_dropdowns")),
) -> JSONResponse:
    entries, total, next_cursor = service.list_dropdowns(
        module=module,
        category=category,
        active_only=active_only,
        limit=limit,
        cursor=cursor,
    )
    return JSONResponse(
        content=ApiResponse(
            data=[_to_option(e).model_dump(mode="json") for e in entries],
            meta=PaginationMeta(
                total=total,
                page_size=len(entries),
                next_cursor=next_cursor,
                prev_cursor=None,
            ).model_dump(mode="json"),
            error=None,
        ).model_dump(mode="json"),
        headers={"X-Request-ID": request_id},
    )


@router.post(
    "/dropdowns",
    status_code=status.HTTP_201_CREATED,
    summary="Create a new dropdown value (admin)",
)
@_limiter.limit("30/minute")
def create_dropdown(
    request: Request,
    body: CreateDropdownRequest,
    service: AdminSettingsService = Depends(get_admin_settings_service),
    _user_id: str = Depends(require_permission("admin", "manage_dropdowns")),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    try:
        entry = service.create_dropdown(
            module=body.module,
            category=body.category,
            value=body.value,
            sort_order=body.sort_order,
            created_by=_user_id,
        )
    except ConflictError as exc:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content=ApiResponse(
                data=None,
                meta=None,
                error=ApiError(
                    code="DROPDOWN_CONFLICT",
                    message=str(exc),
                    request_id=request_id,
                ),
            ).model_dump(mode="json"),
            headers={"X-Request-ID": request_id},
        )
    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content=ApiResponse(
            data=_to_option(entry).model_dump(mode="json"),
            meta=None,
            error=None,
        ).model_dump(mode="json"),
        headers={"X-Request-ID": request_id},
    )


@router.patch(
    "/dropdowns/{dropdown_id}",
    summary="Update a dropdown value, sort order, or active state (admin)",
)
@_limiter.limit("30/minute")
def update_dropdown(
    request: Request,
    dropdown_id: str,
    body: UpdateDropdownRequest,
    service: AdminSettingsService = Depends(get_admin_settings_service),
    _user_id: str = Depends(require_permission("admin", "manage_dropdowns")),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    try:
        entry = service.update_dropdown(
            dropdown_id=dropdown_id,
            new_value=body.value,
            new_sort_order=body.sort_order,
            is_active=body.is_active,
        )
    except ResourceNotFoundError as exc:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=ApiResponse(
                data=None,
                meta=None,
                error=ApiError(
                    code="DROPDOWN_NOT_FOUND",
                    message=str(exc),
                    request_id=request_id,
                ),
            ).model_dump(mode="json"),
            headers={"X-Request-ID": request_id},
        )
    except ConflictError as exc:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content=ApiResponse(
                data=None,
                meta=None,
                error=ApiError(
                    code="DROPDOWN_CONFLICT",
                    message=str(exc),
                    request_id=request_id,
                ),
            ).model_dump(mode="json"),
            headers={"X-Request-ID": request_id},
        )
    return JSONResponse(
        content=ApiResponse(
            data=_to_option(entry).model_dump(mode="json"),
            meta=None,
            error=None,
        ).model_dump(mode="json"),
        headers={"X-Request-ID": request_id},
    )


@router.post(
    "/dropdowns/reassign-employees",
    summary="Bulk-reassign employees from one dropdown value to another",
)
@_limiter.limit("30/minute")
def reassign_employees(
    request: Request,
    body: ReassignEmployeesRequest,
    service: AdminSettingsService = Depends(get_admin_settings_service),
    _user_id: str = Depends(require_permission("admin", "manage_dropdowns")),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    try:
        affected = service.reassign_employees(
            module=body.module,
            category=body.category,
            from_value=body.from_value,
            to_value=body.to_value,
        )
    except ValidationError as exc:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=ApiResponse(
                data=None,
                meta=None,
                error=ApiError(
                    code="REASSIGN_ERROR",
                    message=str(exc),
                    request_id=request_id,
                ),
            ).model_dump(mode="json"),
            headers={"X-Request-ID": request_id},
        )
    return JSONResponse(
        content=ApiResponse(
            data={"affected": affected},
            meta=None,
            error=None,
        ).model_dump(mode="json"),
        headers={"X-Request-ID": request_id},
    )


@router.delete(
    "/dropdowns/{dropdown_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft-delete a dropdown value (admin)",
)
@_limiter.limit("30/minute")
def delete_dropdown(
    request: Request,
    dropdown_id: str,
    service: AdminSettingsService = Depends(get_admin_settings_service),
    _user_id: str = Depends(require_permission("admin", "manage_dropdowns")),
    request_id: str = Depends(get_request_id),
) -> Response:
    try:
        service.delete_dropdown(dropdown_id)
    except ResourceNotFoundError:
        pass  # idempotent
    return Response(status_code=status.HTTP_204_NO_CONTENT)
