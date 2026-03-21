"""Seed all permissions for the System Administrator role.

Revision ID: 0021
Revises: 0020
Create Date: 2026-03-18

Changes:
- Grants every valid (module, action) permission to role_sys_admin so that
  System Administrators are never blocked by permission checks regardless of
  which routes get gated in future migrations.
- Safe to run on any environment: uses ON CONFLICT DO NOTHING.
"""

from datetime import datetime, timezone

from alembic import op
from sqlalchemy import text

revision: str = "0021"
down_revision: str = "0020"
branch_labels = None
depends_on = None

_NOW = datetime.now(timezone.utc).isoformat()
_ROLE_ID = "role_sys_admin"

# Every valid permission pair — must stay in sync with _VALID_PERMISSIONS
# in src/adthub/services/role_service.py.
_PERMISSIONS: list[tuple[str, str]] = [
    # Module visibility
    ("employees",         "view_module"),
    ("assets",            "view_module"),
    ("intake",            "view_module"),
    ("onboarding",        "view_module"),
    ("offboarding",       "view_module"),
    ("admin",             "view_module"),
    ("project_management","view_module"),
    ("audit",             "view_module"),
    ("timesheets",        "view_module"),
    ("productivity",      "view_module"),
    ("ats",               "view_module"),
    # Employees
    ("employees", "create_employee"),
    ("employees", "archive_employee"),
    ("employees", "edit_employee"),
    ("employees", "manage_attachments"),
    ("employees", "edit_project_history"),
    ("employees", "access_employee_admin_mode"),
    ("employees", "export_employees"),
    # Assets
    ("assets", "create_asset"),
    ("assets", "assign_asset"),
    ("assets", "retire_asset"),
    ("assets", "edit_asset_metadata"),
    ("assets", "view_asset_valuation"),
    ("assets", "access_asset_edit_mode"),
    # Intake
    ("intake", "create_requisition"),
    ("intake", "approve_requisition"),
    ("intake", "edit_requisition"),
    # Onboarding / Offboarding
    ("onboarding",  "manage_onboarding"),
    ("offboarding", "manage_offboarding"),
    ("offboarding", "initiate_offboarding"),
    ("offboarding", "complete_tasks"),
    ("offboarding", "reassign_tasks"),
    # Project Management
    ("project_management", "create_project"),
    ("project_management", "edit_project"),
    ("project_management", "manage_members"),
    ("project_management", "archive_project"),
    # Audit & Logging
    ("audit", "view_audit_logs"),
    ("audit", "export_audit_logs"),
    # Timesheets
    ("timesheets", "submit_timesheet"),
    ("timesheets", "approve_timesheet"),
    ("timesheets", "edit_timesheet"),
    ("timesheets", "export_timesheets"),
    # Productivity
    ("productivity", "view_reports"),
    ("productivity", "manage_goals"),
    ("productivity", "export_reports"),
    # ATS
    ("ats", "create_candidate"),
    ("ats", "manage_interviews"),
    ("ats", "make_hiring_decisions"),
    ("ats", "manage_job_postings"),
    # Admin sub-modules
    ("admin", "manage_roles"),
    ("admin", "manage_dropdowns"),
    ("admin", "manage_skills"),
    ("admin", "manage_notifications"),
    ("admin", "assign_roles"),
    ("admin", "manage_entra_sync"),
    # Visibility / data sensitivity
    ("visibility", "reveal_pii"),
    ("visibility", "reveal_financials"),
    ("visibility", "reveal_audit_trails"),
]


def _perm_id(module: str, action: str) -> str:
    return f"perm_sa_{module}_{action}"


def upgrade() -> None:
    conn = op.get_bind()
    for module, action in _PERMISSIONS:
        conn.execute(
            text("""
                INSERT INTO permissions (id, role_id, module, action, created_at)
                VALUES (:id, :role_id, :module, :action, :now)
                ON CONFLICT (role_id, module, action) DO NOTHING
            """),
            {
                "id": _perm_id(module, action),
                "role_id": _ROLE_ID,
                "module": module,
                "action": action,
                "now": _NOW,
            },
        )


def downgrade() -> None:
    conn = op.get_bind()
    ids = [_perm_id(m, a) for m, a in _PERMISSIONS]
    conn.execute(
        text("DELETE FROM permissions WHERE id = ANY(:ids)"),
        {"ids": ids},
    )
