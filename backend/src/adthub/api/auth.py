"""Authentication endpoints — Microsoft Entra SSO.

GET  /v1/auth/login    — Redirect user to Microsoft login
GET  /v1/auth/callback — Receive code from Microsoft, issue one-time code
POST /v1/auth/token    — Exchange one-time code for app JWT
"""

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from ..config import settings
from ..exceptions import AuthenticationError
from ..services.auth_service import AuthService
from .dependencies import get_db, get_request_id

limiter = Limiter(key_func=get_remote_address)

logger = structlog.get_logger()

router = APIRouter(prefix="/v1/auth", tags=["auth"])


def _get_auth_service(session: Session = Depends(get_db)) -> AuthService:
    return AuthService(session)


class TokenRequest(BaseModel):
    code: str


class TokenResponse(BaseModel):
    token: str
    token_type: str = "Bearer"
    expires_in: int = 28800  # 8 hours in seconds


@router.get("/login")
@limiter.limit("5/minute")
def login(
    request: Request,
    auth_service: AuthService = Depends(_get_auth_service),
    request_id: str = Depends(get_request_id),
):
    """Redirect the user to Microsoft Entra for authentication.

    Generates a CSRF state token, persists it, and redirects the browser
    to the Microsoft authorization endpoint.
    """
    if not settings.azure_client_id or not settings.azure_tenant_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="SSO is not configured.",
        )

    auth_url = auth_service.build_auth_url()
    logger.info("SSO login initiated.", request_id=request_id)
    return RedirectResponse(url=auth_url, status_code=302)


@router.get("/callback")
@limiter.limit("5/minute")
def callback(
    request: Request,
    code: str,
    state: str,
    auth_service: AuthService = Depends(_get_auth_service),
    request_id: str = Depends(get_request_id),
):
    """Handle the redirect back from Microsoft after the user authenticates.

    Validates the CSRF state, exchanges the authorization code for an ID token,
    provisions the employee if this is their first login, and redirects the
    browser to the frontend with a short-lived one-time code.
    """
    try:
        otc = auth_service.handle_callback(code=code, state=state)
    except AuthenticationError as exc:
        logger.warning(
            "SSO callback failed.",
            error=str(exc),
            request_id=request_id,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authentication failed. Please try again.",
        )

    return RedirectResponse(
        url=f"{settings.frontend_url.rstrip('/')}/auth/callback?code={otc}",
        status_code=302,
    )


@router.post("/token")
@limiter.limit("5/minute")
def token(
    request: Request,
    body: TokenRequest,
    auth_service: AuthService = Depends(_get_auth_service),
    request_id: str = Depends(get_request_id),
):
    """Exchange a one-time code for an 8-hour JWT.

    The one-time code is issued by /v1/auth/callback and passed to the
    frontend via redirect. It is single-use and expires after 5 minutes.
    """
    try:
        jwt_token = auth_service.exchange_one_time_code(body.code)
    except AuthenticationError:
        logger.warning("One-time code exchange failed.", request_id=request_id)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired code.",
        )

    return {"data": TokenResponse(token=jwt_token).model_dump(), "meta": None, "error": None}
