"""Add dashboard_tasks table for cross-module task aggregation (Epic 1).

Revision ID: 0003
Revises: 0002
Create Date: 2026-03-12
"""

from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create dashboard_tasks table."""
    op.create_table(
        "dashboard_tasks",
        sa.Column("id", sa.String(255), primary_key=True),
        sa.Column("module", sa.String(50), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("source_record_id", sa.String(255), nullable=False),
        sa.Column(
            "assigned_to_id",
            sa.String(255),
            sa.ForeignKey("employees.id"),
            nullable=True,
        ),
        sa.Column("deadline", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="open"),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    op.create_check_constraint(
        "ck_dashboard_tasks_status",
        "dashboard_tasks",
        "status IN ('open', 'completed')",
    )
    op.create_check_constraint(
        "ck_dashboard_tasks_module",
        "dashboard_tasks",
        "module IN ('employees', 'admin', 'assets', 'intake', 'onboarding', "
        "'projects', 'audit', 'timesheets', 'productivity', 'ats')",
    )

    op.create_index("idx_dashboard_tasks_assigned_to_id", "dashboard_tasks", ["assigned_to_id"])
    op.create_index("idx_dashboard_tasks_status", "dashboard_tasks", ["status"])
    op.create_index("idx_dashboard_tasks_module", "dashboard_tasks", ["module"])
    op.create_index("idx_dashboard_tasks_deadline", "dashboard_tasks", ["deadline"])


def downgrade() -> None:
    """Drop dashboard_tasks table."""
    op.drop_index("idx_dashboard_tasks_deadline", table_name="dashboard_tasks")
    op.drop_index("idx_dashboard_tasks_module", table_name="dashboard_tasks")
    op.drop_index("idx_dashboard_tasks_status", table_name="dashboard_tasks")
    op.drop_index("idx_dashboard_tasks_assigned_to_id", table_name="dashboard_tasks")
    op.drop_table("dashboard_tasks")
