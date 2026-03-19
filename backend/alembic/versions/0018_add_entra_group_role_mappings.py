"""Add entra_group_role_mappings table.

Maps Microsoft Entra security group IDs to HubV2 app roles.
Used by the SSO login flow to auto-assign roles based on group membership.

Revision ID: 0018
Revises: 0017
"""

from alembic import op
import sqlalchemy as sa

revision: str = "0018"
down_revision: str = "0017"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "entra_group_role_mappings",
        sa.Column("id", sa.String(255), primary_key=True),
        sa.Column("entra_group_id", sa.String(255), nullable=False, unique=True),
        sa.Column("entra_group_name", sa.String(255), nullable=False),
        sa.Column("role_id", sa.String(255), sa.ForeignKey("roles.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("idx_entra_group_mappings_role_id", "entra_group_role_mappings", ["role_id"])


def downgrade() -> None:
    op.drop_index("idx_entra_group_mappings_role_id", table_name="entra_group_role_mappings")
    op.drop_table("entra_group_role_mappings")
