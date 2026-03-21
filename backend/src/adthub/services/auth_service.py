"""Authentication service — Microsoft Entra SSO flow.

Handles the full OAuth 2.0 authorization code flow:
  1. Build the Microsoft authorization URL (with state for CSRF protection)
  2. Exchange the authorization code for an ID token (server-to-server)
  3. Extract claims (OID, email, name, groups) from the ID token
  4. Provision the employee on first login
  5. Issue a short-lived one-time code for the frontend to exchange
  6. Exchange the one-time code for an 8-hour app JWT

Entra tokens are never stored or forwarded — they are consumed here and
discarded. The app issues its own JWT using jwt_secret from settings.
"""

import secrets
import uuid
from datetime import UTC, datetime, timedelta

import httpx
import jwt
import structlog
from sqlalchemy.orm import Session

from ..config import settings
from ..db.models.auth import OAuthState, OneTimeCode
from ..db.models.employees import Employee
from ..db.repositories.employee_repository import EmployeeRepository
from ..db.repositories.role_repository import RoleRepository
from ..exceptions import AuthenticationError

logger = structlog.get_logger()

_ENTRA_AUTH_BASE = "https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0"
_SCOPES = "openid email profile"
_STATE_TTL_MINUTES = 10
_OTC_TTL_MINUTES = 5
_JWT_TTL_HOURS = 8


