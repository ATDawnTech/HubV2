"""Epic 3.4: notification_settings and notification_module_toggles tables.

Revision ID: 0008
Revises: 0007
Create Date: 2026-03-12

Changes:
- Creates notification_settings (singleton row for global kill-switches + thresholds)
- Creates notification_module_toggles (per-module, per-channel enable/disable)
- Seeds default notification_settings row
"""

from datetime import datetime, timezone

from alembic import op
from sqlalchemy import text

revision: str = "0008"
down_revision: str = "0007"
branch_labels = None
depends_on = None

_NOW = datetime.now(timezone.utc).isoformat()


def upgrade() -> None:
    conn = op.get_bind()

    # 1. Global settings singleton
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS notification_settings (
            id                        VARCHAR(50)              NOT NULL DEFAULT 'default',
            email_enabled             BOOLEAN                  NOT NULL DEFAULT true,
            inapp_enabled             BOOLEAN                  NOT NULL DEFAULT true,
            offboarding_deadline_hours INTEGER                 NOT NULL DEFAULT 72,
            escalation_warning_hours  INTEGER                  NOT NULL DEFAULT 24,
            warranty_alert_days       INTEGER                  NOT NULL DEFAULT 60,
            updated_by                VARCHAR(255) REFERENCES employees(id),
            updated_at                TIMESTAMP WITH TIME ZONE NOT NULL,
            PRIMARY KEY (id),
            CONSTRAINT ck_notification_settings_id CHECK (id = 'default')
        )
    """))

    # 2. Per-module, per-channel toggles
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS notification_module_toggles (
            module   VARCHAR(100) NOT NULL,
            channel  VARCHAR(20)  NOT NULL,
            enabled  BOOLEAN      NOT NULL DEFAULT true,
            PRIMARY KEY (module, channel),
            CONSTRAINT ck_notification_module_toggles_channel
                CHECK (channel IN ('email', 'inapp'))
        )
    """))
    conn.execute(text(
        "CREATE INDEX IF NOT EXISTS idx_notification_module_toggles_module "
        "ON notification_module_toggles (module)"
    ))

    # 3. Seed default settings row
    conn.execute(text("""
        INSERT INTO notification_settings
            (id, email_enabled, inapp_enabled,
             offboarding_deadline_hours, escalation_warning_hours,
             warranty_alert_days, updated_at)
        VALUES
            ('default', true, true, 72, 24, 60, :now)
        ON CONFLICT (id) DO NOTHING
    """), {"now": _NOW})

    # 4. Seed default module toggles (all modules, both channels, enabled)
    _modules = [
        "employees", "assets", "onboarding", "intake",
        "projects", "timesheets", "audit",
    ]
    for module in _modules:
        for channel in ("email", "inapp"):
            conn.execute(text("""
                INSERT INTO notification_module_toggles (module, channel, enabled)
                VALUES (:module, :channel, true)
                ON CONFLICT (module, channel) DO NOTHING
            """), {"module": module, "channel": channel})


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(text("DROP TABLE IF EXISTS notification_module_toggles"))
    conn.execute(text("DROP TABLE IF EXISTS notification_settings"))
