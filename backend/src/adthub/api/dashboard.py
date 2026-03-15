"""Route handlers for the Hub Dashboard API endpoints (Epic 1).

Handles HTTP concerns only — request validation, rate limiting, response
serialisation, and exception translation. No business logic lives here.
"""

import secrets
from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address

from ..db.repositories.dashboard_repository import _encode_cursor
from ..exceptions import TaskAlreadyCompletedError, TaskNotFoundError
from ..schemas.common import ApiError, ApiResponse, PaginationMeta
from ..schemas.dashboard import ModuleSummaryResponse, TaskResponse
from ..services.dashboard_service import DashboardService
from .dependencies import get_current_user_id, get_dashboard_service, get_request_id

router = APIRouter(prefix="/v1/dashboard", tags=["dashboard"])
_limiter = Limiter(key_func=get_remote_address)


@router.get("/modules", response_model=ApiResponse[list[ModuleSummaryResponse]])
@_limiter.limit("100/minute")
def get_modules(
    request: Request,
    user_id: str = Depends(get_current_user_id),
    service: DashboardService = Depends(get_dashboard_service),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    """Return all modules with their pending task counts for the authenticated user.

    Each module card shows a count of open tasks assigned to the user from that
    module's task pool. The module list is role-aware (RBAC via Epic 3, stub for now).
    """
    summaries = service.get_module_summaries(user_id)
    data = [
        ModuleSummaryResponse(
            id=s.id,
            label=s.label,
            path=s.path,
            pending_count=s.pending_count,
        )
        for s in summaries
    ]
    return JSONResponse(
        content=ApiResponse(data=[m.model_dump() for m in data], meta=None, error=None).model_dump(),
        headers={"X-Request-ID": request_id},
    )


@router.get("/tasks", response_model=ApiResponse[list[TaskResponse]])
@_limiter.limit("100/minute")
def get_my_tasks(
    request: Request,
    limit: int = Query(default=20, ge=1, le=100),
    cursor: str | None = Query(default=None, max_length=500),
    user_id: str = Depends(get_current_user_id),
    service: DashboardService = Depends(get_dashboard_service),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    """Return the authenticated user's open tasks, sorted by deadline ascending.

    Results are cursor-paginated. Pass the next_cursor value from meta as the
    cursor parameter to retrieve the following page.
    """
    tasks, total = service.get_my_tasks(user_id, limit=limit, cursor=cursor)

    has_next = len(tasks) > limit
    page = tasks[:limit]

    next_cursor = (
        _encode_cursor(page[-1].deadline, page[-1].id) if has_next and page else None
    )

    data = [
        TaskResponse(
            task_id=t.id,
            module=t.module,
            title=t.title,
            source_record_id=t.source_record_id,
            assigned_to_id=t.assigned_to_id,
            deadline=t.deadline,
            status=t.status,
            completed_at=t.completed_at,
        )
        for t in page
    ]
    meta = PaginationMeta(
        total=total,
        page_size=len(page),
        next_cursor=next_cursor,
        prev_cursor=None,  # forward-only pagination
    )
    return JSONResponse(
        content=ApiResponse(
            data=[t.model_dump(mode="json") for t in data],
            meta=meta.model_dump(),
            error=None,
        ).model_dump(),
        headers={"X-Request-ID": request_id},
    )


@router.post("/tasks/test", response_model=ApiResponse[TaskResponse])
@_limiter.limit("10/minute")
def create_test_task(
    request: Request,
    user_id: str = Depends(get_current_user_id),
    service: DashboardService = Depends(get_dashboard_service),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    """Create a test task assigned to the authenticated user.

    The task appears in the inbox and dashboard task list immediately and can
    be completed like any real task. Intended for verifying notification wiring.
    """
    task = service.create_test_task(user_id)
    response_data = TaskResponse(
        task_id=task.id,
        module=task.module,
        title=task.title,
        source_record_id=task.source_record_id,
        assigned_to_id=task.assigned_to_id,
        deadline=task.deadline,
        status=task.status,
        completed_at=task.completed_at,
    )
    return JSONResponse(
        content=ApiResponse(data=response_data.model_dump(mode="json"), meta=None, error=None).model_dump(),
        headers={"X-Request-ID": request_id},
    )


@router.patch("/tasks/{task_id}/complete", response_model=ApiResponse[TaskResponse])
@_limiter.limit("30/minute")
def complete_task(
    task_id: str,
    request: Request,
    user_id: str = Depends(get_current_user_id),
    service: DashboardService = Depends(get_dashboard_service),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    """Mark a task as completed.

    The task must be assigned to the authenticated user and must be in open status.
    Completing a task here is authoritative — source modules should observe this
    table to sync their own task status.
    """
    try:
        task = service.complete_task(task_id, user_id)
    except TaskNotFoundError as exc:
        return JSONResponse(
            status_code=404,
            content=ApiResponse(
                data=None,
                meta=None,
                error=ApiError(
                    code="TASK_NOT_FOUND",
                    message=str(exc),
                    request_id=request_id,
                ).model_dump(),
            ).model_dump(),
            headers={"X-Request-ID": request_id},
        )
    except TaskAlreadyCompletedError as exc:
        return JSONResponse(
            status_code=422,
            content=ApiResponse(
                data=None,
                meta=None,
                error=ApiError(
                    code="TASK_ALREADY_COMPLETED",
                    message=str(exc),
                    request_id=request_id,
                ).model_dump(),
            ).model_dump(),
            headers={"X-Request-ID": request_id},
        )

    response_data = TaskResponse(
        task_id=task.id,
        module=task.module,
        title=task.title,
        source_record_id=task.source_record_id,
        assigned_to_id=task.assigned_to_id,
        deadline=task.deadline,
        status=task.status,
        completed_at=task.completed_at,
    )
    return JSONResponse(
        content=ApiResponse(data=response_data.model_dump(mode="json"), meta=None, error=None).model_dump(),
        headers={"X-Request-ID": request_id},
    )
