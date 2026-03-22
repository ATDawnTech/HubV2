"""Route handlers for Asset Management.

GET /v1/assets - List all assets
POST /v1/assets - Create asset
GET /v1/assets/{asset_id} - Get asset by ID
PATCH /v1/assets/{asset_id} - Update asset by ID
DELETE /v1/assets/{asset_id} - Delete asset by ID

"""

from typing import Generic, TypeVar
from pydantic import BaseModel, Field
from datetime import date, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import JSONResponse, Response


from .dependencies import get_db, get_request_id, get_asset_service, get_asset_category_service
from ..db.models.assets import Asset
from ..schemas.assets import AssetResponse, CreateAssetRequest, UpdateAssetRequest
from ..schemas.common import ApiResponse, PaginationMeta
from ..services.assets import AssetService, AssetCategoryService


router = APIRouter(prefix="/v1/assets", tags=["Assets"])

@router.get("/", response_model=ApiResponse[list[AssetResponse]])
def list_assets(
    response: Response,
    limit: int = Query(default=20, ge=1, le=100),
    cursor: str | None = Query(default=None),
    service: AssetService = Depends(get_asset_service),
    request_id: str = Depends(get_request_id),
):
    """List assets with cursor-based pagination."""
    response.headers["X-Request-ID"] = request_id
    assets, total, next_cursor = service.get_all(limit=limit, cursor=cursor)
    
    data = [AssetResponse.model_validate(e) for e in assets]
    
    meta = PaginationMeta(
        total=total,
        page_size=limit,
        next_cursor=next_cursor,
        prev_cursor=None,  # Simple forward-only cursor for now
    )
    
    return ApiResponse(data=data, meta=meta, error=None)


@router.get("/next-tag")
def get_next_asset_tag(
    location: str = Query(..., min_length=1),
    category_id: str = Query(..., min_length=1),
    service: AssetService = Depends(get_asset_service),
    category_service: AssetCategoryService = Depends(get_asset_category_service),
):
    """Generate the next asset tag for a given location and category."""
    category = category_service.get_by_id(category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    code = category.code or category.name.upper()
    next_tag = service.generate_next_tag(location, code)
    return {"data": {"asset_tag": next_tag}}


@router.post("/", response_model=AssetResponse)
async def create_asset(
    request: CreateAssetRequest,
    service: AssetService = Depends(get_asset_service),
):
    """Create a new asset."""
    return service.create(request.model_dump())

@router.patch("/{asset_id}", response_model=AssetResponse)
async def update_asset(
    asset_id: str,
    request: UpdateAssetRequest,
    service: AssetService = Depends(get_asset_service),
):
    """Update asset by ID."""
    asset = service.get_by_id(asset_id)
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
    return service.update(asset, request.model_dump(exclude_unset=True))

@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_asset(
    asset_id: str,
    service: AssetService = Depends(get_asset_service),
):
    """Delete an asset."""
    asset = service.get_by_id(asset_id)
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
    
    service.delete(asset)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


