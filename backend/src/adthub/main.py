"""ADT Hub V2 FastAPI application entry point.

Configures all global middleware, CORS, rate limiting, and registers API routers.
No business logic lives here — all route logic is in api/ modules.
"""

import secrets
from datetime import UTC

import structlog
from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import Depends, FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sqlalchemy import text
from sqlalchemy.orm import Session
from starlette.middleware.base import BaseHTTPMiddleware

from .api.admin_settings import router as admin_settings_router
from .api.auth import router as auth_router
from .api.dashboard import router as dashboard_router
from .api.dependencies import get_db
from .api.dev import router as dev_router
from .api.employees import router as employees_router
from .api.entra_sync import router as entra_sync_router
from .api.notifications import router as notifications_router
from .api.roles import router as roles_router
from .api.skills import router as skills_router
from .config import settings
from .lib.logging import configure_logging

# ---------------------------------------------------------------------------
# Logging — must be configured before any logger is used.
# ---------------------------------------------------------------------------
configure_logging()
logger = structlog.get_logger()

# ---------------------------------------------------------------------------
# Rate limiter
# ---------------------------------------------------------------------------
limiter = Limiter(key_func=get_remote_address)
_scheduler = BackgroundScheduler()


# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------
app = FastAPI(
    title="ADT Hub API",
    version="1.0.0",
    docs_url="/docs" if settings.environment != "prod" else None,
    redoc_url="/redoc" if settings.environment != "prod" else None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ---------------------------------------------------------------------------
# Middleware — applied in reverse order (last added = outermost wrapper).
# ---------------------------------------------------------------------------

class RequestIDMiddleware(BaseHTTPMiddleware):
    """Attach a unique request ID to every request, echo it in the response,
    and bind it to the structlog context for the duration of the request.
    """

    async def dispatch(self, request: Request, call_next):  # type: ignore[override]
        request_id = request.headers.get("X-Request-ID") or f"req_{secrets.token_hex(8)}"
        request.state.request_id = request_id
        with structlog.contextvars.bound_contextvars(
            request_id=request_id,
            environment=settings.environment,
        ):
            response = await call_next(request)
            response.headers["X-Request-ID"] = request_id
            return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add OWASP-recommended security headers to every HTTP response."""

    async def dispatch(self, request: Request, call_next):  # type: ignore[override]
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = "default-src 'self'; img-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self';"
        if "server" in response.headers:
            del response.headers["server"]
        return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_allowed_origins(),
    allow_origin_regex=r"http://localhost:\d+" if settings.environment == "local" else None,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)
app.add_middleware(RequestIDMiddleware)


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(admin_settings_router)
app.include_router(employees_router)
app.include_router(roles_router)
app.include_router(notifications_router)
app.include_router(skills_router)
app.include_router(entra_sync_router)
if settings.environment == "local":
    app.include_router(dev_router)


# ---------------------------------------------------------------------------
# Health check — unauthenticated, not rate-limited.
# Checks database connectivity; returns 503 if any dependency is unhealthy.
# ---------------------------------------------------------------------------
@app.get("/health", include_in_schema=False)
def health_check(
    response: Response,
    db: Session = Depends(get_db),
) -> dict:
    """Service health check.

    Verifies the service and its critical dependencies are operational.
    Returns 200 if healthy, 503 if any critical dependency is unavailable.
    """
    checks: dict[str, str] = {}

    try:
        db.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as e:
        logger.error(
            "Health check: database unavailable.",
            error_type=type(e).__name__,
        )
        checks["database"] = "unavailable"

    is_healthy = all(v == "ok" for v in checks.values())

    if not is_healthy:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return {
        "status": "healthy" if is_healthy else "unhealthy",
        "checks": checks,
        "environment": settings.environment,
    }


# ---------------------------------------------------------------------------
# Startup / shutdown log events
# ---------------------------------------------------------------------------
@app.on_event("startup")
def on_startup() -> None:
    logger.info(
        "Service starting.",
        service="adthub-api",
        version=app.version,
        environment=settings.environment,
    )
    if settings.environment == "local":
        _seed_dev_user()

    if settings.azure_client_id and settings.entra_sync_interval_hours > 0:
        from .services.entra_sync_service import run_scheduled_sync
        _scheduler.add_job(
            run_scheduled_sync,
            "interval",
            hours=settings.entra_sync_interval_hours,
            id="entra_sync",
        )
        _scheduler.start()
        logger.info(
            "Entra sync scheduler started.",
            interval_hours=settings.entra_sync_interval_hours,
        )


def _seed_dev_user() -> None:
    """Insert dev employees if they don't already exist.

    Seeds both the default dev identity and the role-tester identity so that
    role assignment FK constraints are satisfied during local development.
    """
    from datetime import datetime

    from .db.engine import SessionLocal
    from .db.models.employees import Employee

    dev_users = [
        {
            "id": "emp_dev_local",
            "first_name": "Dev",
            "last_name": "User",
            "work_email": "dev@adthub.local",
            "employee_code": "ATD-0000",
            "job_title": "Developer",
            "department": "Engineering",
        },
        {
            "id": "emp_role_tester",
            "first_name": "Role",
            "last_name": "Tester",
            "work_email": "role-tester@adthub.local",
            "employee_code": "ATD-TEST",
            "job_title": "Role Tester",
            "department": "Engineering",
        },
    ]

    session = SessionLocal()
    try:
        now = datetime.now(UTC)
        for user in dev_users:
            existing = session.query(Employee).filter_by(id=user["id"]).first()
            if existing is None:
                session.add(Employee(
                    **user,
                    status="active",
                    created_at=now,
                    updated_at=now,
                ))
                logger.info("Dev user seeded.", employee_id=user["id"])
            else:
                logger.debug("Dev user already exists.", employee_id=user["id"])
        session.commit()
    except Exception:
        session.rollback()
        logger.warning("Failed to seed dev users — table may not exist yet.")
    finally:
        session.close()


@app.on_event("shutdown")
def on_shutdown() -> None:
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
    logger.info("Service shutting down.", service="adthub-api")
