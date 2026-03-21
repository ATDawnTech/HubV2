"""Unit tests for AuthService (Microsoft Entra SSO flow).

All tests use mock sessions and repositories — no database, no HTTP calls.
"""

import time
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import jwt
import pytest

from src.adthub.db.models.auth import OAuthState, OneTimeCode
from src.adthub.db.models.employees import Employee
from src.adthub.exceptions import AuthenticationError
from src.adthub.services.auth_service import AuthService


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_service():
    mock_session = MagicMock()
    service = AuthService(mock_session)
    service._employee_repo = MagicMock()
    service._role_repo = MagicMock()
    return service, mock_session


def _make_employee(emp_id: str = "emp_abc", oid: str | None = None, status: str = "active") -> Employee:
    e = Employee()
    e.id = emp_id
    e.entra_oid = oid
    e.work_email = "user@example.com"
    e.first_name = "Alice"
    e.last_name = "Smith"
    e.status = status
    return e


def _make_mapping(entra_group_id: str, role_id: str) -> MagicMock:
    m = MagicMock()
    m.entra_group_id = entra_group_id
    m.role_id = role_id
    return m


# ---------------------------------------------------------------------------
# build_auth_url
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_build_auth_url_persists_state_and_returns_microsoft_url() -> None:
    """build_auth_url adds an OAuthState to the session and returns a Microsoft URL."""
    service, mock_session = _make_service()

    with patch("src.adthub.services.auth_service.settings") as mock_settings:
        mock_settings.azure_tenant_id = "tenant-123"
        mock_settings.azure_client_id = "client-123"
        mock_settings.azure_redirect_uri = "https://api.example.com/v1/auth/callback"

        url = service.build_auth_url()

    mock_session.add.assert_called_once()
    added = mock_session.add.call_args[0][0]
    assert isinstance(added, OAuthState)
    assert "login.microsoftonline.com" in url
    assert "tenant-123" in url
    assert "client-123" in url


@pytest.mark.unit
def test_build_auth_url_state_expires_at_least_9_minutes_out() -> None:
    """OAuthState.expires_at is at least 9 minutes in the future."""
    service, mock_session = _make_service()

    with patch("src.adthub.services.auth_service.settings") as mock_settings:
        mock_settings.azure_tenant_id = "t"
        mock_settings.azure_client_id = "c"
        mock_settings.azure_redirect_uri = "https://example.com/cb"
        service.build_auth_url()

    added = mock_session.add.call_args[0][0]
    assert added.expires_at > datetime.now(timezone.utc) + timedelta(minutes=9)


# ---------------------------------------------------------------------------
# _validate_and_consume_state
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_validate_state_raises_on_unknown_state() -> None:
    """_validate_and_consume_state raises ValueError for an unknown or expired state."""
    service, mock_session = _make_service()
    mock_session.query.return_value.filter.return_value.first.return_value = None

    with pytest.raises(AuthenticationError, match="Invalid or expired state"):
        service._validate_and_consume_state("bad-state")


@pytest.mark.unit
def test_validate_state_deletes_record_on_valid_state() -> None:
    """_validate_and_consume_state deletes the OAuthState record after use."""
    service, mock_session = _make_service()
    record = OAuthState(
        state="good-state",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
    )
    mock_session.query.return_value.filter.return_value.first.return_value = record

    service._validate_and_consume_state("good-state")

    mock_session.delete.assert_called_once_with(record)
    mock_session.flush.assert_called()


# ---------------------------------------------------------------------------
# _extract_claims
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_extract_claims_parses_all_fields() -> None:
    """_extract_claims returns oid, email, first_name, last_name, groups."""
    service, _ = _make_service()
    payload = {
        "oid": "oid-123",
        "email": "alice@example.com",
        "name": "Alice Smith",
        "groups": ["grp-1", "grp-2"],
    }

    with patch("src.adthub.services.auth_service.jwt.decode", return_value=payload):
        claims = service._extract_claims({"id_token": "header.payload.sig"})

    assert claims["oid"] == "oid-123"
    assert claims["email"] == "alice@example.com"
    assert claims["first_name"] == "Alice"
    assert claims["last_name"] == "Smith"
    assert claims["groups"] == ["grp-1", "grp-2"]


@pytest.mark.unit
def test_extract_claims_raises_when_oid_missing() -> None:
    """_extract_claims raises ValueError when neither oid nor sub is present."""
    service, _ = _make_service()
    payload = {"email": "alice@example.com", "name": "Alice"}

    with patch("src.adthub.services.auth_service.jwt.decode", return_value=payload):
        with pytest.raises(AuthenticationError, match="missing required claims"):
            service._extract_claims({"id_token": "x.y.z"})


