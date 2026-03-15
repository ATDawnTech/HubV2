"""Add manager_permissions column to roles table.

Revision ID: 0012
Revises: 0011
Create Date: 2026-03-14
"""

from alembic import op
import sqlalchemy as sa

revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # JSON array of {module, action} pairs granted to manager-level holders of this role
    op.add_column(
        "roles",
        sa.Column("manager_permissions", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("roles", "manager_permissions")
