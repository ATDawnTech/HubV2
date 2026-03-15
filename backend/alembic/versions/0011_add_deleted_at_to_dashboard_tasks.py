"""Add deleted_at to dashboard_tasks for soft-delete support.

Revision ID: 0011
Revises: 0010
Create Date: 2026-03-14

Changes:
- dashboard_tasks table: add deleted_at (TIMESTAMP WITH TIME ZONE, nullable)
"""

import sqlalchemy as sa
from alembic import op

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add deleted_at column to dashboard_tasks."""
    op.add_column(
        "dashboard_tasks",
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    """Remove deleted_at column from dashboard_tasks."""
    op.drop_column("dashboard_tasks", "deleted_at")
