from datetime import UTC, datetime

from sqlalchemy import Column, DateTime, Index, String

from ..base import Base


class OAuthState(Base):
    """Short-lived CSRF state token generated at the start of each login flow.

    Created when the user hits /v1/auth/login. Validated and deleted when
    Microsoft redirects back to /v1/auth/callback. Expires after 10 minutes.
    """

    __tablename__ = "oauth_states"

    state = Column(String(255), primary_key=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
    )
    expires_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (Index("idx_oauth_states_expires_at", "expires_at"),)


class OneTimeCode(Base):
    """Short-lived code exchanged by the frontend for a JWT after callback.

    Created in /v1/auth/callback, consumed once in POST /v1/auth/token.
    Expires after 5 minutes. Deleted on use.
    """

    __tablename__ = "one_time_codes"

    code = Column(String(255), primary_key=True)
    employee_id = Column(String(255), nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
    )
    expires_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_one_time_codes_employee_id", "employee_id"),
        Index("idx_one_time_codes_expires_at", "expires_at"),
    )
