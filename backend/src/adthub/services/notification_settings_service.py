"""Business logic for Epic 3.4 – Notification Module.

Manages:
  - Global kill-switches (email / in-app)
  - Per-module, per-channel toggles
  - Timing thresholds (offboarding deadline, escalation warning, warranty alert)
"""

from datetime import datetime, timezone

from ..db.models.config_tables import NotificationModuleToggle, NotificationSettings
from ..db.repositories.notification_settings_repository import NotificationSettingsRepository
from ..exceptions import ValidationError

_VALID_CHANNELS = {"email", "inapp"}
_VALID_MODULES = {"employees", "assets", "onboarding", "intake", "projects", "timesheets", "audit"}


class NotificationSettingsService:
    def __init__(self, repository: NotificationSettingsRepository) -> None:
        self._repo = repository

    # ------------------------------------------------------------------
    # Global settings
    # ------------------------------------------------------------------

    def get_settings(self) -> NotificationSettings:
        """Return the current global notification settings."""
        return self._repo.get_settings()

    def update_settings(
        self,
        user_id: str,
        email_enabled: bool | None = None,
        inapp_enabled: bool | None = None,
        offboarding_deadline_hours: int | None = None,
        escalation_warning_hours: int | None = None,
        warranty_alert_days: int | None = None,
    ) -> NotificationSettings:
        """Patch the global notification settings.

        Only provided (non-None) fields are updated. All integer thresholds
        must be positive.

        Raises:
            ValueError: If any threshold value is not a positive integer.
        """
        settings = self._repo.get_settings()

        if offboarding_deadline_hours is not None:
            if offboarding_deadline_hours <= 0:
                raise ValidationError("offboarding_deadline_hours must be a positive integer.")
            settings.offboarding_deadline_hours = offboarding_deadline_hours

        if escalation_warning_hours is not None:
            if escalation_warning_hours <= 0:
                raise ValidationError("escalation_warning_hours must be a positive integer.")
            settings.escalation_warning_hours = escalation_warning_hours

        if warranty_alert_days is not None:
            if warranty_alert_days <= 0:
                raise ValidationError("warranty_alert_days must be a positive integer.")
            settings.warranty_alert_days = warranty_alert_days

        if email_enabled is not None:
            settings.email_enabled = email_enabled

        if inapp_enabled is not None:
            settings.inapp_enabled = inapp_enabled

        settings.updated_by = user_id
        settings.updated_at = datetime.now(timezone.utc)

        return self._repo.save_settings(settings)

    # ------------------------------------------------------------------
    # Module toggles
    # ------------------------------------------------------------------

    def list_toggles(self) -> list[NotificationModuleToggle]:
        """Return all module/channel toggles."""
        return self._repo.list_toggles()

    def replace_toggles(
        self,
        entries: list[dict],
    ) -> list[NotificationModuleToggle]:
        """Replace the full set of module/channel toggles.

        Each entry must have: module (str), channel ('email'|'inapp'), enabled (bool).

        Raises:
            ValueError: If any entry has an unknown channel or module value.
        """
        for entry in entries:
            if entry.get("channel") not in _VALID_CHANNELS:
                raise ValidationError(
                    f"Invalid channel '{entry.get('channel')}'. "
                    f"Must be one of: {sorted(_VALID_CHANNELS)}."
                )
            if entry.get("module") not in _VALID_MODULES:
                raise ValidationError(
                    f"Invalid module '{entry.get('module')}'. "
                    f"Must be one of: {sorted(_VALID_MODULES)}."
                )
        return self._repo.replace_toggles(entries)