@pytest.mark.unit
def test_extract_claims_lowercases_and_strips_email() -> None:
    """_extract_claims normalises email to lowercase and strips whitespace."""
    service, _ = _make_service()
    payload = {"oid": "oid-abc", "email": " Alice@EXAMPLE.COM ", "name": "Alice"}

    with patch("src.adthub.services.auth_service.jwt.decode", return_value=payload):
        claims = service._extract_claims({"id_token": "x.y.z"})

    assert claims["email"] == "alice@example.com"


@pytest.mark.unit
def test_extract_claims_defaults_groups_to_empty_list() -> None:
    """_extract_claims returns groups=[] when the token has no groups claim."""
    service, _ = _make_service()
    payload = {"oid": "oid-abc", "email": "user@example.com", "name": "User"}

    with patch("src.adthub.services.auth_service.jwt.decode", return_value=payload):
        claims = service._extract_claims({"id_token": "x.y.z"})

    assert claims["groups"] == []


# ---------------------------------------------------------------------------
# exchange_one_time_code
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_exchange_one_time_code_raises_on_missing_or_expired_code() -> None:
    """exchange_one_time_code raises ValueError when the code doesn't exist or is expired."""
    service, mock_session = _make_service()
    mock_session.query.return_value.filter.return_value.first.return_value = None

    with pytest.raises(AuthenticationError, match="Invalid or expired"):
        service.exchange_one_time_code("bad-code")


@pytest.mark.unit
def test_exchange_one_time_code_deletes_record_after_use() -> None:
    """exchange_one_time_code deletes the OneTimeCode record — it is single-use."""
    service, mock_session = _make_service()
    record = OneTimeCode(
        code="good-code",
        employee_id="emp_abc",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
    )
    mock_session.query.return_value.filter.return_value.first.return_value = record

    with patch("src.adthub.services.auth_service.settings") as mock_settings:
        mock_settings.jwt_secret = "test-secret"
        service.exchange_one_time_code("good-code")

    mock_session.delete.assert_called_once_with(record)


@pytest.mark.unit
def test_exchange_one_time_code_issues_valid_jwt() -> None:
    """exchange_one_time_code returns a JWT with sub=employee_id and ~8h expiry."""
    service, mock_session = _make_service()
    record = OneTimeCode(
        code="good-code",
        employee_id="emp_abc",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
    )
    mock_session.query.return_value.filter.return_value.first.return_value = record

    with patch("src.adthub.services.auth_service.settings") as mock_settings:
        mock_settings.jwt_secret = "test-secret"
        token = service.exchange_one_time_code("good-code")

    decoded = jwt.decode(token, "test-secret", algorithms=["HS256"])
    assert decoded["sub"] == "emp_abc"
    assert decoded["exp"] > time.time() + 7 * 3600  # at least 7 hours remaining


# ---------------------------------------------------------------------------
# _provision_or_update_employee
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_provision_creates_new_employee_on_first_login() -> None:
    """_provision_or_update_employee creates a new employee when no record exists."""
    service, mock_session = _make_service()
    service._employee_repo.find_by_entra_oid.return_value = None
    service._employee_repo.find_by_email.return_value = None
    service._employee_repo.count_all_including_archived.return_value = 5

    claims = {
        "oid": "new-oid",
        "email": "new@example.com",
        "first_name": "New",
        "last_name": "User",
        "groups": [],
    }

    employee = service._provision_or_update_employee(claims)

    mock_session.add.assert_called_once()
    assert employee.entra_oid == "new-oid"
    assert employee.work_email == "new@example.com"
    assert employee.employee_code == "ATD-0006"


@pytest.mark.unit
def test_provision_links_entra_oid_to_existing_employee_found_by_email() -> None:
    """_provision_or_update_employee links entra_oid to an existing employee matched by email."""
    service, mock_session = _make_service()
    existing = _make_employee(oid=None)
    existing.work_email = "existing@example.com"
    service._employee_repo.find_by_entra_oid.return_value = None
    service._employee_repo.find_by_email.return_value = existing

    claims = {
        "oid": "new-oid",
        "email": "existing@example.com",
        "first_name": "Existing",
        "last_name": "User",
        "groups": [],
    }

    result = service._provision_or_update_employee(claims)

    assert result.entra_oid == "new-oid"
    mock_session.add.assert_not_called()


