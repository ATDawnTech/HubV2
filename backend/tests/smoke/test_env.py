"""Smoke tests for deployed environments.

Runs after each deployment to verify the service is alive and its critical
dependencies are reachable. These are not functional tests — they only confirm
the deployment succeeded and the app is routing correctly.

Requires:
    SMOKE_TEST_BASE_URL  — base URL of the deployed API, no trailing slash
                           e.g. https://api.hub-dev.atdawntech.com

Run with:
    pytest backend/tests/smoke/test_env.py -v --noconftest
"""

import os

import pytest
import requests

BASE_URL = os.environ.get("SMOKE_TEST_BASE_URL", "").rstrip("/")


@pytest.fixture(scope="module")
def base_url() -> str:
    if not BASE_URL:
        pytest.fail("SMOKE_TEST_BASE_URL environment variable is not set.")
    return BASE_URL


def test_health_returns_200(base_url: str) -> None:
    """GET /health responds 200 and reports all checks as ok."""
    resp = requests.get(f"{base_url}/health", timeout=10)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    body = resp.json()
    assert body.get("status") == "healthy", f"Service unhealthy: {body}"
    assert body.get("checks", {}).get("database") == "ok", f"Database check failed: {body}"


def test_health_includes_environment(base_url: str) -> None:
    """GET /health response body includes an environment field."""
    resp = requests.get(f"{base_url}/health", timeout=10)
    assert resp.status_code == 200
    assert "environment" in resp.json(), "Missing 'environment' field in health response"


def test_unauthenticated_employees_returns_401(base_url: str) -> None:
    """GET /v1/employees without a token returns 401, not 500."""
    resp = requests.get(f"{base_url}/v1/employees", timeout=10)
    assert resp.status_code == 401, (
        f"Expected 401 from auth middleware, got {resp.status_code}: {resp.text}"
    )


def test_unauthenticated_roles_returns_401(base_url: str) -> None:
    """GET /v1/admin/roles without a token returns 401, not 500."""
    resp = requests.get(f"{base_url}/v1/admin/roles", timeout=10)
    assert resp.status_code == 401, (
        f"Expected 401 from auth middleware, got {resp.status_code}: {resp.text}"
    )


def test_unknown_route_returns_404(base_url: str) -> None:
    """A request to a non-existent route returns 404, confirming the app is routing."""
    resp = requests.get(f"{base_url}/v1/does-not-exist", timeout=10)
    assert resp.status_code == 404, (
        f"Expected 404 for unknown route, got {resp.status_code}: {resp.text}"
    )
