"""Epic 3.3: extend roles table and add role_grant_permissions.

Revision ID: 0006
Revises: 0005
Create Date: 2026-03-12

Changes:
- Adds is_manager_type, linked_department, dashboard_config columns to roles
- Creates role_grant_permissions junction table (assignment hierarchy)
- Seeds three system roles: System Administrator, HR Manager, Staff
"""

from datetime import datetime, timezone

from alembic import op
from sqlalchemy import text

revision: str = "0006"
down_revision: str = "0005"
branch_labels = None
depends_on = None

_NOW = datetime.now(timezone.utc).isoformat()

_SYSTEM_ROLES = [
    ("role_sys_admin", "System Administrator", "Full system access.", True),
    ("role_sys_hr",    "HR Manager",           "Human resources management access.", False),
    ("role_sys_staff", "Staff",                "Standard employee access.", False),
]


def upgrade() -> None:
    conn = op.get_bind()

    # 1. Extend the roles table
    conn.execute(text(
        "ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_manager_type BOOLEAN NOT NULL DEFAULT false"
    ))
    conn.execute(text(
        "ALTER TABLE roles ADD COLUMN IF NOT EXISTS linked_department VARCHAR(255)"
    ))
    conn.execute(text(
        "ALTER TABLE roles ADD COLUMN IF NOT EXISTS dashboard_config TEXT"
    ))

    # 2. Create role_grant_permissions junction table
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS role_grant_permissions (
            granting_role_id  VARCHAR(255) NOT NULL REFERENCES roles(id),
            assignable_role_id VARCHAR(255) NOT NULL REFERENCES roles(id),
            created_at        TIMESTAMP WITH TIME ZONE NOT NULL,
            PRIMARY KEY (granting_role_id, assignable_role_id)
        )
    """))
    conn.execute(text(
        "CREATE INDEX IF NOT EXISTS idx_role_grant_permissions_granting "
        "ON role_grant_permissions (granting_role_id)"
    ))
    conn.execute(text(
        "CREATE INDEX IF NOT EXISTS idx_role_grant_permissions_assignable "
        "ON role_grant_permissions (assignable_role_id)"
    ))

    # 3. Seed system roles
    for role_id, name, description, is_system in _SYSTEM_ROLES:
        conn.execute(text("""
            INSERT INTO roles (id, name, description, is_system, is_manager_type, created_at, updated_at)
            VALUES (:id, :name, :desc, :is_system, false, :now, :now)
            ON CONFLICT (name) DO NOTHING
        """), {
            "id": role_id,
            "name": name,
            "desc": description,
            "is_system": is_system,
            "now": _NOW,
        })


def downgrade() -> None:
    conn = op.get_bind()

    # Remove seeded system roles (only if they have no assignments)
    ids = [r[0] for r in _SYSTEM_ROLES]
    conn.execute(
        text("DELETE FROM roles WHERE id = ANY(:ids) AND is_system = true"),
        {"ids": ids},
    )

    conn.execute(text("DROP TABLE IF EXISTS role_grant_permissions"))

    conn.execute(text("ALTER TABLE roles DROP COLUMN IF EXISTS is_manager_type"))
    conn.execute(text("ALTER TABLE roles DROP COLUMN IF EXISTS linked_department"))
    conn.execute(text("ALTER TABLE roles DROP COLUMN IF EXISTS dashboard_config"))
