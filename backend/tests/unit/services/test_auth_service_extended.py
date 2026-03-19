"""Extended unit tests for AuthService — Entra SSO edge cases and flows.

Covers gaps not addressed by the base test_auth_service.py:
  - handle_callback end-to-end orchestration
  - _exchange_code_for_token HTTP scenarios
  - _archive_employee_from_sso real invocation
  - _extract_claims edge cases (name parsing, sub fallback, preferred_username)
  - _provision_or_update_employee re-activation and name updates
  - _sync_roles_from_groups multi-mapping scenarios
  - _create_one_time_code TTL
  - JWT claims validation
"""

import time
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch, call

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
# handle_callback — end-to-end orchestration
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestHandleCallback:
    """Tests for the full handle_callback flow."""

    def test_handle_callback_orchestrates_all_steps(self) -> None:
        """handle_callback validates state, exchanges code, provisions employee, syncs roles, returns OTC."""
        service, mock_session = _make_service()
        employee = _make_employee(oid="oid-123")

        with (
            patch.object(service, "_validate_and_consume_state") as mock_validate,
            patch.object(service, "_exchange_code_for_token", return_value={"id_token": "x.y.z"}) as mock_exchange,
            patch.object(service, "_extract_claims", return_value={
                "oid": "oid-123", "email": "a@b.com", "first_name": "A", "last_name": "B", "groups": ["grp-1"],
            }) as mock_claims,
            patch.object(service, "_provision_or_update_employee", return_value=employee) as mock_provision,
            patch.object(service, "_sync_roles_from_groups") as mock_sync,
            patch.object(service, "_create_one_time_code", return_value="otc-abc") as mock_otc,
        ):
            result = service.handle_callback(code="auth-code-123", state="state-xyz")

        mock_validate.assert_called_once_with("state-xyz")
        mock_exchange.assert_called_once_with("auth-code-123")
        mock_claims.assert_called_once_with({"id_token": "x.y.z"})
        mock_provision.assert_called_once()
        mock_sync.assert_called_once_with("emp_abc", ["grp-1"])
        mock_otc.assert_called_once_with("emp_abc")
        assert result == "otc-abc"

    def test_handle_callback_raises_when_state_invalid(self) -> None:
        """handle_callback propagates AuthenticationError from state validation."""
        service, _ = _make_service()

        with patch.object(service, "_validate_and_consume_state", side_effect=AuthenticationError("Invalid")):
            with pytest.raises(AuthenticationError, match="Invalid"):
                service.handle_callback(code="c", state="bad")

    def test_handle_callback_raises_when_token_exchange_fails(self) -> None:
        """handle_callback propagates AuthenticationError from token exchange."""
        service, _ = _make_service()

        with (
            patch.object(service, "_validate_and_consume_state"),
            patch.object(service, "_exchange_code_for_token", side_effect=AuthenticationError("Token exchange failed.")),
        ):
            with pytest.raises(AuthenticationError, match="Token exchange failed"):
                service.handle_callback(code="c", state="s")

    def test_handle_callback_raises_when_claims_missing(self) -> None:
        """handle_callback propagates AuthenticationError from bad ID token claims."""
        service, _ = _make_service()

        with (
            patch.object(service, "_validate_and_consume_state"),
            patch.object(service, "_exchange_code_for_token", return_value={"id_token": "x.y.z"}),
            patch.object(service, "_extract_claims", side_effect=AuthenticationError("missing required claims")),
        ):
            with pytest.raises(AuthenticationError, match="missing required claims"):
                service.handle_callback(code="c", state="s")


