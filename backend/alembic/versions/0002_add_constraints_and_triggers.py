"""add_constraints_and_triggers

Revision ID: 0002
Revises: 0001
Create Date: 2026-03-11 00:00:00.000000

Adds:
- timesheets.hours CHECK constraint (hours > 0 AND hours <= 24)
- timesheets.employee_id NOT NULL
- timesheets.project_id NOT NULL
- employees.status CHECK constraint
- onboarding_task_dependencies self-reference CHECK
- skills_catalog case-insensitive unique index on lower(name)
- audit_events append-only trigger (no UPDATE/DELETE)
- asset_assignment_history append-only trigger (no UPDATE/DELETE)
"""
from alembic import op
import sqlalchemy as sa

revision: str = "0002"
down_revision: str = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # timesheets: make employee_id and project_id NOT NULL
    op.alter_column("timesheets", "employee_id", nullable=False)
    op.alter_column("timesheets", "project_id", nullable=False)

    # timesheets: add hours range check
    op.create_check_constraint(
        "ck_timesheets_hours_range", "timesheets",
        "hours > 0 AND hours <= 24"
    )

    # employees: add status check
    op.create_check_constraint(
        "ck_employees_status", "employees",
        "status IN ('active', 'archiving', 'archived')"
    )

    # onboarding_task_dependencies: prevent self-reference
    op.create_check_constraint(
        "ck_onboarding_task_dep_no_self_ref", "onboarding_task_dependencies",
        "task_id != depends_on_task_id"
    )

    # skills_catalog: case-insensitive unique via functional index
    op.execute(
        "CREATE UNIQUE INDEX uq_skills_catalog_name_lower ON skills_catalog (lower(name)) "
        "WHERE deleted_at IS NULL"
    )

    # audit_events: append-only trigger (no UPDATE or DELETE)
    op.execute("""
        CREATE OR REPLACE FUNCTION prevent_audit_events_modification()
        RETURNS TRIGGER AS $$
        BEGIN
            RAISE EXCEPTION 'audit_events is append-only: UPDATE and DELETE are not permitted';
        END;
        $$ LANGUAGE plpgsql;
    """)
    op.execute("""
        CREATE TRIGGER trg_audit_events_no_update
        BEFORE UPDATE ON audit_events
        FOR EACH ROW EXECUTE FUNCTION prevent_audit_events_modification();
    """)
    op.execute("""
        CREATE TRIGGER trg_audit_events_no_delete
        BEFORE DELETE ON audit_events
        FOR EACH ROW EXECUTE FUNCTION prevent_audit_events_modification();
    """)

    # asset_assignment_history: append-only trigger (no UPDATE or DELETE)
    op.execute("""
        CREATE OR REPLACE FUNCTION prevent_asset_assignment_history_modification()
        RETURNS TRIGGER AS $$
        BEGIN
            RAISE EXCEPTION 'asset_assignment_history is append-only: UPDATE and DELETE are not permitted';
        END;
        $$ LANGUAGE plpgsql;
    """)
    op.execute("""
        CREATE TRIGGER trg_asset_assignment_history_no_update
        BEFORE UPDATE ON asset_assignment_history
        FOR EACH ROW EXECUTE FUNCTION prevent_asset_assignment_history_modification();
    """)
    op.execute("""
        CREATE TRIGGER trg_asset_assignment_history_no_delete
        BEFORE DELETE ON asset_assignment_history
        FOR EACH ROW EXECUTE FUNCTION prevent_asset_assignment_history_modification();
    """)


def downgrade() -> None:
    op.execute(
        "DROP TRIGGER IF EXISTS trg_asset_assignment_history_no_delete ON asset_assignment_history"
    )
    op.execute(
        "DROP TRIGGER IF EXISTS trg_asset_assignment_history_no_update ON asset_assignment_history"
    )
    op.execute("DROP FUNCTION IF EXISTS prevent_asset_assignment_history_modification()")
    op.execute("DROP TRIGGER IF EXISTS trg_audit_events_no_delete ON audit_events")
    op.execute("DROP TRIGGER IF EXISTS trg_audit_events_no_update ON audit_events")
    op.execute("DROP FUNCTION IF EXISTS prevent_audit_events_modification()")
    op.execute("DROP INDEX IF EXISTS uq_skills_catalog_name_lower")
    op.drop_constraint(
        "ck_onboarding_task_dep_no_self_ref", "onboarding_task_dependencies", type_="check"
    )
    op.drop_constraint("ck_employees_status", "employees", type_="check")
    op.drop_constraint("ck_timesheets_hours_range", "timesheets", type_="check")
    op.alter_column("timesheets", "project_id", nullable=True)
    op.alter_column("timesheets", "employee_id", nullable=True)