class AuthService:
    """Orchestrates the Entra SSO login flow."""

    def __init__(self, session: Session) -> None:
        self._session = session
        self._employee_repo = EmployeeRepository(session)
        self._role_repo = RoleRepository(session)

    # ------------------------------------------------------------------
    # Step 1 — Build authorization URL
    # ------------------------------------------------------------------

    def build_auth_url(self) -> str:
        """Generate a Microsoft authorization URL and persist the state token.

        Returns:
            The full URL to redirect the user to for Microsoft login.
        """
        state = secrets.token_urlsafe(32)
        expires_at = datetime.now(UTC) + timedelta(minutes=_STATE_TTL_MINUTES)
        self._session.add(OAuthState(state=state, expires_at=expires_at))
        self._session.flush()

        base = _ENTRA_AUTH_BASE.format(tenant_id=settings.azure_tenant_id)
        params = (
            f"client_id={settings.azure_client_id}"
            f"&response_type=code"
            f"&redirect_uri={settings.azure_redirect_uri}"
            f"&response_mode=query"
            f"&scope={_SCOPES.replace(' ', '%20')}"
            f"&state={state}"
        )
        return f"{base}/authorize?{params}"

    # ------------------------------------------------------------------
    # Step 2 — Handle callback: exchange code, provision employee, issue OTC
    # ------------------------------------------------------------------

    def handle_callback(self, code: str, state: str) -> str:
        """Validate state, exchange code for ID token, provision employee.

        Args:
            code: Authorization code from Microsoft.
            state: CSRF state token from the redirect.

        Returns:
            A one-time code the frontend can exchange for a JWT.

        Raises:
            AuthenticationError: If state is invalid/expired or token exchange fails.
        """
        self._validate_and_consume_state(state)

        id_token_data = self._exchange_code_for_token(code)
        claims = self._extract_claims(id_token_data)

        employee = self._provision_or_update_employee(claims)
        self._sync_roles_from_groups(employee.id, claims["groups"])

        otc = self._create_one_time_code(employee.id)
        logger.info(
            "SSO login successful.",
            employee_id=employee.id,
            entra_oid=claims["oid"],
        )
        return otc

    # ------------------------------------------------------------------
    # Step 3 — Exchange one-time code for JWT
    # ------------------------------------------------------------------

    def exchange_one_time_code(self, code: str) -> str:
        """Exchange a one-time code for an 8-hour JWT.

        Args:
            code: The one-time code issued after successful callback.

        Returns:
            A signed JWT valid for 8 hours.

        Raises:
            AuthenticationError: If the code is invalid or expired.
        """
        now = datetime.now(UTC)
        record = self._session.query(OneTimeCode).filter(
            OneTimeCode.code == code,
            OneTimeCode.expires_at > now,
        ).first()

        if record is None:
            logger.warning("One-time code invalid or expired.")
            raise AuthenticationError("Invalid or expired code.")

        employee_id = record.employee_id
        self._session.delete(record)
        self._session.flush()

        token = jwt.encode(
            {
                "sub": employee_id,
                "iat": now,
                "exp": now + timedelta(hours=_JWT_TTL_HOURS),
            },
            settings.jwt_secret,
            algorithm="HS256",
        )
        logger.info("JWT issued.", employee_id=employee_id)
        return token

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _validate_and_consume_state(self, state: str) -> None:
        now = datetime.now(UTC)
        record = self._session.query(OAuthState).filter(
            OAuthState.state == state,
            OAuthState.expires_at > now,
        ).first()

        if record is None:
            logger.warning("OAuth state invalid or expired.", state=state[:8])
            raise AuthenticationError("Invalid or expired state.")

        self._session.delete(record)
        self._session.flush()

    def _exchange_code_for_token(self, code: str) -> dict:
        base = _ENTRA_AUTH_BASE.format(tenant_id=settings.azure_tenant_id)
        response = httpx.post(
            f"{base}/token",
            data={
                "client_id": settings.azure_client_id,
                "client_secret": settings.azure_client_secret,
                "code": code,
                "redirect_uri": settings.azure_redirect_uri,
                "grant_type": "authorization_code",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=10.0,
        )
        if response.status_code != 200:
            logger.warning(
                "Entra token exchange failed.",
                status_code=response.status_code,
            )
            raise AuthenticationError("Token exchange failed.")
        return response.json()

    def _extract_claims(self, token_data: dict) -> dict:
        """Decode the ID token and extract the claims we need.

        We do not verify the ID token signature here because the token was
        received directly from Microsoft over TLS in a server-to-server call
        (not from the browser). This is the accepted pattern for server-side
        auth code flows.
        """
        id_token = token_data.get("id_token", "")
        payload = jwt.decode(id_token, options={"verify_signature": False})

        oid = payload.get("oid") or payload.get("sub")
        email = payload.get("email") or payload.get("preferred_username", "")
        name = payload.get("name", "")
        groups = payload.get("groups", [])

        if not oid or not email:
            raise AuthenticationError("ID token missing required claims (oid, email).")

        name_parts = name.strip().split(" ", 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""

        return {
            "oid": oid,
            "email": email.lower().strip(),
            "first_name": first_name,
            "last_name": last_name,
            "groups": groups,
        }

    def _provision_or_update_employee(self, claims: dict) -> Employee:
        """Find or create an employee record from Entra claims.

        Lookup order:
          1. By entra_oid — returning user with established record
          2. By email — employee created manually before SSO was enabled
          3. Create new — first-ever login

        On first login, auto-generates employee_code using the same
        ATD-{N:04d} sequence as create_employee.
        """
        employee = self._employee_repo.find_by_entra_oid(claims["oid"])

        if employee is None:
            employee = self._employee_repo.find_by_email(claims["email"])
            if employee is not None:
                # Link the existing record to this Entra OID
                employee.entra_oid = claims["oid"]
                employee.updated_at = datetime.now(UTC)
                self._session.flush()
                logger.info(
                    "Linked existing employee to Entra OID.",
                    employee_id=employee.id,
                    entra_oid=claims["oid"],
                )

        if employee is None:
            total = self._employee_repo.count_all_including_archived()
            employee_code = f"ATD-{total + 1:04d}"
            now = datetime.now(UTC)
            employee = Employee(
                id=f"emp_{uuid.uuid4().hex[:12]}",
                entra_oid=claims["oid"],
                employee_code=employee_code,
                first_name=claims["first_name"],
                last_name=claims["last_name"],
                work_email=claims["email"],
                status="active",
                created_at=now,
                updated_at=now,
            )
            self._session.add(employee)
            self._session.flush()
            logger.info(
                "Employee provisioned via SSO.",
                employee_id=employee.id,
                employee_code=employee_code,
                entra_oid=claims["oid"],
            )

        return employee

    def _create_one_time_code(self, employee_id: str) -> str:
        code = secrets.token_urlsafe(32)
        expires_at = datetime.now(UTC) + timedelta(minutes=_OTC_TTL_MINUTES)
        self._session.add(OneTimeCode(
            code=code,
            employee_id=employee_id,
            expires_at=expires_at,
        ))
        self._session.flush()
        return code

    def _sync_roles_from_groups(self, employee_id: str, entra_group_ids: list[str]) -> None:
        """Sync app role assignments based on current Entra group membership.

        - Assigns roles for groups the employee IS a member of (idempotent).
        - Removes SSO-sourced assignments (assigned_by=None) for groups the
          employee is NO LONGER a member of, respecting manually-assigned roles.
        - Archives the employee if they have been removed from ALL mapped Entra
          groups (i.e. access has been fully revoked via Entra).
        """
        from ..db.models.config_tables import RoleAssignment

        mappings = self._role_repo.find_all_entra_group_mappings()
        if not mappings:
            return

        group_id_set = set(entra_group_ids)
        roles_revoked = False

        for mapping in mappings:
            if mapping.entra_group_id in group_id_set:
                # Employee is in this group — ensure role is assigned
                existing = self._role_repo.find_assignment(employee_id, mapping.role_id)
                if existing is None:
                    self._role_repo.save_assignment(RoleAssignment(
                        employee_id=employee_id,
                        role_id=mapping.role_id,
                        assigned_by=None,  # None = SSO-sourced
                        assigned_at=datetime.now(UTC),
                        is_manager=False,
                    ))
                    logger.info(
                        "Role auto-assigned via Entra group.",
                        employee_id=employee_id,
                        role_id=mapping.role_id,
                        entra_group_id=mapping.entra_group_id,
                    )
            else:
                # Employee is NOT in this group — remove SSO-sourced assignment only
                existing = self._role_repo.find_assignment(employee_id, mapping.role_id)
                if existing is not None and existing.assigned_by is None:
                    self._role_repo.delete_assignment(employee_id, mapping.role_id)
                    roles_revoked = True
                    logger.info(
                        "SSO-sourced role removed (no longer in Entra group).",
                        employee_id=employee_id,
                        role_id=mapping.role_id,
                        entra_group_id=mapping.entra_group_id,
                    )

        # If SSO roles were revoked and the employee is not in any mapped group,
        # initiate the archiving workflow — their Entra access has been fully removed.
        if roles_revoked:
            mapped_group_ids = {m.entra_group_id for m in mappings}
            still_in_any_mapped_group = bool(group_id_set & mapped_group_ids)
            if not still_in_any_mapped_group:
                employee = self._employee_repo.find_by_id(employee_id)
                if employee and employee.status == "active":
                    self._archive_employee_from_sso(employee_id)

    def _archive_employee_from_sso(self, employee_id: str) -> None:
        """Initiate archiving for an employee removed from all mapped Entra groups."""
        from ..db.repositories.offboarding_task_repository import (
            OffboardingTaskRepository,
        )
        from .employee_service import EmployeeService

        task_repo = OffboardingTaskRepository(self._session)
        employee_service = EmployeeService(
            repository=self._employee_repo,
            task_repository=task_repo,
            role_repository=self._role_repo,
        )
        employee_service.archive_employee(employee_id)
        logger.info(
            "Employee archived: removed from all mapped Entra groups.",
            employee_id=employee_id,
        )
