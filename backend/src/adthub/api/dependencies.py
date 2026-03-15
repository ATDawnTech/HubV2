"""FastAPI dependency functions shared across all API routes."""

from collections.abc import Generator

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from ..config import settings
from ..db.engine import SessionLocal
from ..db.repositories.config_dropdown_repository import ConfigDropdownRepository
from ..db.repositories.dashboard_repository import DashboardRepository
from ..db.repositories.employee_repository import EmployeeRepository
from ..db.repositories.notification_settings_repository import NotificationSettingsRepository
from ..db.repositories.offboarding_task_repository import OffboardingTaskRepository
from ..db.repositories.role_repository import RoleRepository
from ..db.repositories.skill_repository import SkillRepository
from ..services.admin_settings_service import AdminSettingsService
from ..services.dashboard_service import DashboardService
from ..services.employee_service import EmployeeService
from ..services.notification_settings_service import NotificationSettingsService
from ..services.role_service import RoleService
from ..services.skill_service import SkillService

_bearer_scheme = HTTPBearer()


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
) -> str:
    """Validate the JWT bearer token and return the authenticated user's employee ID.

    The token must be signed with HS256 using the configured jwt_secret. The 'sub'
    claim must contain the employee ID (e.g. 'emp_abc123').

    Args:
        credentials: HTTP bearer credentials extracted by FastAPI.

    Returns:
        The employee ID string from the token's 'sub' claim.

    Raises:
        HTTPException 401: If the token is missing, expired, or invalid.
    """
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.jwt_secret,
            algorithms=["HS256"],
        )
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing subject claim.",
            )
        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired.",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token.",
        )


def get_db() -> Generator[Session, None, None]:
    """Provide a transactional database session for a single request.

    Commits on success, rolls back on any exception, and always closes the
    session so the connection is returned to the pool.
    """
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_dashboard_service(session: Session = Depends(get_db)) -> DashboardService:
    """Provide a DashboardService backed by a transactional database session."""
    repository = DashboardRepository(session)
    return DashboardService(repository=repository)


def get_employee_service(session: Session = Depends(get_db)) -> EmployeeService:
    """Provide an EmployeeService backed by a transactional database session."""
    repository = EmployeeRepository(session)
    task_repository = OffboardingTaskRepository(session)
    role_repository = RoleRepository(session)
    return EmployeeService(repository=repository, task_repository=task_repository, role_repository=role_repository)


def get_admin_settings_service(session: Session = Depends(get_db)) -> AdminSettingsService:
    """Provide an AdminSettingsService backed by a transactional database session."""
    repository = ConfigDropdownRepository(session)
    employee_repository = EmployeeRepository(session)
    return AdminSettingsService(repository=repository, employee_repository=employee_repository)


def get_role_service(session: Session = Depends(get_db)) -> RoleService:
    """Provide a RoleService backed by a transactional database session."""
    repository = RoleRepository(session)
    employee_repository = EmployeeRepository(session)
    return RoleService(repository=repository, employee_repository=employee_repository)


def get_notification_settings_service(
    session: Session = Depends(get_db),
) -> NotificationSettingsService:
    """Provide a NotificationSettingsService backed by a transactional database session."""
    repository = NotificationSettingsRepository(session)
    return NotificationSettingsService(repository=repository)



def get_skill_service(session: Session = Depends(get_db)) -> SkillService:
    """Provide a SkillService backed by a transactional database session."""
    repository = SkillRepository(session)
    return SkillService(repository=repository)


def require_permission(module: str, action: str):
    """FastAPI dependency factory — raises HTTP 403 if user lacks (module, action).

    Permission enforcement can be disabled explicitly via the SKIP_PERMISSION_CHECKS
    environment variable. This must only be set in local development environments.
    """
    def _check(
        user_id: str = Depends(get_current_user_id),
        service: RoleService = Depends(get_role_service),
    ) -> str:
        if settings.skip_permission_checks:
            return user_id
        if not service.check_permission(user_id, module, action):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {module}.{action}",
            )
        return user_id
    return _check


def get_request_id(request: Request) -> str:
    """Return the request ID attached to the current request by RequestIDMiddleware."""
    return request.state.request_id
