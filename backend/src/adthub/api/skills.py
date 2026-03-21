"""Skills Management API — Epic 3.2.

Endpoints:
  GET  /v1/admin/skills              List skills (paginated, fuzzy search, sort)
  POST /v1/admin/skills              Create a skill
  DELETE /v1/admin/skills/{id}       Soft-delete a single skill
  POST /v1/admin/skills/bulk-delete  Soft-delete multiple skills
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address

from ..exceptions import ConflictError, ResourceNotFoundError
from ..schemas.common import ApiResponse
from ..schemas.skills import (
    BulkDeleteSkillsRequest,
    BulkDeleteSkillsResponse,
    BulkRecategorizeRequest,
    BulkRecategorizeResponse,
    CreateSkillRequest,
    SkillResponse,
)
from ..services.skill_service import SkillService
from .dependencies import (
    get_current_user_id,
    get_request_id,
    get_skill_service,
    require_permission,
)

router = APIRouter(prefix="/v1/admin/skills", tags=["skills"])
_limiter = Limiter(key_func=get_remote_address)


@router.get("/categories", response_model=ApiResponse[list[str]])
@_limiter.limit("100/minute")
def list_skill_categories(
    request: Request,
    _user_id: str = Depends(get_current_user_id),
    service: SkillService = Depends(get_skill_service),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    """Return all distinct skill categories in alphabetical order."""
    categories = service.list_categories()
    return JSONResponse(
        content=ApiResponse(data=categories, meta=None, error=None).model_dump(mode="json"),
        headers={"X-Request-ID": request_id},
    )


@router.get("", response_model=ApiResponse[list[SkillResponse]])
@_limiter.limit("100/minute")
def list_skills(
    request: Request,
    search: str | None = Query(None, description="Fuzzy name filter"),
    sort_by: str = Query("created_at", pattern="^(name|created_at|usage_count)$"),
    sort: str = Query("desc", pattern="^(asc|desc)$"),
    limit: int = Query(100, ge=1, le=500),
    cursor: str | None = Query(None, max_length=500, description="Cursor token from previous page"),
    category: str | None = Query(None, description="Exact category filter"),
    _user_id: str = Depends(require_permission("admin", "manage_skills")),
    service: SkillService = Depends(get_skill_service),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    """Return a paginated list of skills with server-side sort, filter, and cursor pagination."""
    skills, meta = service.list_skills(
        search=search,
        sort_by=sort_by,
        sort_dir=sort,
        limit=limit,
        cursor=cursor,
        category=category,
    )
    return JSONResponse(
        content=ApiResponse(data=skills, meta=meta, error=None).model_dump(mode="json"),
        headers={"X-Request-ID": request_id},
    )


@router.post("", response_model=ApiResponse[SkillResponse], status_code=status.HTTP_201_CREATED)
@_limiter.limit("30/minute")
def create_skill(
    request: Request,
    body: CreateSkillRequest,
    _user_id: str = Depends(require_permission("admin", "manage_skills")),
    service: SkillService = Depends(get_skill_service),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    """Create a new skill in the global skill library.

    Args:
        request: FastAPI Request object (required by slowapi).
        body: Validated create payload (name, optional category).
        _user_id: Authenticated user ID (injected).
        service: SkillService (injected).
        request_id: Request tracking ID (injected).

    Returns:
        ApiResponse containing the newly created skill.

    Raises:
        HTTPException 409: If a skill with the same name already exists.
    """
    try:
        skill = service.create_skill(body, created_by=None)
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content=ApiResponse(data=skill, meta=None, error=None).model_dump(mode="json"),
            headers={"X-Request-ID": request_id},
        )
    except ConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.post("/bulk-recategorize", response_model=ApiResponse[BulkRecategorizeResponse])
@_limiter.limit("30/minute")
def bulk_recategorize_skills(
    request: Request,
    body: BulkRecategorizeRequest,
    _user_id: str = Depends(require_permission("admin", "manage_skills")),
    service: SkillService = Depends(get_skill_service),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    """Reassign all skills from one category to another (or uncategorize them)."""
    result = service.bulk_recategorize(body.from_category, body.to_category)
    return JSONResponse(
        content=ApiResponse(data=result, meta=None, error=None).model_dump(mode="json"),
        headers={"X-Request-ID": request_id},
    )


@router.post("/bulk-delete", response_model=ApiResponse[BulkDeleteSkillsResponse])
@_limiter.limit("30/minute")
def bulk_delete_skills(
    request: Request,
    body: BulkDeleteSkillsRequest,
    _user_id: str = Depends(require_permission("admin", "manage_skills")),
    service: SkillService = Depends(get_skill_service),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    """Soft-delete multiple skills in a single request.

    Skills not found (already deleted or non-existent) are reported in
    skipped_ids rather than causing the entire request to fail.

    Args:
        request: FastAPI Request object (required by slowapi).
        body: List of skill IDs to delete.
        _user_id: Authenticated user ID (injected).
        service: SkillService (injected).
        request_id: Request tracking ID (injected).

    Returns:
        ApiResponse containing a summary of deleted vs. skipped counts.
    """
    result = service.bulk_delete_skills(body.ids)
    return JSONResponse(
        content=ApiResponse(data=result, meta=None, error=None).model_dump(mode="json"),
        headers={"X-Request-ID": request_id},
    )


@router.delete("/{skill_id}", response_model=ApiResponse[None])
@_limiter.limit("30/minute")
def delete_skill(
    request: Request,
    skill_id: str,
    _user_id: str = Depends(require_permission("admin", "manage_skills")),
    service: SkillService = Depends(get_skill_service),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    """Soft-delete a single skill by ID.

    Args:
        request: FastAPI Request object (required by slowapi).
        skill_id: The skills_catalog primary key to delete.
        _user_id: Authenticated user ID (injected).
        service: SkillService (injected).
        request_id: Request tracking ID (injected).

    Returns:
        Empty ApiResponse on success.

    Raises:
        HTTPException 404: If the skill does not exist or is already deleted.
    """
    try:
        service.delete_skill(skill_id)
        return JSONResponse(
            content=ApiResponse(data=None, meta=None, error=None).model_dump(mode="json"),
            headers={"X-Request-ID": request_id},
        )
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
