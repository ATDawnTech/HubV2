"""Unit tests for FastAPI dependency functions in api/dependencies.py.

Uses TestClient with a minimal in-process FastAPI app and dependency overrides
so no real database or network is needed.

Coverage:
  require_permission — granted, denied, detail message, skip_permission_checks bypass
  get_current_user_id — valid token, no token, invalid JWT, expired JWT, archived employee
"""

from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

import jwt
import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from src.adthub.api.dependencies import (
    get_current_user_id,
    get_db,
    get_role_service,
    require_permission,
)

# ---------------------------------------------------------------------------
# Shared test data
# ---------------------------------------------------------------------------

_JWT_SECRET = "test-secret-for-unit-tests-only-x"  # 32+ bytes — avoids PyJWT key-length warnings
_EMPLOYEE_ID = "emp_test_abc123"


def _mint_token(
    sub: str = _EMPLOYEE_ID,
    secret: str = _JWT_SECRET,
    expired: bool = False,
) -> str:
    """Return a signed HS256 JWT for use in tests."""
    now = datetime.now(timezone.utc)
    exp = now - timedelta(hours=1) if expired else now + timedelta(hours=1)
    return jwt.encode({"sub": sub, "exp": exp}, secret, algorithm="HS256")


def _active_employee(emp_id: str = _EMPLOYEE_ID) -> MagicMock:
    emp = MagicMock()
    emp.id = emp_id
    emp.status = "active"
    return emp


def _archived_employee(emp_id: str = _EMPLOYEE_ID) -> MagicMock:
    emp = MagicMock()
    emp.id = emp_id
    emp.status = "archived"
    return emp


# ---------------------------------------------------------------------------
# require_permission
# ---------------------------------------------------------------------------

def _permission_app(mock_role_service: MagicMock, module: str = "employees", action: str = "view_module") -> FastAPI:
    """Minimal app with a single route gated by require_permission."""
    app = FastAPI()

    @app.get("/protected")
    def _route(_uid: str = Depends(require_permission(module, action))):
        return {"ok": True}

    app.dependency_overrides[get_current_user_id] = lambda: _EMPLOYEE_ID
    app.dependency_overrides[get_role_service] = lambda: mock_role_service
    return app


@pytest.mark.unit
def test_require_permission_returns_200_when_granted() -> None:
    """require_permission passes through when check_permission returns True."""
    svc = MagicMock()
    svc.check_permission.return_value = True

    resp = TestClient(_permission_app(svc)).get("/protected")

    assert resp.status_code == 200
    svc.check_permission.assert_called_once_with(_EMPLOYEE_ID, "employees", "view_module")


@pytest.mark.unit
def test_require_permission_returns_403_when_denied() -> None:
    """require_permission raises HTTP 403 when check_permission returns False."""
    svc = MagicMock()
    svc.check_permission.return_value = False

    resp = TestClient(_permission_app(svc)).get("/protected")

    assert resp.status_code == 403


@pytest.mark.unit
def test_require_permission_403_detail_names_the_denied_permission() -> None:
    """The 403 response body identifies the exact (module, action) that was denied."""
    svc = MagicMock()
    svc.check_permission.return_value = False

    resp = TestClient(_permission_app(svc, module="admin", action="manage_roles")).get("/protected")

    assert resp.status_code == 403
    assert "admin.manage_roles" in resp.json()["detail"]


@pytest.mark.unit
def test_require_permission_passes_correct_args_to_check_permission() -> None:
    """require_permission calls check_permission with the user_id, module, and action it was configured with."""
    svc = MagicMock()
    svc.check_permission.return_value = True

    TestClient(_permission_app(svc, module="admin", action="manage_skills")).get("/protected")

    svc.check_permission.assert_called_once_with(_EMPLOYEE_ID, "admin", "manage_skills")


@pytest.mark.unit
def test_require_permission_skips_check_when_flag_enabled(monkeypatch: pytest.MonkeyPatch) -> None:
    """When skip_permission_checks=True, check_permission is never called and the request succeeds."""
    from src.adthub.config import settings
    monkeypatch.setattr(settings, "skip_permission_checks", True)

    svc = MagicMock()
    svc.check_permission.return_value = False  # would deny if consulted

    resp = TestClient(_permission_app(svc)).get("/protected")

    assert resp.status_code == 200
    svc.check_permission.assert_not_called()


