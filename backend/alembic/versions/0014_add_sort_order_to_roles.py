"""Add sort_order to roles table for hierarchy ordering.

Revision ID: 0014
Revises: 0013
Create Date: 2026-03-14
"""

from alembic import op
import sqlalchemy as sa

revision = "0014"
down_revision = "0013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "roles",
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="9999"),
    )
    op.create_index("idx_roles_sort_order", "roles", ["sort_order"])


def downgrade() -> None:
    op.drop_index("idx_roles_sort_order", "roles")
    op.drop_column("roles", "sort_order")
