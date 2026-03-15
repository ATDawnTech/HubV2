"""Epic 2: add new_onboard status and offboarding_tasks table.

Revision ID: 0004
Revises: 0003
Create Date: 2026-03-12

Changes:
- employees.status: add 'new_onboard' to the allowed values check constraint
- offboarding_tasks: create table for the Offboarding Hub (Feature 2.10)
"""

from alembic import op
from sqlalchemy import text
import sqlalchemy as sa

revision: str = "0004"
down_revision: str = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    # 1. Widen employees status check to include 'new_onboard'
    #    Drop first (idempotent: ignore if not exists)
    conn.execute(text(
        "ALTER TABLE employees DROP CONSTRAINT IF EXISTS ck_employees_status"
    ))
    conn.execute(text(
        "ALTER TABLE employees ADD CONSTRAINT ck_employees_status "
        "CHECK (status IN ('new_onboard', 'active', 'archiving', 'archived'))"
    ))

    # 2. Create offboarding_tasks table (idempotent)
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS offboarding_tasks (
            id VARCHAR(255) PRIMARY KEY,
            employee_id VARCHAR(255) NOT NULL
                REFERENCES employees(id) ON DELETE CASCADE,
            task_type VARCHAR(100) NOT NULL,
            assigned_group VARCHAR(50) NOT NULL,
            assignee_id VARCHAR(255) REFERENCES employees(id),
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            due_at TIMESTAMP WITH TIME ZONE,
            completed_by VARCHAR(255) REFERENCES employees(id),
            completed_at TIMESTAMP WITH TIME ZONE,
            sign_off_notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
            deleted_at TIMESTAMP WITH TIME ZONE
        )
    """))

    # Add check constraints (idempotent)
    conn.execute(text(
        "ALTER TABLE offboarding_tasks "
        "DROP CONSTRAINT IF EXISTS ck_offboarding_tasks_status"
    ))
    conn.execute(text(
        "ALTER TABLE offboarding_tasks ADD CONSTRAINT ck_offboarding_tasks_status "
        "CHECK (status IN ('pending', 'in_progress', 'completed'))"
    ))

    conn.execute(text(
        "ALTER TABLE offboarding_tasks "
        "DROP CONSTRAINT IF EXISTS ck_offboarding_tasks_task_type"
    ))
    conn.execute(text(
        "ALTER TABLE offboarding_tasks ADD CONSTRAINT ck_offboarding_tasks_task_type "
        "CHECK (task_type IN ('email_decommission', 'project_migration', "
        "'asset_retrieval', 'system_account_removal'))"
    ))

    # Add indexes (idempotent)
    conn.execute(text(
        "CREATE INDEX IF NOT EXISTS idx_offboarding_tasks_employee_id "
        "ON offboarding_tasks(employee_id)"
    ))
    conn.execute(text(
        "CREATE INDEX IF NOT EXISTS idx_offboarding_tasks_assignee_id "
        "ON offboarding_tasks(assignee_id)"
    ))
    conn.execute(text(
        "CREATE INDEX IF NOT EXISTS idx_offboarding_tasks_status "
        "ON offboarding_tasks(status)"
    ))


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(text("DROP TABLE IF EXISTS offboarding_tasks"))
    conn.execute(text(
        "ALTER TABLE employees DROP CONSTRAINT IF EXISTS ck_employees_status"
    ))
    conn.execute(text(
        "ALTER TABLE employees ADD CONSTRAINT ck_employees_status "
        "CHECK (status IN ('active', 'archiving', 'archived'))"
    ))
