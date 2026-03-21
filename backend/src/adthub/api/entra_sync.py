"""Entra sync admin endpoints — manual trigger and status."""

from datetime import UTC, datetime

import structlog
from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from ..services.entra_sync_service import EntraSyncService
from .dependencies import get_db, get_request_id, require_permission

logger = structlog.get_logger()
router = APIRouter(prefix="/v1/admin/entra", tags=["Entra Sync"])
_limiter = Limiter(key_func=get_remote_address)

# In-process sync status — resets on container restart.
_last_sync: dict | None = None


def record_sync_result(stats: dict) -> None:
    """Update the in-process sync status record. Called by the scheduler too."""
    global _last_sync
    _last_sync = {
        "synced_at": datetime.now(UTC).isoformat(),
        **stats,
    }


@router.post("/sync", summary="Trigger a manual Entra directory sync")
@_limiter.limit("5/minute")
def trigger_sync(
    request: Request,
    db: Session = Depends(get_db),
    _user_id: str = Depends(require_permission("admin", "manage_entra_sync")),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    service = EntraSyncService(db)
    stats = service.sync_all_groups()
    record_sync_result(stats)
    logger.info("Entra sync: manual trigger complete.", request_id=request_id, **stats)
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"data": {**(_last_sync or {}), "next_run_at": _get_next_run_at()}, "meta": None, "error": None},
    )


def _get_next_run_at() -> str | None:
    """Return the ISO timestamp of the next scheduled Entra sync, or None."""
    try:
        from ..main import _scheduler

        job = _scheduler.get_job("entra_sync")
        if job and job.next_run_time:
            return job.next_run_time.isoformat()
    except Exception:
        pass
    return None


@router.get("/sync/status", summary="Get last Entra sync status")
@_limiter.limit("30/minute")
def get_sync_status(
    request: Request,
    _user_id: str = Depends(require_permission("admin", "manage_entra_sync")),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    data = {**(_last_sync or {}), "next_run_at": _get_next_run_at()}
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"data": data, "meta": None, "error": None},
    )
