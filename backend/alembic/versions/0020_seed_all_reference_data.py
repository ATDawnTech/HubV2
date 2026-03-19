"""Seed all reference data — dropdowns, custom roles, and Entra group mappings.

Revision ID: 0020
Revises: 0019
Create Date: 2026-03-18

Changes:
- Seeds config_dropdowns for:
    assets / asset_status, condition, item_type, manufacturer
    audit  / event_severity
    global / hire_type (Staff_Augmentation), location (Australia)
    intake / currency, hire_for, requisition_status
    onboarding / provisioning_stage
- Seeds the Developers custom role
- Seeds Entra group → role mappings:
    System Admins  → role_sys_admin
    Developers     → role_e333f69794fb4989

All inserts use ON CONFLICT DO NOTHING so the migration is safe to run
on environments that already have this data.
"""

from datetime import datetime, timezone

from alembic import op
from sqlalchemy import text

revision: str = "0020"
down_revision: str = "0019"
branch_labels = None
depends_on = None

_NOW = datetime.now(timezone.utc).isoformat()

# ---------------------------------------------------------------------------
# Dropdown seed rows: (id, module, category, value, sort_order)
# ---------------------------------------------------------------------------

_DROPDOWN_ROWS = [
    # assets / asset_status
    ("cd_4a8292a6f224f152", "assets", "asset_status", "Assigned_Available", 1),
    ("cd_971ff6ec5780e14d", "assets", "asset_status", "Assigned",           1),
    ("cd_fc490c34b56eff8d", "assets", "asset_status", "Available",          2),
    ("cd_05719445e3375155", "assets", "asset_status", "In_Repair",          3),
    ("cd_c3321df7b7ad2457", "assets", "asset_status", "Lost",               4),
    ("cd_f2b3f1883dee1637", "assets", "asset_status", "Retired",            5),
    # assets / condition
    ("cd_c04e40257ceec48d", "assets", "condition", "Assigned",  1),
    ("cd_c0edd905cd499729", "assets", "condition", "Available", 2),
    ("cd_9025c161889151a4", "assets", "condition", "In_Repair", 3),
    ("cd_5a97e23b237d40ec", "assets", "condition", "Lost",      4),
    ("cd_8040352cb20ddf86", "assets", "condition", "Retired",   5),
    # assets / item_type
    ("cd_56b83685ed0f6456", "assets", "item_type", "Headphones", 1),
    ("cd_1b59b337edcff8be", "assets", "item_type", "Keyboard",   2),
    ("cd_83228201755c12e6", "assets", "item_type", "Laptop",     3),
    ("cd_59e7a3d9fa8e2523", "assets", "item_type", "Monitor",    4),
    ("cd_00e190e3639543eb", "assets", "item_type", "Mouse",      5),
    ("cd_1d6cb42537ce0d6a", "assets", "item_type", "Printer",    6),
    # assets / manufacturer
    ("cd_599deb6760045145", "assets", "manufacturer", "Macbook", 1),
    # audit / event_severity
    ("cd_d0217452f9777025", "audit", "event_severity", "Critical", 1),
    ("cd_36700bd6bc6b80ff", "audit", "event_severity", "High",     2),
    ("cd_0edb602979394e00", "audit", "event_severity", "Medium",   3),
    ("cd_cab27a89074588d0", "audit", "event_severity", "Low",      4),
    # global / hire_type — Staff_Augmentation (Contract/Full_Time/Part_Time are in 0019)
    ("cd_5addab19d32f7dbe", "global", "hire_type", "Staff_Augmentation", 4),
    # global / location — Australia (Vietnam/Singapore/India/United_States in 0019)
    ("cd_48f8021a8ea84f94", "global", "location", "Australia", 1),
    # intake / currency
    ("cd_a722a2d6c20a043f", "intake", "currency", "AUD", 1),
    ("cd_9253a553a13a8ad1", "intake", "currency", "IND", 2),
    ("cd_87a784dc7779b3f7", "intake", "currency", "SGD", 3),
    ("cd_cda0ca503a6e9852", "intake", "currency", "USD", 4),
    ("cd_cf2c3b86d6712674", "intake", "currency", "VND", 5),
    # intake / hire_for
    ("cd_f5eab1a4dc4794e9", "intake", "hire_for", "Internal",          1),
    ("cd_3109de6cec8fdb79", "intake", "hire_for", "External",          2),
    ("cd_dbf47e1226bd82a8", "intake", "hire_for", "Staff_Augmentation", 3),
    # intake / requisition_status
    ("cd_cf035bdb0092f572", "intake", "requisition_status", "Budget_Pending",   1),
    ("cd_6910693045cd5517", "intake", "requisition_status", "Pending_Approval", 1),
    ("cd_ee509be3c4e11465", "intake", "requisition_status", "Paused",           2),
    ("cd_e2a3f0f0a98c6406", "intake", "requisition_status", "Rejected",         3),
    ("cd_179c12bc606d1bfa", "intake", "requisition_status", "Budget_Approved",  4),
    # onboarding / provisioning_stage
    ("cd_d3fd59f927cd2060", "onboarding", "provisioning_stage", "Completed",   1),
    ("cd_3368fae82d153c05", "onboarding", "provisioning_stage", "In_Progress", 2),
    ("cd_312bc1472866cf47", "onboarding", "provisioning_stage", "Not_Started", 3),
    ("cd_9e9c634479b5b921", "onboarding", "provisioning_stage", "Paused",      4),
    ("cd_b1abc9f61abfd616", "onboarding", "provisioning_stage", "Resume",      5),
]

