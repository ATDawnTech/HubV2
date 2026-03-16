"""Enforce NOT NULL on skills_catalog.search_tokens.

Revision ID: 0015
Revises: 0014
Create Date: 2026-03-16

Changes:
- Backfills any NULL search_tokens rows with '' (safety step)
- Adds NOT NULL constraint to skills_catalog.search_tokens
- Drops the DEFAULT '' server default added by migration 0009 to align
  with the SQLAlchemy model (no default; the service always sets the value)

Migration 0009 added the column as TEXT DEFAULT '' without NOT NULL.
"""

from alembic import op
from sqlalchemy import text

revision: str = "0015"
down_revision: str = "0014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    # Safety backfill: any row that slipped through with NULL gets an empty string.
    conn.execute(
        text("UPDATE skills_catalog SET search_tokens = '' WHERE search_tokens IS NULL")
    )
    op.alter_column("skills_catalog", "search_tokens", nullable=False, server_default=None)


def downgrade() -> None:
    op.alter_column("skills_catalog", "search_tokens", nullable=True, server_default="")