@pytest.mark.unit
def test_provision_returns_existing_employee_found_by_oid() -> None:
    """_provision_or_update_employee returns the existing record when matched by OID."""
    service, _ = _make_service()
    existing = _make_employee(oid="existing-oid")
    service._employee_repo.find_by_entra_oid.return_value = existing

    claims = {
        "oid": "existing-oid",
        "email": "user@example.com",
        "first_name": "User",
        "last_name": "Name",
        "groups": [],
    }

    result = service._provision_or_update_employee(claims)

    assert result is existing


# ---------------------------------------------------------------------------
# _sync_roles_from_groups
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_sync_roles_assigns_role_when_employee_in_mapped_group() -> None:
    """_sync_roles_from_groups assigns the role when employee is in the mapped group."""
    service, _ = _make_service()
    mapping = _make_mapping(entra_group_id="grp-admin", role_id="role-sysadmin")
    service._role_repo.find_all_entra_group_mappings.return_value = [mapping]
    service._role_repo.find_assignment.return_value = None

    service._sync_roles_from_groups("emp_abc", ["grp-admin"])

    service._role_repo.save_assignment.assert_called_once()


@pytest.mark.unit
def test_sync_roles_skips_assignment_when_already_assigned() -> None:
    """_sync_roles_from_groups does not create a duplicate role assignment."""
    service, _ = _make_service()
    mapping = _make_mapping(entra_group_id="grp-admin", role_id="role-sysadmin")
    service._role_repo.find_all_entra_group_mappings.return_value = [mapping]
    service._role_repo.find_assignment.return_value = MagicMock()  # already exists

    service._sync_roles_from_groups("emp_abc", ["grp-admin"])

    service._role_repo.save_assignment.assert_not_called()


@pytest.mark.unit
def test_sync_roles_removes_sso_assignment_when_removed_from_group() -> None:
    """_sync_roles_from_groups removes an SSO-sourced role when employee leaves the group."""
    service, _ = _make_service()
    mapping = _make_mapping(entra_group_id="grp-admin", role_id="role-sysadmin")
    service._role_repo.find_all_entra_group_mappings.return_value = [mapping]
    sso_assignment = MagicMock()
    sso_assignment.assigned_by = None  # SSO-sourced
    service._role_repo.find_assignment.return_value = sso_assignment
    service._employee_repo.find_by_id.return_value = _make_employee(status="archived")

    with patch.object(service, "_archive_employee_from_sso"):
        service._sync_roles_from_groups("emp_abc", [])  # not in grp-admin

    service._role_repo.delete_assignment.assert_called_once_with("emp_abc", "role-sysadmin")


@pytest.mark.unit
def test_sync_roles_preserves_manual_assignment_when_removed_from_group() -> None:
    """_sync_roles_from_groups keeps a manually-assigned role when employee leaves the group."""
    service, _ = _make_service()
    mapping = _make_mapping(entra_group_id="grp-admin", role_id="role-sysadmin")
    service._role_repo.find_all_entra_group_mappings.return_value = [mapping]
    manual_assignment = MagicMock()
    manual_assignment.assigned_by = "emp_manager"  # manually assigned — must not be touched
    service._role_repo.find_assignment.return_value = manual_assignment

    service._sync_roles_from_groups("emp_abc", [])

    service._role_repo.delete_assignment.assert_not_called()


@pytest.mark.unit
def test_sync_roles_archives_employee_when_removed_from_all_mapped_groups() -> None:
    """_sync_roles_from_groups archives the employee when removed from all mapped groups."""
    service, _ = _make_service()
    mapping = _make_mapping(entra_group_id="grp-admin", role_id="role-sysadmin")
    service._role_repo.find_all_entra_group_mappings.return_value = [mapping]
    sso_assignment = MagicMock()
    sso_assignment.assigned_by = None
    service._role_repo.find_assignment.return_value = sso_assignment
    service._employee_repo.find_by_id.return_value = _make_employee(status="active")

    with patch.object(service, "_archive_employee_from_sso") as mock_archive:
        service._sync_roles_from_groups("emp_abc", [])

    mock_archive.assert_called_once_with("emp_abc")


@pytest.mark.unit
def test_sync_roles_noop_when_no_mappings_configured() -> None:
    """_sync_roles_from_groups does nothing when no Entra group mappings exist."""
    service, _ = _make_service()
    service._role_repo.find_all_entra_group_mappings.return_value = []

    service._sync_roles_from_groups("emp_abc", ["grp-anything"])

    service._role_repo.save_assignment.assert_not_called()
    service._role_repo.delete_assignment.assert_not_called()
