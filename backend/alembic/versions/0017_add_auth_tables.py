"""Add oauth_states and one_time_codes tables for SSO auth flow.

oauth_states: Short-lived CSRF state tokens (10-minute TTL).
one_time_codes: Single-use codes the frontend exchanges for a JWT (5-minute TTL).

Revision ID: 0017
Revises: 0016
"""

from alembic import op
import sqlalchemy as sa

revision: str = "0017"
down_revision: str = "0016"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "oauth_states",
        sa.Column("state", sa.String(255), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("idx_oauth_states_expires_at", "oauth_states", ["expires_at"])

    op.create_table(
        "one_time_codes",
        sa.Column("code", sa.String(255), primary_key=True),
        sa.Column("employee_id", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("idx_one_time_codes_employee_id", "one_time_codes", ["employee_id"])
    op.create_index("idx_one_time_codes_expires_at", "one_time_codes", ["expires_at"])


def downgrade() -> None:
    op.drop_index("idx_one_time_codes_expires_at", table_name="one_time_codes")
    op.drop_index("idx_one_time_codes_employee_id", table_name="one_time_codes")
    op.drop_table("one_time_codes")
    op.drop_index("idx_oauth_states_expires_at", table_name="oauth_states")
    op.drop_table("oauth_states")
