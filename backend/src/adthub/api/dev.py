"""Dev-only endpoints for local development convenience.

This router is only registered when environment == 'local'. It is never
available in dev, staging, or prod builds. Do not add business logic here.
"""

import time

import jwt
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from ..config import settings

router = APIRouter(prefix="/v1/dev", tags=["dev"])

_TOKEN_TTL_SECONDS = 60 * 60 * 8  # 8 hours — a full work day


class DevTokenResponse(BaseModel):
    """Response body for the dev token endpoint."""

    token: str
    employee_id: str
    expires_in: int


@router.get(
    "/token",
    response_model=DevTokenResponse,
    summary="Generate a dev JWT (local env only)",
)
def get_dev_token(employee_id: str = "emp_dev_local") -> DevTokenResponse:
    """Issue a signed JWT for local development use.

    Generates a short-lived HS256 JWT whose 'sub' claim is the provided
    employee_id. Copy the returned token into Authorization: Bearer <token>
    when calling protected endpoints locally.

    This endpoint is **only** available when ENVIRONMENT=local and will return
    404 in any other environment.

    Args:
        employee_id: The employee ID to embed in the token's 'sub' claim.
                     Defaults to 'emp_dev_local'.

    Returns:
        A DevTokenResponse containing the token, employee_id, and TTL.

    Raises:
        HTTPException 404: If this endpoint is called outside a local environment.
    """
    if settings.environment != "local":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    now = int(time.time())
    payload = {
        "sub": employee_id,
        "iat": now,
        "exp": now + _TOKEN_TTL_SECONDS,
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm="HS256")
    return DevTokenResponse(
        token=token,
        employee_id=employee_id,
        expires_in=_TOKEN_TTL_SECONDS,
    )
