"""Repository for notification settings (Epic 3.4)."""

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from ..models.config_tables import NotificationModuleToggle, NotificationSettings


class NotificationSettingsRepository:
    def __init__(self, session: Session) -> None:
        self._db = session

    # ------------------------------------------------------------------
    # Global settings (singleton)
    # ------------------------------------------------------------------

    def get_settings(self) -> NotificationSettings:
        """Return the singleton settings row, creating it if absent."""
        row = self._db.get(NotificationSettings, "default")
        if row is None:
            row = NotificationSettings(
                id="default",
                email_enabled=True,
                inapp_enabled=True,
                offboarding_deadline_hours=72,
                escalation_warning_hours=24,
                warranty_alert_days=60,
                updated_at=datetime.now(timezone.utc),
            )
            self._db.add(row)
            self._db.flush()
        return row

    def save_settings(self, settings: NotificationSettings) -> NotificationSettings:
        self._db.add(settings)
        self._db.flush()
        return settings

    # ------------------------------------------------------------------
    # Module toggles
    # ------------------------------------------------------------------

    def list_toggles(self) -> list[NotificationModuleToggle]:
        return self._db.query(NotificationModuleToggle).order_by(
            NotificationModuleToggle.module,
            NotificationModuleToggle.channel,
        ).all()

    def upsert_toggle(self, module: str, channel: str, enabled: bool) -> NotificationModuleToggle:
        toggle = self._db.get(NotificationModuleToggle, (module, channel))
        if toggle is None:
            toggle = NotificationModuleToggle(module=module, channel=channel, enabled=enabled)
            self._db.add(toggle)
        else:
            toggle.enabled = enabled
        self._db.flush()
        return toggle

    def replace_toggles(self, entries: list[dict]) -> list[NotificationModuleToggle]:
        """Replace all toggles with the provided list.

        Each entry: {"module": str, "channel": str, "enabled": bool}
        """
        # Delete rows for modules/channels being replaced
        for entry in entries:
            existing = self._db.get(
                NotificationModuleToggle, (entry["module"], entry["channel"])
            )
            if existing is not None:
                self._db.delete(existing)
        self._db.flush()

        result = []
        for entry in entries:
            toggle = NotificationModuleToggle(
                module=entry["module"],
                channel=entry["channel"],
                enabled=entry["enabled"],
            )
            self._db.add(toggle)
            result.append(toggle)
        self._db.flush()
        return result
