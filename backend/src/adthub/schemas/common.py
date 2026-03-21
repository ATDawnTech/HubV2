"""Shared Pydantic response envelope types used across all API endpoints."""

from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class PaginationMeta(BaseModel):
    """Pagination metadata included on collection responses."""

    total: int
    page_size: int
    next_cursor: str | None
    prev_cursor: str | None


class ApiError(BaseModel):
    """Structured error payload included on all error responses."""

    code: str
    message: str
    request_id: str


class ApiResponse(BaseModel, Generic[T]):
    """Standard response envelope for all ADT Hub API endpoints.

    Exactly one of data or error is non-null on any given response.
    meta is non-null only on paginated collection responses.
    """

    data: T | None
    meta: PaginationMeta | None
    error: ApiError | None
