"""Seed missing dropdown categories required by the admin settings UI.

Revision ID: 0022
Revises: 0021
Create Date: 2026-03-18

Changes:
- Seeds intake / department_function (shown as "Department / Function" in admin UI)
- Seeds onboarding / task_category   (shown as "Task Categories" in admin UI)
- Seeds audit / log_category         (shown as "Log Categories" in admin UI)

All inserts use ON CONFLICT DO NOTHING so this is safe to re-run.
"""

from datetime import datetime, timezone

from alembic import op
from sqlalchemy import text

revision: str = "0022"
down_revision: str = "0021"
branch_labels = None
depends_on = None

_NOW = datetime.now(timezone.utc).isoformat()

_DROPDOWN_ROWS: list[tuple[str, str, str, str, int]] = [
    # intake / department_function
    ("cd_df_001", "intake", "department_function", "Engineering",   1),
    ("cd_df_002", "intake", "department_function", "Product",       2),
    ("cd_df_003", "intake", "department_function", "Design",        3),
    ("cd_df_004", "intake", "department_function", "Marketing",     4),
    ("cd_df_005", "intake", "department_function", "Sales",         5),
    ("cd_df_006", "intake", "department_function", "Operations",    6),
    ("cd_df_007", "intake", "department_function", "Finance",       7),
    ("cd_df_008", "intake", "department_function", "Human_Resources", 8),
    ("cd_df_009", "intake", "department_function", "IT",            9),
    ("cd_df_010", "intake", "department_function", "Legal",         10),
    # onboarding / task_category
    ("cd_tc_001", "onboarding", "task_category", "IT_Setup",             1),
    ("cd_tc_002", "onboarding", "task_category", "HR_Onboarding",        2),
    ("cd_tc_003", "onboarding", "task_category", "Equipment",            3),
    ("cd_tc_004", "onboarding", "task_category", "Access_And_Credentials", 4),
    ("cd_tc_005", "onboarding", "task_category", "Training",             5),
    ("cd_tc_006", "onboarding", "task_category", "Team_Introduction",    6),
    # audit / log_category
    ("cd_lc_001", "audit", "log_category", "Authentication",        1),
    ("cd_lc_002", "audit", "log_category", "Data_Access",           2),
    ("cd_lc_003", "audit", "log_category", "Configuration_Change",  3),
    ("cd_lc_004", "audit", "log_category", "Employee_Event",        4),
    ("cd_lc_005", "audit", "log_category", "System_Error",          5),
    ("cd_lc_006", "audit", "log_category", "Integration",           6),
]


def upgrade() -> None:
    conn = op.get_bind()
    for row_id, module, category, value, sort_order in _DROPDOWN_ROWS:
        conn.execute(
            text("""
                INSERT INTO config_dropdowns
                    (id, module, category, value, sort_order, is_active, created_at, updated_at)
                VALUES
                    (:id, :module, :category, :value, :sort_order, true, :now, :now)
                ON CONFLICT (module, category, value) DO NOTHING
            """),
            {
                "id": row_id,
                "module": module,
                "category": category,
                "value": value,
                "sort_order": sort_order,
                "now": _NOW,
            },
        )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        text("DELETE FROM config_dropdowns WHERE id = ANY(:ids)"),
        {"ids": [r[0] for r in _DROPDOWN_ROWS]},
    )
