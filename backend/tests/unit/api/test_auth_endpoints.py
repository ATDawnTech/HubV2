"""Unit tests for auth API endpoints (/v1/auth/login, /callback, /token).

Uses TestClient with dependency overrides — no real database or HTTP calls.
"""

from unittest.mock import MagicMock, patch

import pytest
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient
from starlette.middleware.base import BaseHTTPMiddleware

from src.adthub.api.auth import router
from src.adthub.api.dependencies import get_db, get_request_id
from src.adthub.exceptions import AuthenticationError


# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------

class _RequestIDMiddleware(BaseHTTPMiddleware):
    """Injects request_id into request.state for test compatibility."""

    async def dispatch(self, request: Request, call_next):
        request.state.request_id = "test-req-id"
        return await call_next(request)


def _make_app(mock_auth_service: MagicMock | None = None) -> FastAPI:
    """Create a minimal FastAPI app with auth routes and mocked dependencies."""
    app = FastAPI()
    app.add_middleware(_RequestIDMiddleware)
    app.include_router(router)

    # Override DB dependency
    app.dependency_overrides[get_db] = lambda: MagicMock()

    # Override auth service via the router's local dependency
    if mock_auth_service is not None:
        from src.adthub.api.auth import _get_auth_service
        app.dependency_overrides[_get_auth_service] = lambda: mock_auth_service

    return app


# ---------------------------------------------------------------------------
# GET /v1/auth/login
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestLoginEndpoint:
    """Tests for GET /v1/auth/login."""

    def test_login_returns_302_when_sso_configured(self) -> None:
        """GET /v1/auth/login redirects to Microsoft when SSO is configured."""
        mock_svc = MagicMock()
        mock_svc.build_auth_url.return_value = "https://login.microsoftonline.com/tenant/oauth2/v2.0/authorize?params"

        with patch("src.adthub.api.auth.settings") as mock_settings:
            mock_settings.azure_client_id = "client-123"
            mock_settings.azure_tenant_id = "tenant-123"
            client = TestClient(_make_app(mock_svc), follow_redirects=False)
            resp = client.get("/v1/auth/login")

        assert resp.status_code == 302
        assert "login.microsoftonline.com" in resp.headers["location"]

    def test_login_returns_503_when_sso_not_configured(self) -> None:
        """GET /v1/auth/login returns 503 when azure_client_id or azure_tenant_id is empty."""
        mock_svc = MagicMock()

        with patch("src.adthub.api.auth.settings") as mock_settings:
            mock_settings.azure_client_id = ""
            mock_settings.azure_tenant_id = ""
            client = TestClient(_make_app(mock_svc))
            resp = client.get("/v1/auth/login")

        assert resp.status_code == 503
        assert "SSO is not configured" in resp.json()["detail"]

    def test_login_returns_503_when_only_client_id_missing(self) -> None:
        """GET /v1/auth/login returns 503 when only azure_client_id is empty."""
        mock_svc = MagicMock()

        with patch("src.adthub.api.auth.settings") as mock_settings:
            mock_settings.azure_client_id = ""
            mock_settings.azure_tenant_id = "tenant-123"
            client = TestClient(_make_app(mock_svc))
            resp = client.get("/v1/auth/login")

        assert resp.status_code == 503

    def test_login_returns_503_when_only_tenant_id_missing(self) -> None:
        """GET /v1/auth/login returns 503 when only azure_tenant_id is empty."""
        mock_svc = MagicMock()

        with patch("src.adthub.api.auth.settings") as mock_settings:
            mock_settings.azure_client_id = "client-123"
            mock_settings.azure_tenant_id = ""
            client = TestClient(_make_app(mock_svc))
            resp = client.get("/v1/auth/login")

        assert resp.status_code == 503


