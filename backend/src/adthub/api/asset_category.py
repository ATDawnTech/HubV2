"""Route handlers for Asset Category Management.

GET /v1/asset-categories - List all asset categories
POST /v1/asset-categories - Create asset category
GET /v1/asset-categories/{asset_category_id} - Get asset category by ID
PATCH /v1/asset-categories/{asset_category_id} - Update asset category by ID
DELETE /v1/asset-categories/{asset_category_id} - Delete asset category by ID

"""

from fastapi import APIRouter, Depends, HTTPException, status, Request, Query, Response
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from .dependencies import get_db, get_request_id, get_asset_category_service
from ..db.models.assets import AssetCategory
from ..exceptions import ConflictError, ResourceNotFoundError
from ..schemas.assets import AssetCategoryResponse, CreateAssetCategoryRequest, UpdateAssetCategoryRequest
from ..schemas.common import ApiError, ApiResponse, PaginationMeta
from ..services.assets import AssetCategoryService

router = APIRouter(prefix="/v1/asset-categories", tags=["asset-categories"])


def _error(code: str, message: str, request_id: str) -> dict:
    return ApiResponse(
        data=None,
        meta=None,
        error=ApiError(code=code, message=message, request_id=request_id),
    ).model_dump(mode="json")


@router.get("/", response_model=ApiResponse[list[AssetCategoryResponse]])
def list_asset_categories(
    response: Response,
    limit: int = Query(default=20, ge=1, le=100),
    cursor: str | None = Query(default=None),
    service: AssetCategoryService = Depends(get_asset_category_service),
    request_id: str = Depends(get_request_id),
):
    """List asset categories with cursor-based pagination."""
    response.headers["X-Request-ID"] = request_id
    rows, total, next_cursor = service.get_all(limit=limit, cursor=cursor)
    data = [AssetCategoryResponse.model_validate(r) for r in rows]
    
    meta = PaginationMeta(
        total=total,
        page_size=limit,
        next_cursor=next_cursor,
        prev_cursor=None,
    )
    return ApiResponse(data=data, meta=meta, error=None)


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_asset_category(
    body: CreateAssetCategoryRequest,
    service: AssetCategoryService = Depends(get_asset_category_service),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    """Create a new asset category."""
    try:
        row = service.create(body.dict())
        data = AssetCategoryResponse.model_validate(row)
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content=ApiResponse(data=data, meta=None, error=None).model_dump(mode="json"),
            headers={"X-Request-ID": request_id},
        )
    except ConflictError as exc:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content=_error("ASSET_CATEGORY_CONFLICT", str(exc), request_id),
            headers={"X-Request-ID": request_id},
        )


@router.get("/{asset_category_id}")
async def get_asset_category(
    asset_category_id: str,
    service: AssetCategoryService = Depends(get_asset_category_service),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    """Get an asset category by ID."""
    category = service.get_by_id(asset_category_id)
    if not category:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=_error("ASSET_CATEGORY_NOT_FOUND", "Asset category not found.", request_id),
            headers={"X-Request-ID": request_id},
        )
    data = AssetCategoryResponse.model_validate(category)
    return JSONResponse(
        content=ApiResponse(data=data, meta=None, error=None).model_dump(mode="json"),
        headers={"X-Request-ID": request_id},
    )


@router.patch("/{asset_category_id}")
async def update_asset_category(
    asset_category_id: str,
    body: UpdateAssetCategoryRequest,
    service: AssetCategoryService = Depends(get_asset_category_service),
    request_id: str = Depends(get_request_id),
) -> JSONResponse:
    """Update an asset category by ID."""
    category = service.get_by_id(asset_category_id)
    if not category:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=_error("ASSET_CATEGORY_NOT_FOUND", "Asset category not found.", request_id),
            headers={"X-Request-ID": request_id},
        )

    try:
        update_data = body.dict(exclude_unset=True)
        row = service.update(category, update_data)
        data = AssetCategoryResponse.model_validate(row)
        return JSONResponse(
            content=ApiResponse(data=data, meta=None, error=None).model_dump(mode="json"),
            headers={"X-Request-ID": request_id},
        )
    except ConflictError as exc:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content=_error("ASSET_CATEGORY_CONFLICT", str(exc), request_id),
            headers={"X-Request-ID": request_id},
        )


@router.delete("/{asset_category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_asset_category(
    asset_category_id: str,
    service: AssetCategoryService = Depends(get_asset_category_service),
    request_id: str = Depends(get_request_id),
) -> Response:
    """Delete an asset category by ID (soft delete)."""
    category = service.get_by_id(asset_category_id)
    if not category:
        return Response(status_code=status.HTTP_204_NO_CONTENT, headers={"X-Request-ID": request_id})

    service.delete(category)
    return Response(status_code=status.HTTP_204_NO_CONTENT, headers={"X-Request-ID": request_id})