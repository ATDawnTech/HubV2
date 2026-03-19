"""Seed config_dropdown values for departments, locations, and global options.

Revision ID: 0019
Revises: 0018
Create Date: 2026-03-18

Changes:
- Seeds config_dropdowns with default values for:
    module=employees / category=department  (Human_Resources, Developers, Finance, IT, Security)
    module=global    / category=hire_type   (Contract, Full_Time, Part_Time)
    module=global    / category=location    (Vietnam, Singapore, India, United_States)
    module=global    / category=work_mode   (Hybrid, Remote, Onsite)
"""

from datetime import datetime, timezone

from alembic import op
from sqlalchemy import text

revision: str = "0019"
down_revision: str = "0018"
branch_labels = None
depends_on = None

_NOW = datetime.now(timezone.utc).isoformat()

_SEED_ROWS = [
    # employees / department
    ("cd_dept_hr",        "employees", "department", "Human_Resources", 1),
    ("cd_dept_dev",       "employees", "department", "Developers",      2),
    ("cd_dept_finance",   "employees", "department", "Finance",         3),
    ("cd_dept_it",        "employees", "department", "IT",              4),
    ("cd_dept_security",  "employees", "department", "Security",        5),
    # global / hire_type
    ("cd_g_hire_contract",   "global", "hire_type", "Contract",  1),
    ("cd_g_hire_full_time",  "global", "hire_type", "Full_Time", 2),
    ("cd_g_hire_part_time",  "global", "hire_type", "Part_Time", 3),
    # global / location
    ("cd_g_loc_vietnam",       "global", "location", "Vietnam",       1),
    ("cd_g_loc_singapore",     "global", "location", "Singapore",     2),
    ("cd_g_loc_india",         "global", "location", "India",         3),
    ("cd_g_loc_united_states", "global", "location", "United_States", 4),
    # global / work_mode
    ("cd_g_mode_hybrid",  "global", "work_mode", "Hybrid",  1),
    ("cd_g_mode_remote",  "global", "work_mode", "Remote",  2),
    ("cd_g_mode_onsite",  "global", "work_mode", "Onsite",  3),
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