# ---------------------------------------------------------------------------
# _exchange_code_for_token
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestExchangeCodeForToken:
    """Tests for the HTTP call to the Entra token endpoint."""

    def test_exchange_code_returns_token_data_on_200(self) -> None:
        """_exchange_code_for_token returns parsed JSON on a 200 response."""
        service, _ = _make_service()
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"id_token": "the-token", "access_token": "at"}

        with (
            patch("src.adthub.services.auth_service.settings") as mock_settings,
            patch("src.adthub.services.auth_service.httpx.post", return_value=mock_response) as mock_post,
        ):
            mock_settings.azure_tenant_id = "tenant-1"
            mock_settings.azure_client_id = "client-1"
            mock_settings.azure_client_secret = "secret-1"
            mock_settings.azure_redirect_uri = "https://example.com/cb"
            result = service._exchange_code_for_token("auth-code-abc")

        assert result == {"id_token": "the-token", "access_token": "at"}
        mock_post.assert_called_once()
        call_kwargs = mock_post.call_args
        assert call_kwargs[1]["data"]["code"] == "auth-code-abc"
        assert call_kwargs[1]["data"]["grant_type"] == "authorization_code"

    def test_exchange_code_raises_on_non_200(self) -> None:
        """_exchange_code_for_token raises AuthenticationError on non-200 responses."""
        service, _ = _make_service()
        mock_response = MagicMock()
        mock_response.status_code = 400

        with (
            patch("src.adthub.services.auth_service.settings") as mock_settings,
            patch("src.adthub.services.auth_service.httpx.post", return_value=mock_response),
        ):
            mock_settings.azure_tenant_id = "t"
            mock_settings.azure_client_id = "c"
            mock_settings.azure_client_secret = "s"
            mock_settings.azure_redirect_uri = "https://example.com/cb"

            with pytest.raises(AuthenticationError, match="Token exchange failed"):
                service._exchange_code_for_token("code")

    def test_exchange_code_raises_on_server_error(self) -> None:
        """_exchange_code_for_token raises AuthenticationError on 500 responses."""
        service, _ = _make_service()
        mock_response = MagicMock()
        mock_response.status_code = 500

        with (
            patch("src.adthub.services.auth_service.settings") as mock_settings,
            patch("src.adthub.services.auth_service.httpx.post", return_value=mock_response),
        ):
            mock_settings.azure_tenant_id = "t"
            mock_settings.azure_client_id = "c"
            mock_settings.azure_client_secret = "s"
            mock_settings.azure_redirect_uri = "https://example.com/cb"

            with pytest.raises(AuthenticationError, match="Token exchange failed"):
                service._exchange_code_for_token("code")

    def test_exchange_code_sends_correct_tenant_url(self) -> None:
        """_exchange_code_for_token posts to the correct Entra tenant token URL."""
        service, _ = _make_service()
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"id_token": "t"}

        with (
            patch("src.adthub.services.auth_service.settings") as mock_settings,
            patch("src.adthub.services.auth_service.httpx.post", return_value=mock_response) as mock_post,
        ):
            mock_settings.azure_tenant_id = "my-tenant-id"
            mock_settings.azure_client_id = "c"
            mock_settings.azure_client_secret = "s"
            mock_settings.azure_redirect_uri = "https://example.com/cb"
            service._exchange_code_for_token("code")

        url = mock_post.call_args[0][0]
        assert "my-tenant-id" in url
        assert url.endswith("/token")


