"""Roles redesign: per-assignment manager context, auto-assign departments.

Revision ID: 0010
Revises: 0009
Create Date: 2026-03-13

Changes:
- roles table: remove is_manager_type, linked_department columns
- roles table: add auto_assign_departments (TEXT, JSON array of dept values)
- role_assignments table: add is_manager (BOOLEAN, default FALSE)
- role_assignments table: add manager_permissions (TEXT, JSON array of {module,action})
"""

from alembic import op
from sqlalchemy import text

revision: str = "0010"
down_revision: str = "0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    # --- roles table ---
    # Add auto_assign_departments (replaces linked_department for auto-assign logic)
    conn.execute(text(
        "ALTER TABLE roles ADD COLUMN IF NOT EXISTS auto_assign_departments TEXT"
    ))
    # Migrate existing linked_department values into JSON array format
    conn.execute(text("""
        UPDATE roles
        SET auto_assign_departments = json_array(linked_department)
        WHERE linked_department IS NOT NULL AND linked_department != ''
    """))
    # Drop old columns
    conn.execute(text("ALTER TABLE roles DROP COLUMN IF EXISTS is_manager_type"))
    conn.execute(text("ALTER TABLE roles DROP COLUMN IF EXISTS linked_department"))

    # --- role_assignments table ---
    conn.execute(text(
        "ALTER TABLE role_assignments ADD COLUMN IF NOT EXISTS is_manager BOOLEAN NOT NULL DEFAULT FALSE"
    ))
    conn.execute(text(
        "ALTER TABLE role_assignments ADD COLUMN IF NOT EXISTS manager_permissions TEXT"
    ))


def downgrade() -> None:
    conn = op.get_bind()

    # role_assignments
    conn.execute(text("ALTER TABLE role_assignments DROP COLUMN IF EXISTS is_manager"))
    conn.execute(text("ALTER TABLE role_assignments DROP COLUMN IF EXISTS manager_permissions"))

    # roles — restore old columns
    conn.execute(text(
        "ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_manager_type BOOLEAN NOT NULL DEFAULT FALSE"
    ))
    conn.execute(text(
        "ALTER TABLE roles ADD COLUMN IF NOT EXISTS linked_department VARCHAR(255)"
    ))
    conn.execute(text("ALTER TABLE roles DROP COLUMN IF EXISTS auto_assign_departments"))
