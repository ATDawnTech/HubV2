"""Add updated_at and deleted_at to entra_group_role_mappings.

Revision ID: 0023
Revises: 0022
Create Date: 2026-03-18

Changes:
- Adds updated_at (nullable DateTime) to entra_group_role_mappings
- Adds deleted_at (nullable DateTime) to entra_group_role_mappings
- Backfills updated_at with created_at for existing rows
- Adds index on deleted_at for soft-delete filtering

Rationale: entra_group_role_mappings is a business configuration table
(managed by admins via the admin UI) and must carry the standard
updated_at/deleted_at columns per postgresql.md R2.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision: str = "0023"
down_revision: str = "0022"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "entra_group_role_mappings",
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "entra_group_role_mappings",
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    # Backfill updated_at with created_at for all existing rows
    op.get_bind().execute(
        text("UPDATE entra_group_role_mappings SET updated_at = created_at WHERE updated_at IS NULL")
    )
    op.create_index(
        "idx_entra_group_mappings_deleted_at",
        "entra_group_role_mappings",
        ["deleted_at"],
    )


def downgrade() -> None:
    op.drop_index("idx_entra_group_mappings_deleted_at", table_name="entra_group_role_mappings")
    op.drop_column("entra_group_role_mappings", "deleted_at")
    op.drop_column("entra_group_role_mappings", "updated_at")