# ---------------------------------------------------------------------------
# _extract_claims — edge cases
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestExtractClaimsEdgeCases:
    """Edge case tests for _extract_claims."""

    def test_uses_sub_when_oid_absent(self) -> None:
        """_extract_claims falls back to 'sub' when 'oid' is not present."""
        service, _ = _make_service()
        payload = {"sub": "sub-123", "email": "user@test.com", "name": "User"}

        with patch("src.adthub.services.auth_service.jwt.decode", return_value=payload):
            claims = service._extract_claims({"id_token": "x.y.z"})

        assert claims["oid"] == "sub-123"

    def test_uses_preferred_username_when_email_absent(self) -> None:
        """_extract_claims falls back to 'preferred_username' when 'email' is missing."""
        service, _ = _make_service()
        payload = {"oid": "oid-1", "preferred_username": "User@Corp.com", "name": "User"}

        with patch("src.adthub.services.auth_service.jwt.decode", return_value=payload):
            claims = service._extract_claims({"id_token": "x.y.z"})

        assert claims["email"] == "user@corp.com"

    def test_raises_when_both_oid_and_sub_missing(self) -> None:
        """_extract_claims raises when both oid and sub are absent."""
        service, _ = _make_service()
        payload = {"email": "user@test.com", "name": "User"}

        with patch("src.adthub.services.auth_service.jwt.decode", return_value=payload):
            with pytest.raises(AuthenticationError, match="missing required claims"):
                service._extract_claims({"id_token": "x.y.z"})

    def test_raises_when_email_and_preferred_username_both_empty(self) -> None:
        """_extract_claims raises when neither email nor preferred_username is present."""
        service, _ = _make_service()
        payload = {"oid": "oid-1", "name": "User"}

        with patch("src.adthub.services.auth_service.jwt.decode", return_value=payload):
            with pytest.raises(AuthenticationError, match="missing required claims"):
                service._extract_claims({"id_token": "x.y.z"})

    def test_single_name_produces_empty_last_name(self) -> None:
        """_extract_claims sets last_name to '' when name has no space."""
        service, _ = _make_service()
        payload = {"oid": "oid-1", "email": "user@test.com", "name": "Madonna"}

        with patch("src.adthub.services.auth_service.jwt.decode", return_value=payload):
            claims = service._extract_claims({"id_token": "x.y.z"})

        assert claims["first_name"] == "Madonna"
        assert claims["last_name"] == ""

    def test_multi_word_name_puts_rest_in_last_name(self) -> None:
        """_extract_claims keeps everything after the first space in last_name."""
        service, _ = _make_service()
        payload = {"oid": "oid-1", "email": "user@test.com", "name": "Mary Jane Watson"}

        with patch("src.adthub.services.auth_service.jwt.decode", return_value=payload):
            claims = service._extract_claims({"id_token": "x.y.z"})

        assert claims["first_name"] == "Mary"
        assert claims["last_name"] == "Jane Watson"

    def test_empty_name_produces_empty_first_and_last(self) -> None:
        """_extract_claims handles empty name string."""
        service, _ = _make_service()
        payload = {"oid": "oid-1", "email": "user@test.com", "name": ""}

        with patch("src.adthub.services.auth_service.jwt.decode", return_value=payload):
            claims = service._extract_claims({"id_token": "x.y.z"})

        assert claims["first_name"] == ""
        assert claims["last_name"] == ""

    def test_missing_id_token_key(self) -> None:
        """_extract_claims handles missing id_token key in token data."""
        service, _ = _make_service()
        # When id_token is missing, get() returns "", jwt.decode will be called with ""
        payload = {"oid": "oid-1", "email": "user@test.com", "name": "User"}

        with patch("src.adthub.services.auth_service.jwt.decode", return_value=payload):
            claims = service._extract_claims({})  # no id_token key

        assert claims["oid"] == "oid-1"


# ---------------------------------------------------------------------------
# _provision_or_update_employee — edge cases
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestProvisionEdgeCases:
    """Edge cases for employee provisioning during SSO login."""

    def test_provision_reactivates_archived_employee_by_oid(self) -> None:
        """An archived employee matched by OID is still returned (reactivation handled elsewhere)."""
        service, _ = _make_service()
        archived = _make_employee(oid="oid-123", status="archived")
        service._employee_repo.find_by_entra_oid.return_value = archived

        claims = {
            "oid": "oid-123", "email": "user@example.com",
            "first_name": "Alice", "last_name": "Smith", "groups": [],
        }
        result = service._provision_or_update_employee(claims)
        assert result is archived

    def test_provision_generates_sequential_employee_codes(self) -> None:
        """New employees get sequential ATD-NNNN codes based on total count."""
        service, mock_session = _make_service()
        service._employee_repo.find_by_entra_oid.return_value = None
        service._employee_repo.find_by_email.return_value = None
        service._employee_repo.count_all_including_archived.return_value = 99

        claims = {
            "oid": "oid-new", "email": "new@example.com",
            "first_name": "New", "last_name": "User", "groups": [],
        }
        employee = service._provision_or_update_employee(claims)
        assert employee.employee_code == "ATD-0100"

    def test_provision_sets_status_to_active_for_new_employee(self) -> None:
        """Newly provisioned employees start with status='active'."""
        service, mock_session = _make_service()
        service._employee_repo.find_by_entra_oid.return_value = None
        service._employee_repo.find_by_email.return_value = None
        service._employee_repo.count_all_including_archived.return_value = 0

        claims = {
            "oid": "oid-new", "email": "new@example.com",
            "first_name": "New", "last_name": "User", "groups": [],
        }
        employee = service._provision_or_update_employee(claims)
        assert employee.status == "active"

    def test_provision_links_email_match_sets_oid_and_flushes(self) -> None:
        """When matched by email, the employee gets entra_oid set and updated_at refreshed."""
        service, mock_session = _make_service()
        existing = _make_employee(oid=None)
        existing.work_email = "alice@example.com"
        existing.updated_at = datetime(2024, 1, 1, tzinfo=timezone.utc)
        service._employee_repo.find_by_entra_oid.return_value = None
        service._employee_repo.find_by_email.return_value = existing

        claims = {
            "oid": "new-oid-for-alice", "email": "alice@example.com",
            "first_name": "Alice", "last_name": "Smith", "groups": [],
        }
        result = service._provision_or_update_employee(claims)

        assert result.entra_oid == "new-oid-for-alice"
        assert result.updated_at > datetime(2024, 1, 1, tzinfo=timezone.utc)
        mock_session.flush.assert_called()


