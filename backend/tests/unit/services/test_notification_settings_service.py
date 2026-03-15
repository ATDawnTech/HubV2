"""Unit tests for NotificationSettingsService (Epic 3.4 — Notification Module).

All tests use mock repositories — no database is touched.
"""

from datetime import datetime, timezone

import pytest
from unittest.mock import MagicMock

from src.adthub.db.models.config_tables import NotificationModuleToggle, NotificationSettings
from src.adthub.exceptions import ValidationError
from src.adthub.services.notification_settings_service import NotificationSettingsService


def _make_settings(
    email_enabled: bool = True,
    inapp_enabled: bool = True,
    offboarding_deadline_hours: int = 72,
    escalation_warning_hours: int = 24,
    warranty_alert_days: int = 60,
) -> NotificationSettings:
    s = NotificationSettings()
    s.id = "default"
    s.email_enabled = email_enabled
    s.inapp_enabled = inapp_enabled
    s.offboarding_deadline_hours = offboarding_deadline_hours
    s.escalation_warning_hours = escalation_warning_hours
    s.warranty_alert_days = warranty_alert_days
    s.updated_by = None
    s.updated_at = datetime.now(timezone.utc)
    return s


def _make_toggle(module: str, channel: str, enabled: bool = True) -> NotificationModuleToggle:
    t = NotificationModuleToggle()
    t.module = module
    t.channel = channel
    t.enabled = enabled
    return t


def _make_service(mock_repo: MagicMock) -> NotificationSettingsService:
    return NotificationSettingsService(repository=mock_repo)


# ---------------------------------------------------------------------------
# get_settings
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_get_settings_returns_current_settings() -> None:
    """get_settings delegates to the repository and returns the result."""
    settings = _make_settings()
    mock_repo = MagicMock()
    mock_repo.get_settings.return_value = settings

    service = _make_service(mock_repo)
    result = service.get_settings()

    assert result is settings
    mock_repo.get_settings.assert_called_once()


# ---------------------------------------------------------------------------
# update_settings
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_update_settings_patches_email_kill_switch() -> None:
    """update_settings toggles email_enabled without affecting other fields."""
    settings = _make_settings(email_enabled=True)
    mock_repo = MagicMock()
    mock_repo.get_settings.return_value = settings
    mock_repo.save_settings.return_value = settings

    service = _make_service(mock_repo)
    result = service.update_settings(user_id="emp_admin", email_enabled=False)

    assert result.email_enabled is False
    assert result.inapp_enabled is True  # unchanged
    assert result.updated_by == "emp_admin"


@pytest.mark.unit
def test_update_settings_patches_inapp_kill_switch() -> None:
    """update_settings toggles inapp_enabled without affecting other fields."""
    settings = _make_settings(inapp_enabled=True)
    mock_repo = MagicMock()
    mock_repo.get_settings.return_value = settings
    mock_repo.save_settings.return_value = settings

    service = _make_service(mock_repo)
    result = service.update_settings(user_id="emp_admin", inapp_enabled=False)

    assert result.inapp_enabled is False
    assert result.email_enabled is True  # unchanged


@pytest.mark.unit
def test_update_settings_patches_thresholds() -> None:
    """update_settings updates threshold fields when provided."""
    settings = _make_settings()
    mock_repo = MagicMock()
    mock_repo.get_settings.return_value = settings
    mock_repo.save_settings.return_value = settings

    service = _make_service(mock_repo)
    result = service.update_settings(
        user_id="emp_admin",
        offboarding_deadline_hours=48,
        escalation_warning_hours=12,
        warranty_alert_days=30,
    )

    assert result.offboarding_deadline_hours == 48
    assert result.escalation_warning_hours == 12
    assert result.warranty_alert_days == 30


@pytest.mark.unit
def test_update_settings_raises_value_error_for_zero_offboarding_hours() -> None:
    """update_settings raises ValueError when offboarding_deadline_hours is not positive."""
    mock_repo = MagicMock()
    mock_repo.get_settings.return_value = _make_settings()

    service = _make_service(mock_repo)
    with pytest.raises(ValidationError, match="offboarding_deadline_hours"):
        service.update_settings(user_id="emp_admin", offboarding_deadline_hours=0)


@pytest.mark.unit
def test_update_settings_raises_value_error_for_negative_escalation_hours() -> None:
    """update_settings raises ValueError when escalation_warning_hours is not positive."""
    mock_repo = MagicMock()
    mock_repo.get_settings.return_value = _make_settings()

    service = _make_service(mock_repo)
    with pytest.raises(ValidationError, match="escalation_warning_hours"):
        service.update_settings(user_id="emp_admin", escalation_warning_hours=-5)


@pytest.mark.unit
def test_update_settings_raises_value_error_for_zero_warranty_days() -> None:
    """update_settings raises ValueError when warranty_alert_days is not positive."""
    mock_repo = MagicMock()
    mock_repo.get_settings.return_value = _make_settings()

    service = _make_service(mock_repo)
    with pytest.raises(ValidationError, match="warranty_alert_days"):
        service.update_settings(user_id="emp_admin", warranty_alert_days=0)


@pytest.mark.unit
def test_update_settings_with_no_fields_saves_without_mutation() -> None:
    """update_settings with all-None args only updates updated_by and updated_at."""
    settings = _make_settings(email_enabled=True, offboarding_deadline_hours=72)
    mock_repo = MagicMock()
    mock_repo.get_settings.return_value = settings
    mock_repo.save_settings.return_value = settings

    service = _make_service(mock_repo)
    result = service.update_settings(user_id="emp_admin")

    assert result.email_enabled is True
    assert result.offboarding_deadline_hours == 72
    assert result.updated_by == "emp_admin"
    mock_repo.save_settings.assert_called_once()


# ---------------------------------------------------------------------------
# list_toggles
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_list_toggles_returns_all_toggles() -> None:
    """list_toggles delegates to the repository and returns all toggles."""
    toggles = [
        _make_toggle("employees", "email"),
        _make_toggle("employees", "inapp", enabled=False),
    ]
    mock_repo = MagicMock()
    mock_repo.list_toggles.return_value = toggles

    service = _make_service(mock_repo)
    result = service.list_toggles()

    assert result == toggles
    mock_repo.list_toggles.assert_called_once()


# ---------------------------------------------------------------------------
# replace_toggles
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_replace_toggles_raises_value_error_for_unknown_channel() -> None:
    """replace_toggles raises ValueError for any entry with an invalid channel."""
    service = _make_service(MagicMock())
    with pytest.raises(ValidationError, match="Invalid channel"):
        service.replace_toggles([
            {"module": "employees", "channel": "sms", "enabled": True},
        ])


@pytest.mark.unit
def test_replace_toggles_raises_value_error_for_unknown_module() -> None:
    """replace_toggles raises ValueError for any entry with an invalid module."""
    service = _make_service(MagicMock())
    with pytest.raises(ValidationError, match="Invalid module"):
        service.replace_toggles([
            {"module": "nonexistent", "channel": "email", "enabled": True},
        ])


@pytest.mark.unit
def test_replace_toggles_delegates_to_repository() -> None:
    """replace_toggles passes validated entries to the repository."""
    entries = [
        {"module": "employees", "channel": "email", "enabled": True},
        {"module": "assets", "channel": "inapp", "enabled": False},
    ]
    mock_repo = MagicMock()
    mock_repo.replace_toggles.return_value = []

    service = _make_service(mock_repo)
    service.replace_toggles(entries)

    mock_repo.replace_toggles.assert_called_once_with(entries)
