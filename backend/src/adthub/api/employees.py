"""Route handlers for the Employee Management API endpoints (Epic 2).

Handles HTTP concerns only — request validation, rate limiting, response
serialisation, and exception translation. No business logic lives here.
"""

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address

from ..exceptions import ConflictError, ResourceNotFoundError
from ..schemas.common import ApiError, ApiResponse, PaginationMeta
from ..schemas.employees import (
    CreateEmployeeRequest,
    EmployeeResponse,
    OffboardingEmployeeResponse,
    OffboardingTaskResponse,
    ReassignTaskRequest,
    RoleNameEntry,
    UpdateEmployeeRequest,
)
from ..services.employee_service import EmployeeService
from ..services.role_service import RoleService
from .dependencies import (
    get_employee_service,
    get_request_id,
    get_role_service,
    require_permission,
)

router = APIRouter(prefix="/v1/employees", tags=["employees"])
_limiter = Limiter(key_func=get_remote_address)


def _to_employee_response(
    employee,
    roles: list[tuple[str, str]] | None = None,
) -> EmployeeResponse:
    return EmployeeResponse(
        id=employee.id,
        employee_code=employee.employee_code,
        entra_oid=employee.entra_oid,
        first_name=employee.first_name,
        last_name=employee.last_name,
        work_email=employee.work_email,
        job_title=employee.job_title,
        department=employee.department,
        manager_id=employee.manager_id,
        hire_date=employee.hire_date,
        hire_type=employee.hire_type,
        work_mode=employee.work_mode,
        status=employee.status,
        location=employee.location,
        archived_at=employee.archived_at,
        created_at=employee.created_at,
        updated_at=employee.updated_at,
        roles=[RoleNameEntry(role_id=r[0], role_name=r[1]) for r in (roles or [])],
    )