# ---------------------------------------------------------------------------
# _sync_roles_from_groups — multi-mapping scenarios
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestSyncRolesMultiMapping:
    """Tests for _sync_roles_from_groups with multiple mappings."""

    def test_assigns_multiple_roles_for_multiple_groups(self) -> None:
        """Employee in multiple mapped groups gets all corresponding roles assigned."""
        service, _ = _make_service()
        mapping_a = _make_mapping("grp-a", "role-admin")
        mapping_b = _make_mapping("grp-b", "role-viewer")
        service._role_repo.find_all_entra_group_mappings.return_value = [mapping_a, mapping_b]
        service._role_repo.find_assignment.return_value = None  # neither role assigned yet

        service._sync_roles_from_groups("emp_abc", ["grp-a", "grp-b"])

        assert service._role_repo.save_assignment.call_count == 2

    def test_assigns_one_revokes_other_when_partially_in_groups(self) -> None:
        """Employee in one group but not another gets role assigned and other revoked."""
        service, _ = _make_service()
        mapping_a = _make_mapping("grp-a", "role-admin")
        mapping_b = _make_mapping("grp-b", "role-viewer")
        service._role_repo.find_all_entra_group_mappings.return_value = [mapping_a, mapping_b]

        sso_assignment = MagicMock()
        sso_assignment.assigned_by = None  # SSO-sourced

        def mock_find(emp_id, role_id):
            if role_id == "role-admin":
                return None  # not yet assigned
            return sso_assignment  # was assigned via SSO

        service._role_repo.find_assignment.side_effect = mock_find

        # Employee is in grp-a but NOT grp-b
        service._sync_roles_from_groups("emp_abc", ["grp-a"])

        service._role_repo.save_assignment.assert_called_once()  # role-admin assigned
        service._role_repo.delete_assignment.assert_called_once_with("emp_abc", "role-viewer")

    def test_no_archive_when_still_in_one_mapped_group(self) -> None:
        """Employee removed from one group but still in another is NOT archived."""
        service, _ = _make_service()
        mapping_a = _make_mapping("grp-a", "role-admin")
        mapping_b = _make_mapping("grp-b", "role-viewer")
        service._role_repo.find_all_entra_group_mappings.return_value = [mapping_a, mapping_b]

        sso_assignment = MagicMock()
        sso_assignment.assigned_by = None

        def mock_find(emp_id, role_id):
            if role_id == "role-admin":
                return None  # will be assigned (in grp-a)
            return sso_assignment  # will be revoked (not in grp-b)

        service._role_repo.find_assignment.side_effect = mock_find

        with patch.object(service, "_archive_employee_from_sso") as mock_archive:
            service._sync_roles_from_groups("emp_abc", ["grp-a"])

        mock_archive.assert_not_called()

    def test_does_not_revoke_manual_assignments_even_with_multiple_mappings(self) -> None:
        """Manual assignments are never revoked, even when employee leaves all groups."""
        service, _ = _make_service()
        mapping = _make_mapping("grp-a", "role-admin")
        service._role_repo.find_all_entra_group_mappings.return_value = [mapping]

        manual_assignment = MagicMock()
        manual_assignment.assigned_by = "emp_manager"  # manually assigned
        service._role_repo.find_assignment.return_value = manual_assignment

        service._sync_roles_from_groups("emp_abc", [])  # not in any group

        service._role_repo.delete_assignment.assert_not_called()