# ---------------------------------------------------------------------------
# get_current_user_id
# ---------------------------------------------------------------------------

def _auth_app(mock_repo: MagicMock, monkeypatch: pytest.MonkeyPatch) -> FastAPI:
    """Minimal app wired to get_current_user_id with a mocked employee repo and JWT secret."""
    import src.adthub.api.dependencies as _deps

    monkeypatch.setattr(_deps, "EmployeeRepository", lambda _session: mock_repo)

    from src.adthub.config import settings
    monkeypatch.setattr(settings, "jwt_secret", _JWT_SECRET)

    app = FastAPI()

    @app.get("/me")
    def _me(user_id: str = Depends(get_current_user_id)) -> dict:
        return {"user_id": user_id}

    app.dependency_overrides[get_db] = lambda: MagicMock()
    return app


@pytest.mark.unit
def test_get_current_user_id_returns_employee_id_for_valid_token(monkeypatch: pytest.MonkeyPatch) -> None:
    """get_current_user_id extracts and returns the sub claim from a valid JWT."""
    mock_repo = MagicMock()
    mock_repo.find_by_id.return_value = _active_employee()

    token = _mint_token()
    resp = TestClient(_auth_app(mock_repo, monkeypatch)).get(
        "/me", headers={"Authorization": f"Bearer {token}"}
    )

    assert resp.status_code == 200
    assert resp.json()["user_id"] == _EMPLOYEE_ID


@pytest.mark.unit
def test_get_current_user_id_returns_403_when_no_token_provided(monkeypatch: pytest.MonkeyPatch) -> None:
    """Requests without a bearer token are rejected by HTTPBearer with 403."""
    mock_repo = MagicMock()
    mock_repo.find_by_id.return_value = _active_employee()

    resp = TestClient(_auth_app(mock_repo, monkeypatch), raise_server_exceptions=False).get("/me")

    assert resp.status_code == 403


@pytest.mark.unit
def test_get_current_user_id_returns_401_for_invalid_jwt(monkeypatch: pytest.MonkeyPatch) -> None:
    """A token signed with the wrong secret is rejected with 401."""
    mock_repo = MagicMock()
    mock_repo.find_by_id.return_value = _active_employee()

    bad_token = _mint_token(secret="wrong-secret-but-long-enough-for-sha256")
    resp = TestClient(_auth_app(mock_repo, monkeypatch)).get(
        "/me", headers={"Authorization": f"Bearer {bad_token}"}
    )

    assert resp.status_code == 401


@pytest.mark.unit
def test_get_current_user_id_returns_401_for_expired_token(monkeypatch: pytest.MonkeyPatch) -> None:
    """An expired JWT is rejected with 401."""
    mock_repo = MagicMock()
    mock_repo.find_by_id.return_value = _active_employee()

    expired_token = _mint_token(expired=True)
    resp = TestClient(_auth_app(mock_repo, monkeypatch)).get(
        "/me", headers={"Authorization": f"Bearer {expired_token}"}
    )

    assert resp.status_code == 401


@pytest.mark.unit
def test_get_current_user_id_returns_401_for_archived_employee(monkeypatch: pytest.MonkeyPatch) -> None:
    """A valid token belonging to an archived employee is rejected with 401."""
    mock_repo = MagicMock()
    mock_repo.find_by_id.return_value = _archived_employee()

    token = _mint_token()
    resp = TestClient(_auth_app(mock_repo, monkeypatch)).get(
        "/me", headers={"Authorization": f"Bearer {token}"}
    )

    assert resp.status_code == 401


@pytest.mark.unit
def test_get_current_user_id_returns_401_for_unknown_employee(monkeypatch: pytest.MonkeyPatch) -> None:
    """A valid token whose employee_id no longer exists in the DB is rejected with 401."""
    mock_repo = MagicMock()
    mock_repo.find_by_id.return_value = None

    token = _mint_token()
    resp = TestClient(_auth_app(mock_repo, monkeypatch)).get(
        "/me", headers={"Authorization": f"Bearer {token}"}
    )

    assert resp.status_code == 401
