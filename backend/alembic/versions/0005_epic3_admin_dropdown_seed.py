"""Epic 3: seed initial config_dropdown values for employee and global fields.

Revision ID: 0005
Revises: 0004
Create Date: 2026-03-12

Changes:
- Seeds config_dropdowns with initial values for:
    module=employees / category=hire_type  (full_time, part_time, contractor, intern)
    module=employees / category=work_mode  (onsite, remote, hybrid)
    module=employees / category=department (empty — admins populate via UI)
    module=global    / category=location   (empty — admins populate via UI)
"""

from datetime import datetime, timezone

from alembic import op
from sqlalchemy import text

revision: str = "0005"
down_revision: str = "0004"
branch_labels = None
depends_on = None

_NOW = datetime.now(timezone.utc).isoformat()

_SEED_ROWS = [
    # hire_type
    ("cd_hire_full_time",  "employees", "hire_type", "full_time",   1),
    ("cd_hire_part_time",  "employees", "hire_type", "part_time",   2),
    ("cd_hire_contractor", "employees", "hire_type", "contractor",  3),
    ("cd_hire_intern",     "employees", "hire_type", "intern",      4),
    # work_mode
    ("cd_mode_onsite",  "employees", "work_mode", "onsite",  1),
    ("cd_mode_remote",  "employees", "work_mode", "remote",  2),
    ("cd_mode_hybrid",  "employees", "work_mode", "hybrid",  3),
]


def upgrade() -> None:
    conn = op.get_bind()
    for row_id, module, category, value, sort_order in _SEED_ROWS:
        conn.execute(text("""
            INSERT INTO config_dropdowns
                (id, module, category, value, sort_order, is_active, created_at, updated_at)
            VALUES
                (:id, :module, :category, :value, :sort_order, true, :now, :now)
            ON CONFLICT (module, category, value) DO NOTHING
        """), {
            "id": row_id,
            "module": module,
            "category": category,
            "value": value,
            "sort_order": sort_order,
            "now": _NOW,
        })


def downgrade() -> None:
    conn = op.get_bind()
    ids = [row[0] for row in _SEED_ROWS]
    conn.execute(
        text("DELETE FROM config_dropdowns WHERE id = ANY(:ids)"),
        {"ids": ids},
    )