# ---------------------------------------------------------------------------
# _archive_employee_from_sso
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestArchiveEmployeeFromSSO:
    """Tests for _archive_employee_from_sso integration with EmployeeService."""

    def test_archive_calls_employee_service_archive(self) -> None:
        """_archive_employee_from_sso creates an EmployeeService and calls archive_employee."""
        service, mock_session = _make_service()

        with (
            patch("src.adthub.db.repositories.offboarding_task_repository.OffboardingTaskRepository") as MockTaskRepo,
            patch("src.adthub.services.employee_service.EmployeeService") as MockEmpService,
        ):
            mock_emp_svc_instance = MagicMock()
            MockEmpService.return_value = mock_emp_svc_instance

            service._archive_employee_from_sso("emp_abc")

            MockTaskRepo.assert_called_once_with(mock_session)
            MockEmpService.assert_called_once_with(
                repository=service._employee_repo,
                task_repository=MockTaskRepo.return_value,
                role_repository=service._role_repo,
            )
            mock_emp_svc_instance.archive_employee.assert_called_once_with("emp_abc")


# ---------------------------------------------------------------------------
# _create_one_time_code
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestCreateOneTimeCode:
    """Tests for _create_one_time_code."""

    def test_creates_otc_with_5_minute_ttl(self) -> None:
        """_create_one_time_code persists a OneTimeCode with ~5 minute expiry."""
        service, mock_session = _make_service()
        code = service._create_one_time_code("emp_abc")

        assert isinstance(code, str)
        assert len(code) > 20  # secrets.token_urlsafe(32) is ~43 chars
        mock_session.add.assert_called_once()
        added = mock_session.add.call_args[0][0]
        assert isinstance(added, OneTimeCode)
        assert added.employee_id == "emp_abc"
        assert added.expires_at > datetime.now(timezone.utc) + timedelta(minutes=4)
        assert added.expires_at < datetime.now(timezone.utc) + timedelta(minutes=6)

    def test_creates_unique_codes_each_call(self) -> None:
        """_create_one_time_code generates different codes on successive calls."""
        service, _ = _make_service()
        code1 = service._create_one_time_code("emp_abc")
        code2 = service._create_one_time_code("emp_abc")
        assert code1 != code2


# ---------------------------------------------------------------------------
# JWT claims validation
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestJWTClaims:
    """Tests validating the JWT issued by exchange_one_time_code."""

    def test_jwt_contains_sub_iat_exp(self) -> None:
        """The issued JWT contains sub, iat, and exp claims."""
        service, mock_session = _make_service()
        record = OneTimeCode(
            code="code-1", employee_id="emp_xyz",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        )
        mock_session.query.return_value.filter.return_value.first.return_value = record

        with patch("src.adthub.services.auth_service.settings") as mock_settings:
            mock_settings.jwt_secret = "test-secret-long-enough-for-hs256"
            token = service.exchange_one_time_code("code-1")

        decoded = jwt.decode(token, "test-secret-long-enough-for-hs256", algorithms=["HS256"])
        assert "sub" in decoded
        assert "iat" in decoded
        assert "exp" in decoded
        assert decoded["sub"] == "emp_xyz"

    def test_jwt_expires_in_8_hours(self) -> None:
        """The JWT expiry is approximately 8 hours from issuance."""
        service, mock_session = _make_service()
        record = OneTimeCode(
            code="code-1", employee_id="emp_xyz",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        )
        mock_session.query.return_value.filter.return_value.first.return_value = record

        with patch("src.adthub.services.auth_service.settings") as mock_settings:
            mock_settings.jwt_secret = "test-secret-long-enough-for-hs256"
            token = service.exchange_one_time_code("code-1")

        decoded = jwt.decode(token, "test-secret-long-enough-for-hs256", algorithms=["HS256"])
        ttl = decoded["exp"] - decoded["iat"]
        assert 7 * 3600 < ttl <= 8 * 3600

    def test_jwt_cannot_be_decoded_with_wrong_secret(self) -> None:
        """The JWT cannot be decoded with a different secret."""
        service, mock_session = _make_service()
        record = OneTimeCode(
            code="code-1", employee_id="emp_xyz",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        )
        mock_session.query.return_value.filter.return_value.first.return_value = record

        with patch("src.adthub.services.auth_service.settings") as mock_settings:
            mock_settings.jwt_secret = "correct-secret-long-enough-here"
            token = service.exchange_one_time_code("code-1")

        with pytest.raises(jwt.InvalidSignatureError):
            jwt.decode(token, "wrong-secret-that-is-long-enough", algorithms=["HS256"])