# ---------------------------------------------------------------------------
# Custom roles: (id, name, description, is_system, sort_order)
# ---------------------------------------------------------------------------

_ROLE_ROWS = [
    ("role_e333f69794fb4989", "Developers",      "For the devs of ADTHub", False, 1),
    ("role_e2d379a2f729bacc", "IT",              None,                     False, 2),
    ("role_818acff8bbd7930c", "Human Resources", None,                     False, 3),
    ("role_6b891619aeffe82e", "Finance",         None,                     False, 4),
]

# ---------------------------------------------------------------------------
# Entra group → role mappings: (id, entra_group_id, entra_group_name, role_id)
# ---------------------------------------------------------------------------

_ENTRA_MAPPING_ROWS = [
    (
        "egm_30490eb7b85960e4",
        "60fe326c-fd24-4e42-af98-0290f9b177be",
        "System Admins",
        "role_sys_admin",
    ),
    (
        "egm_3f4c9ccc70a93de4",
        "e8fe40f3-817e-4510-9970-ebd1ee4b1e2c",
        "Developers",
        "role_e333f69794fb4989",
    ),
]


def upgrade() -> None:
    conn = op.get_bind()

    # Dropdowns
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

    # Custom roles
    for role_id, name, description, is_system, sort_order in _ROLE_ROWS:
        conn.execute(
            text("""
                INSERT INTO roles
                    (id, name, description, is_system, sort_order, created_at, updated_at)
                VALUES
                    (:id, :name, :description, :is_system, :sort_order, :now, :now)
                ON CONFLICT (id) DO NOTHING
            """),
            {
                "id": role_id,
                "name": name,
                "description": description,
                "is_system": is_system,
                "sort_order": sort_order,
                "now": _NOW,
            },
        )

    # Entra group mappings (depends on roles existing first)
    for map_id, group_id, group_name, role_id in _ENTRA_MAPPING_ROWS:
        conn.execute(
            text("""
                INSERT INTO entra_group_role_mappings
                    (id, entra_group_id, entra_group_name, role_id, created_at)
                VALUES
                    (:id, :entra_group_id, :entra_group_name, :role_id, :now)
                ON CONFLICT (entra_group_id) DO NOTHING
            """),
            {
                "id": map_id,
                "entra_group_id": group_id,
                "entra_group_name": group_name,
                "role_id": role_id,
                "now": _NOW,
            },
        )


def downgrade() -> None:
    conn = op.get_bind()
    role_ids = [r[0] for r in _ROLE_ROWS]

    conn.execute(
        text("DELETE FROM entra_group_role_mappings WHERE id = ANY(:ids)"),
        {"ids": [r[0] for r in _ENTRA_MAPPING_ROWS]},
    )
    # Remove dependent rows before deleting the roles themselves
    conn.execute(
        text("DELETE FROM permissions WHERE role_id = ANY(:ids)"),
        {"ids": role_ids},
    )
    conn.execute(
        text("DELETE FROM role_assignments WHERE role_id = ANY(:ids)"),
        {"ids": role_ids},
    )
    conn.execute(
        text("DELETE FROM roles WHERE id = ANY(:ids) AND is_system = false"),
        {"ids": role_ids},
    )
    conn.execute(
        text("DELETE FROM config_dropdowns WHERE id = ANY(:ids)"),
        {"ids": [r[0] for r in _DROPDOWN_ROWS]},
    )