def _to_task_response(task) -> OffboardingTaskResponse:
    return OffboardingTaskResponse(
        id=task.id,
        employee_id=task.employee_id,
        task_type=task.task_type,
        assigned_group=task.assigned_group,
        assignee_id=task.assignee_id,
        status=task.status,
        due_at=task.due_at,
        completed_by=task.completed_by,
        completed_at=task.completed_at,
        sign_off_notes=task.sign_off_notes,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


# ---------------------------------------------------------------------------
# Employees CRUD
# ---------------------------------------------------------------------------


@router.get("", response_model=ApiResponse[list[EmployeeResponse]])
@_limiter.limit("100/minute")
def list_employees(
    request: Request,
    limit: int = Query(default=20, ge=1, le=100),
    cursor: str | None = Query(default=None, max_length=500),
    q: str | None = Query(default=None, max_length=200),
    status: list[str] | None = Query(default=None),
    department: list[str] | None = Query(default=None),
    location: list[str] | None = Query(default=None),
    hire_type: list[str] | None = Query(default=None),
    work_mode: list[str] | None = Query(default=None),
    job_title: str | None = Query(default=None, max_length=200),
    hire_date_from: str | None = Query(default=None, max_length=10),
    hire_date_to: str | None = Query(default=None, max_length=10),
    role_id: list[str] | None = Query(default=None),
    _user_id: str = Depends(require_permission("employees", "view_module")),
    service: EmployeeService = Depends(get_employee_service),
    role_service: RoleService = Depends(get_role_service),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    """Return a paginated, filterable list of employees."""
    employees, total = service.list_employees(
        limit=limit,
        cursor=cursor,
        q=q,
        statuses=status,
        departments=department,
        locations=location,
        hire_types=hire_type,
        work_modes=work_mode,
        job_title=job_title,
        hire_date_from=hire_date_from,
        hire_date_to=hire_date_to,
        role_ids=role_id,
    )

    has_next = len(employees) > limit
    page = employees[:limit]
    next_cursor = (
        f"{page[-1].created_at.isoformat()}|{page[-1].id}"
        if has_next and page else None
    )

    roles_by_emp = role_service.get_roles_for_employees([e.id for e in page])

    return JSONResponse(
        content=ApiResponse(
            data=[_to_employee_response(e, roles_by_emp.get(e.id)).model_dump(mode="json") for e in page],
            meta=PaginationMeta(
                total=total,
                page_size=len(page),
                next_cursor=next_cursor,
                prev_cursor=None,
            ).model_dump(mode="json"),
            error=None,
        ).model_dump(mode="json"),
        headers={"X-Request-ID": request_id},
    )


@router.get("/check-email")
@_limiter.limit("60/minute")
def check_email(
    request: Request,
    email: str = Query(..., max_length=255),
    _user_id: str = Depends(require_permission("employees", "view_module")),
    service: EmployeeService = Depends(get_employee_service),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    """Return whether the given email is already registered."""
    existing = service.check_email_exists(email)
    return JSONResponse(
        content=ApiResponse(
            data={"available": not existing},
            meta=None,
            error=None,
        ).model_dump(mode="json"),
        headers={"X-Request-ID": request_id},
    )


@router.post("", response_model=ApiResponse[EmployeeResponse], status_code=201)
@_limiter.limit("30/minute")
def create_employee(
    body: CreateEmployeeRequest,
    request: Request,
    _user_id: str = Depends(require_permission("employees", "create_employee")),
    service: EmployeeService = Depends(get_employee_service),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    """Create a new employee record."""
    try:
        employee = service.create_employee(body)
    except ConflictError as exc:
        return JSONResponse(
            status_code=409,
            content=ApiResponse(
                data=None,
                meta=None,
                error=ApiError(
                    code="EMPLOYEE_EMAIL_CONFLICT",
                    message=str(exc),
                    request_id=request_id,
                ).model_dump(mode="json"),
            ).model_dump(mode="json"),
            headers={"X-Request-ID": request_id},
        )

    return JSONResponse(
        status_code=201,
        content=ApiResponse(
            data=_to_employee_response(employee).model_dump(mode="json"),
            meta=None,
            error=None,
        ).model_dump(mode="json"),
        headers={"X-Request-ID": request_id},
    )


@router.get("/offboarding", response_model=ApiResponse[list[OffboardingEmployeeResponse]])
@_limiter.limit("100/minute")
def list_offboarding(
    request: Request,
    limit: int = Query(default=20, ge=1, le=100),
    cursor: str | None = Query(default=None, max_length=500),
    _user_id: str = Depends(require_permission("offboarding", "view_module")),
    service: EmployeeService = Depends(get_employee_service),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    """Return employees currently in the Offboarding Hub (status=archiving)."""
    employees, total = service.list_offboarding(limit=limit, cursor=cursor)

    has_next = len(employees) > limit
    page = employees[:limit]
    next_cursor = (
        f"{page[-1].created_at.isoformat()}|{page[-1].id}"
        if has_next and page else None
    )

    data = []
    for emp in page:
        tasks = service.get_offboarding_tasks(emp.id)
        data.append(
            OffboardingEmployeeResponse(
                employee=_to_employee_response(emp),
                tasks=[_to_task_response(t) for t in tasks],
            ).model_dump(mode="json")
        )

    return JSONResponse(
        content=ApiResponse(
            data=data,
            meta=PaginationMeta(
                total=total,
                page_size=len(page),
                next_cursor=next_cursor,
                prev_cursor=None,
            ).model_dump(mode="json"),
            error=None,
        ).model_dump(mode="json"),
        headers={"X-Request-ID": request_id},
    )


@router.get("/{employee_id}", response_model=ApiResponse[EmployeeResponse])
@_limiter.limit("100/minute")
def get_employee(
    employee_id: str,
    request: Request,
    _user_id: str = Depends(require_permission("employees", "view_module")),
    service: EmployeeService = Depends(get_employee_service),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    """Return a single employee by ID."""
    try:
        employee = service.get_employee(employee_id)
    except ResourceNotFoundError as exc:
        return JSONResponse(
            status_code=404,
            content=ApiResponse(
                data=None,
                meta=None,
                error=ApiError(
                    code="EMPLOYEE_NOT_FOUND",
                    message=str(exc),
                    request_id=request_id,
                ).model_dump(mode="json"),
            ).model_dump(mode="json"),
            headers={"X-Request-ID": request_id},
        )

    return JSONResponse(
        content=ApiResponse(
            data=_to_employee_response(employee).model_dump(mode="json"),
            meta=None,
            error=None,
        ).model_dump(mode="json"),
        headers={"X-Request-ID": request_id},
    )


@router.patch("/{employee_id}", response_model=ApiResponse[EmployeeResponse])
@_limiter.limit("30/minute")
def update_employee(
    employee_id: str,
    body: UpdateEmployeeRequest,
    request: Request,
    _user_id: str = Depends(require_permission("employees", "edit_employee")),
    service: EmployeeService = Depends(get_employee_service),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    """Update an existing employee's fields."""
    try:
        employee = service.update_employee(employee_id, body)
    except ResourceNotFoundError as exc:
        return JSONResponse(
            status_code=404,
            content=ApiResponse(
                data=None,
                meta=None,
                error=ApiError(
                    code="EMPLOYEE_NOT_FOUND",
                    message=str(exc),
                    request_id=request_id,
                ).model_dump(mode="json"),
            ).model_dump(mode="json"),
            headers={"X-Request-ID": request_id},
        )

    return JSONResponse(
        content=ApiResponse(
            data=_to_employee_response(employee).model_dump(mode="json"),
            meta=None,
            error=None,
        ).model_dump(mode="json"),
        headers={"X-Request-ID": request_id},
    )


@router.delete("/{employee_id}", status_code=200)
@_limiter.limit("30/minute")
def archive_employee(
    employee_id: str,
    request: Request,
    _user_id: str = Depends(require_permission("employees", "archive_employee")),
    service: EmployeeService = Depends(get_employee_service),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    """Initiate the offboarding workflow for an employee (sets status to 'archiving')."""
    try:
        employee = service.archive_employee(employee_id)
    except ResourceNotFoundError as exc:
        return JSONResponse(
            status_code=404,
            content=ApiResponse(
                data=None,
                meta=None,
                error=ApiError(
                    code="EMPLOYEE_NOT_FOUND",
                    message=str(exc),
                    request_id=request_id,
                ).model_dump(mode="json"),
            ).model_dump(mode="json"),
            headers={"X-Request-ID": request_id},
        )

    return JSONResponse(
        content=ApiResponse(
            data=_to_employee_response(employee).model_dump(mode="json"),
            meta=None,
            error=None,
        ).model_dump(mode="json"),
        headers={"X-Request-ID": request_id},
    )


@router.get("/{employee_id}/roles", summary="List roles assigned to an employee")
@_limiter.limit("100/minute")
def get_employee_roles(
    employee_id: str,
    request: Request,
    _user_id: str = Depends(require_permission("employees", "view_module")),
    role_service: RoleService = Depends(get_role_service),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    """Return full role assignment objects for a specific employee.

    Each entry includes role_id, role_name, is_manager, and assigned_at.
    """
    assignments = role_service.get_employee_roles(employee_id)
    result = []
    for a in assignments:
        try:
            role = role_service.get_role(a.role_id)
        except ResourceNotFoundError:
            continue
        result.append({
            "role_id": a.role_id,
            "role_name": role.name,
            "is_manager": bool(a.is_manager),
            "assigned_at": a.assigned_at.isoformat() if a.assigned_at else None,
        })
    return JSONResponse(
        content=ApiResponse(
            data=result,
            meta=None,
            error=None,
        ).model_dump(mode="json"),
        headers={"X-Request-ID": request_id},
    )


@router.get(
    "/{employee_id}/offboarding-tasks",
    response_model=ApiResponse[list[OffboardingTaskResponse]],
)
@_limiter.limit("100/minute")
def get_offboarding_tasks(
    employee_id: str,
    request: Request,
    _user_id: str = Depends(require_permission("offboarding", "view_module")),
    service: EmployeeService = Depends(get_employee_service),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    """Return the offboarding task checklist for a specific employee."""
    try:
        tasks = service.get_offboarding_tasks(employee_id)
    except ResourceNotFoundError as exc:
        return JSONResponse(
            status_code=404,
            content=ApiResponse(
                data=None,
                meta=None,
                error=ApiError(
                    code="EMPLOYEE_NOT_FOUND",
                    message=str(exc),
                    request_id=request_id,
                ).model_dump(mode="json"),
            ).model_dump(mode="json"),
            headers={"X-Request-ID": request_id},
        )

    return JSONResponse(
        content=ApiResponse(
            data=[_to_task_response(t).model_dump(mode="json") for t in tasks],
            meta=None,
            error=None,
        ).model_dump(mode="json"),
        headers={"X-Request-ID": request_id},
    )


@router.post(
    "/{employee_id}/offboarding-tasks/{task_id}/complete",
    response_model=ApiResponse[OffboardingTaskResponse],
)
@_limiter.limit("30/minute")
def complete_offboarding_task(
    employee_id: str,
    task_id: str,
    request: Request,
    user_id: str = Depends(require_permission("offboarding", "complete_tasks")),
    service: EmployeeService = Depends(get_employee_service),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    """Sign off an offboarding task. Automatically archives the employee when all done."""
    try:
        task = service.complete_offboarding_task(task_id, completed_by=user_id)
    except ResourceNotFoundError as exc:
        return JSONResponse(
            status_code=404,
            content=ApiResponse(
                data=None,
                meta=None,
                error=ApiError(
                    code="TASK_NOT_FOUND",
                    message=str(exc),
                    request_id=request_id,
                ).model_dump(mode="json"),
            ).model_dump(mode="json"),
            headers={"X-Request-ID": request_id},
        )

    return JSONResponse(
        content=ApiResponse(
            data=_to_task_response(task).model_dump(mode="json"),
            meta=None,
            error=None,
        ).model_dump(mode="json"),
        headers={"X-Request-ID": request_id},
    )


@router.patch(
    "/{employee_id}/offboarding-tasks/{task_id}/reassign",
    response_model=ApiResponse[OffboardingTaskResponse],
)
@_limiter.limit("30/minute")
def reassign_offboarding_task(
    employee_id: str,
    task_id: str,
    body: ReassignTaskRequest,
    request: Request,
    _user_id: str = Depends(require_permission("offboarding", "reassign_tasks")),
    service: EmployeeService = Depends(get_employee_service),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    """Reassign an offboarding task to a different employee."""
    try:
        task = service.reassign_offboarding_task(task_id, assignee_id=body.assignee_id)
    except ResourceNotFoundError as exc:
        return JSONResponse(
            status_code=404,
            content=ApiResponse(
                data=None,
                meta=None,
                error=ApiError(
                    code="TASK_NOT_FOUND",
                    message=str(exc),
                    request_id=request_id,
                ).model_dump(mode="json"),
            ).model_dump(mode="json"),
            headers={"X-Request-ID": request_id},
        )

    return JSONResponse(
        content=ApiResponse(
            data=_to_task_response(task).model_dump(mode="json"),
            meta=None,
            error=None,
        ).model_dump(mode="json"),
        headers={"X-Request-ID": request_id},
    )