# ---------------------------------------------------------------------------
# build_auth_url — additional edge cases
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestBuildAuthUrlExtended:
    """Additional tests for build_auth_url."""

    def test_auth_url_contains_required_oauth_params(self) -> None:
        """The generated URL includes client_id, response_type, redirect_uri, scope, and state."""
        service, _ = _make_service()

        with patch("src.adthub.services.auth_service.settings") as mock_settings:
            mock_settings.azure_tenant_id = "tenant-abc"
            mock_settings.azure_client_id = "client-xyz"
            mock_settings.azure_redirect_uri = "https://api.example.com/v1/auth/callback"
            url = service.build_auth_url()

        assert "client_id=client-xyz" in url
        assert "response_type=code" in url
        assert "redirect_uri=https://api.example.com/v1/auth/callback" in url
        assert "scope=openid" in url
        assert "state=" in url
        assert "response_mode=query" in url

    def test_each_call_generates_unique_state(self) -> None:
        """Each call to build_auth_url generates a unique CSRF state token."""
        service, mock_session = _make_service()

        with patch("src.adthub.services.auth_service.settings") as mock_settings:
            mock_settings.azure_tenant_id = "t"
            mock_settings.azure_client_id = "c"
            mock_settings.azure_redirect_uri = "https://example.com/cb"
            url1 = service.build_auth_url()
            url2 = service.build_auth_url()

        # Extract state params
        state1 = url1.split("state=")[1]
        state2 = url2.split("state=")[1]
        assert state1 != state2

    def test_auth_url_flushes_session(self) -> None:
        """build_auth_url flushes the session to persist the OAuthState."""
        service, mock_session = _make_service()

        with patch("src.adthub.services.auth_service.settings") as mock_settings:
            mock_settings.azure_tenant_id = "t"
            mock_settings.azure_client_id = "c"
            mock_settings.azure_redirect_uri = "https://example.com/cb"
            service.build_auth_url()

        mock_session.flush.assert_called()


# ---------------------------------------------------------------------------
# _validate_and_consume_state — additional tests
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestValidateStateExtended:
    """Additional tests for _validate_and_consume_state."""

    def test_flushes_after_deleting_state(self) -> None:
        """_validate_and_consume_state flushes the session after deleting the record."""
        service, mock_session = _make_service()
        record = OAuthState(
            state="good-state",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        )
        mock_session.query.return_value.filter.return_value.first.return_value = record

        service._validate_and_consume_state("good-state")

        # Verify delete comes before flush
        mock_session.delete.assert_called_once_with(record)
        mock_session.flush.assert_called()

    def test_state_is_consumed_only_once(self) -> None:
        """Once consumed, the same state cannot be used again (record is deleted)."""
        service, mock_session = _make_service()
        record = OAuthState(
            state="one-time-state",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        )
        # First call finds the record, second call returns None
        mock_session.query.return_value.filter.return_value.first.side_effect = [record, None]

        service._validate_and_consume_state("one-time-state")

        with pytest.raises(AuthenticationError, match="Invalid or expired"):
            service._validate_and_consume_state("one-time-state")
