"""Add role_assignment_blacklist table.

Revision ID: 0013
Revises: 0012
Create Date: 2026-03-14
"""

from alembic import op
import sqlalchemy as sa

revision = "0013"
down_revision = "0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "role_assignment_blacklist",
        sa.Column("employee_id", sa.String(255), sa.ForeignKey("employees.id"), nullable=False, primary_key=True),
        sa.Column("role_id", sa.String(255), sa.ForeignKey("roles.id"), nullable=False, primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("idx_role_blacklist_employee_id", "role_assignment_blacklist", ["employee_id"])
    op.create_index("idx_role_blacklist_role_id", "role_assignment_blacklist", ["role_id"])


def downgrade() -> None:
    op.drop_index("idx_role_blacklist_role_id", "role_assignment_blacklist")
    op.drop_index("idx_role_blacklist_employee_id", "role_assignment_blacklist")
    op.drop_table("role_assignment_blacklist")
