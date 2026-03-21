"""Route handlers for Epic 3.4 – Notification Module.

GET   /v1/admin/notifications          — get global notification settings
PATCH /v1/admin/notifications          — update global settings (kill-switches + thresholds)
GET   /v1/admin/notifications/toggles  — list per-module/channel toggles
PUT   /v1/admin/notifications/toggles  — replace all module/channel toggles
"""

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address

from ..exceptions import ValidationError
from ..schemas.common import ApiError, ApiResponse
from ..schemas.notification_settings import (
    ModuleToggleEntry,
    NotificationSettingsResponse,
    SetModuleTogglesRequest,
    UpdateNotificationSettingsRequest,
)
from ..services.notification_settings_service import NotificationSettingsService
from .dependencies import (
    get_current_user_id,
    get_notification_settings_service,
    get_request_id,
)

router = APIRouter(prefix="/v1/admin/notifications", tags=["notifications"])
_limiter = Limiter(key_func=get_remote_address)


def _to_settings_response(s) -> dict:
    return NotificationSettingsResponse(
        email_enabled=s.email_enabled,
        inapp_enabled=s.inapp_enabled,
        offboarding_deadline_hours=s.offboarding_deadline_hours,
        escalation_warning_hours=s.escalation_warning_hours,
        warranty_alert_days=s.warranty_alert_days,
        updated_by=s.updated_by,
        updated_at=s.updated_at,
    ).model_dump(mode="json")


def _to_toggle(t) -> dict:
    return ModuleToggleEntry(
        module=t.module,
        channel=t.channel,
        enabled=t.enabled,
    ).model_dump(mode="json")


def _error(code: str, message: str, request_id: str) -> dict:
    return ApiResponse(
        data=None,
        meta=None,
        error=ApiError(code=code, message=message, request_id=request_id),
    ).model_dump(mode="json")


@router.get("", summary="Get global notification settings")
@_limiter.limit("100/minute")
def get_notification_settings(
    request: Request,
    service: NotificationSettingsService = Depends(get_notification_settings_service),
    _user_id: str = Depends(get_current_user_id),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    settings = service.get_settings()
    return JSONResponse(
        content=ApiResponse(
            data=_to_settings_response(settings),
            meta=None,
            error=None,
        ).model_dump(mode="json"),
        headers={"X-Request-ID": request_id},
    )


@router.patch("", summary="Update global notification settings")
@_limiter.limit("30/minute")
def update_notification_settings(
    request: Request,
    body: UpdateNotificationSettingsRequest,
    service: NotificationSettingsService = Depends(get_notification_settings_service),
    _user_id: str = Depends(get_current_user_id),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    try:
        settings = service.update_settings(
            user_id=_user_id,
            email_enabled=body.email_enabled,
            inapp_enabled=body.inapp_enabled,
            offboarding_deadline_hours=body.offboarding_deadline_hours,
            escalation_warning_hours=body.escalation_warning_hours,
            warranty_alert_days=body.warranty_alert_days,
        )
    except ValidationError as exc:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=_error("NOTIFICATION_VALIDATION_ERROR", str(exc), request_id),
            headers={"X-Request-ID": request_id},
        )
    return JSONResponse(
        content=ApiResponse(
            data=_to_settings_response(settings),
            meta=None,
            error=None,
        ).model_dump(mode="json"),
        headers={"X-Request-ID": request_id},
    )


@router.get("/toggles", summary="List all per-module/channel notification toggles")
@_limiter.limit("100/minute")
def list_notification_toggles(
    request: Request,
    service: NotificationSettingsService = Depends(get_notification_settings_service),
    _user_id: str = Depends(get_current_user_id),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    toggles = service.list_toggles()
    return JSONResponse(
        content=ApiResponse(
            data=[_to_toggle(t) for t in toggles],
            meta=None,
            error=None,
        ).model_dump(mode="json"),
        headers={"X-Request-ID": request_id},
    )


@router.put("/toggles", summary="Replace the full set of module/channel toggles")
@_limiter.limit("30/minute")
def set_notification_toggles(
    request: Request,
    body: SetModuleTogglesRequest,
    service: NotificationSettingsService = Depends(get_notification_settings_service),
    _user_id: str = Depends(get_current_user_id),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    try:
        toggles = service.replace_toggles(
            [t.model_dump() for t in body.toggles]
        )
    except ValidationError as exc:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=_error("NOTIFICATION_TOGGLE_ERROR", str(exc), request_id),
            headers={"X-Request-ID": request_id},
        )
    return JSONResponse(
        content=ApiResponse(
            data=[_to_toggle(t) for t in toggles],
            meta=None,
            error=None,
        ).model_dump(mode="json"),
        headers={"X-Request-ID": request_id},
    )