# ---------------------------------------------------------------------------
# GET /v1/auth/callback
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestCallbackEndpoint:
    """Tests for GET /v1/auth/callback."""

    def test_callback_redirects_to_frontend_with_otc(self) -> None:
        """GET /v1/auth/callback redirects to frontend with the one-time code."""
        mock_svc = MagicMock()
        mock_svc.handle_callback.return_value = "otc-secret-code"

        with patch("src.adthub.api.auth.settings") as mock_settings:
            mock_settings.frontend_url = "https://hub.example.com"
            mock_settings.azure_client_id = "c"
            mock_settings.azure_tenant_id = "t"
            client = TestClient(_make_app(mock_svc), follow_redirects=False)
            resp = client.get("/v1/auth/callback", params={"code": "auth-code", "state": "csrf-state"})

        assert resp.status_code == 302
        location = resp.headers["location"]
        assert "hub.example.com/auth/callback" in location
        assert "code=otc-secret-code" in location

    def test_callback_passes_code_and_state_to_service(self) -> None:
        """GET /v1/auth/callback passes query params to handle_callback."""
        mock_svc = MagicMock()
        mock_svc.handle_callback.return_value = "otc"

        with patch("src.adthub.api.auth.settings") as mock_settings:
            mock_settings.frontend_url = "https://hub.example.com"
            mock_settings.azure_client_id = "c"
            mock_settings.azure_tenant_id = "t"
            client = TestClient(_make_app(mock_svc), follow_redirects=False)
            client.get("/v1/auth/callback", params={"code": "my-auth-code", "state": "my-state"})

        mock_svc.handle_callback.assert_called_once_with(code="my-auth-code", state="my-state")

    def test_callback_returns_400_on_auth_error(self) -> None:
        """GET /v1/auth/callback returns 400 when handle_callback raises AuthenticationError."""
        mock_svc = MagicMock()
        mock_svc.handle_callback.side_effect = AuthenticationError("Invalid state")

        with patch("src.adthub.api.auth.settings") as mock_settings:
            mock_settings.azure_client_id = "c"
            mock_settings.azure_tenant_id = "t"
            client = TestClient(_make_app(mock_svc))
            resp = client.get("/v1/auth/callback", params={"code": "c", "state": "s"})

        assert resp.status_code == 400
        assert "Authentication failed" in resp.json()["detail"]

    def test_callback_returns_422_without_required_params(self) -> None:
        """GET /v1/auth/callback returns 422 when code or state is missing."""
        mock_svc = MagicMock()
        client = TestClient(_make_app(mock_svc))
        resp = client.get("/v1/auth/callback")  # no code or state
        assert resp.status_code == 422

    def test_callback_strips_trailing_slash_from_frontend_url(self) -> None:
        """The redirect URL strips trailing slash from frontend_url."""
        mock_svc = MagicMock()
        mock_svc.handle_callback.return_value = "otc-123"

        with patch("src.adthub.api.auth.settings") as mock_settings:
            mock_settings.frontend_url = "https://hub.example.com/"
            mock_settings.azure_client_id = "c"
            mock_settings.azure_tenant_id = "t"
            client = TestClient(_make_app(mock_svc), follow_redirects=False)
            resp = client.get("/v1/auth/callback", params={"code": "c", "state": "s"})

        location = resp.headers["location"]
        assert "hub.example.com//auth" not in location  # no double slash
        assert "hub.example.com/auth/callback" in location


# ---------------------------------------------------------------------------
# POST /v1/auth/token
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestTokenEndpoint:
    """Tests for POST /v1/auth/token."""

    def test_token_returns_jwt_in_standard_envelope(self) -> None:
        """POST /v1/auth/token returns {data, meta, error} envelope with JWT."""
        mock_svc = MagicMock()
        mock_svc.exchange_one_time_code.return_value = "jwt-token-here"

        client = TestClient(_make_app(mock_svc))
        resp = client.post("/v1/auth/token", json={"code": "otc-123"})

        assert resp.status_code == 200
        body = resp.json()
        assert body["data"]["token"] == "jwt-token-here"
        assert body["data"]["token_type"] == "Bearer"
        assert body["data"]["expires_in"] == 28800
        assert body["meta"] is None
        assert body["error"] is None

    def test_token_returns_400_on_invalid_code(self) -> None:
        """POST /v1/auth/token returns 400 when the one-time code is invalid."""
        mock_svc = MagicMock()
        mock_svc.exchange_one_time_code.side_effect = AuthenticationError("Invalid or expired code.")

        client = TestClient(_make_app(mock_svc))
        resp = client.post("/v1/auth/token", json={"code": "bad-code"})

        assert resp.status_code == 400
        assert "Invalid or expired code" in resp.json()["detail"]

    def test_token_returns_422_without_body(self) -> None:
        """POST /v1/auth/token returns 422 when request body is missing."""
        client = TestClient(_make_app(MagicMock()))
        resp = client.post("/v1/auth/token")
        assert resp.status_code == 422

    def test_token_returns_422_with_empty_code(self) -> None:
        """POST /v1/auth/token returns 422 when code field is missing from body."""
        client = TestClient(_make_app(MagicMock()))
        resp = client.post("/v1/auth/token", json={})
        assert resp.status_code == 422

    def test_token_calls_service_with_code(self) -> None:
        """POST /v1/auth/token passes the code from the request body to the service."""
        mock_svc = MagicMock()
        mock_svc.exchange_one_time_code.return_value = "jwt"

        client = TestClient(_make_app(mock_svc))
        client.post("/v1/auth/token", json={"code": "my-otc-code"})

        mock_svc.exchange_one_time_code.assert_called_once_with("my-otc-code")
