"""Unit tests for NotificationSettingsRepository — all dependencies mocked."""

import pytest
from unittest.mock import MagicMock, call

from src.adthub.db.repositories.notification_settings_repository import NotificationSettingsRepository
from src.adthub.db.models.config_tables import NotificationModuleToggle, NotificationSettings


def _make_settings() -> NotificationSettings:
    s = NotificationSettings()
    s.id = "default"
    s.email_enabled = True
    s.inapp_enabled = True
    s.offboarding_deadline_hours = 72
    s.escalation_warning_hours = 24
    s.warranty_alert_days = 60
    return s


def _make_toggle(module: str = "employees", channel: str = "email", enabled: bool = True) -> NotificationModuleToggle:
    t = NotificationModuleToggle()
    t.module = module
    t.channel = channel
    t.enabled = enabled
    return t


# ---------------------------------------------------------------------------
# get_settings
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_get_settings_returns_existing_row(mock_session) -> None:
    """get_settings returns the existing singleton row without creating a new one."""
    existing = _make_settings()
    mock_session.get.return_value = existing

    repo = NotificationSettingsRepository(mock_session)
    result = repo.get_settings()

    assert result == existing
    mock_session.add.assert_not_called()


@pytest.mark.unit
def test_get_settings_creates_default_when_absent(mock_session) -> None:
    """get_settings creates and returns a default row when none exists yet."""
    mock_session.get.return_value = None

    repo = NotificationSettingsRepository(mock_session)
    result = repo.get_settings()

    mock_session.add.assert_called_once()
    mock_session.flush.assert_called_once()
    assert result.id == "default"
    assert result.email_enabled is True
    assert result.offboarding_deadline_hours == 72


# ---------------------------------------------------------------------------
# save_settings
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_save_settings_calls_add_and_flush(mock_session) -> None:
    """save_settings persists the settings row and returns it."""
    settings = _make_settings()

    repo = NotificationSettingsRepository(mock_session)
    result = repo.save_settings(settings)

    mock_session.add.assert_called_once_with(settings)
    mock_session.flush.assert_called_once()
    assert result == settings


# ---------------------------------------------------------------------------
# list_toggles
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_list_toggles_returns_all_toggles(mock_session) -> None:
    """list_toggles returns the ordered list from the query."""
    toggles = [_make_toggle("employees", "email"), _make_toggle("employees", "inapp")]
    (
        mock_session.query.return_value
        .order_by.return_value
        .all.return_value
    ) = toggles

    repo = NotificationSettingsRepository(mock_session)
    result = repo.list_toggles()

    assert result == toggles


@pytest.mark.unit
def test_list_toggles_returns_empty_list_when_none(mock_session) -> None:
    """list_toggles returns [] when no toggles have been configured."""
    (
        mock_session.query.return_value
        .order_by.return_value
        .all.return_value
    ) = []

    repo = NotificationSettingsRepository(mock_session)
    result = repo.list_toggles()

    assert result == []


# ---------------------------------------------------------------------------
# upsert_toggle
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_upsert_toggle_updates_existing_toggle(mock_session) -> None:
    """upsert_toggle updates enabled on an existing toggle and flushes."""
    existing = _make_toggle(enabled=True)
    mock_session.get.return_value = existing

    repo = NotificationSettingsRepository(mock_session)
    result = repo.upsert_toggle("employees", "email", enabled=False)

    assert result.enabled is False
    mock_session.flush.assert_called_once()
    mock_session.add.assert_not_called()


@pytest.mark.unit
def test_upsert_toggle_creates_new_toggle_when_absent(mock_session) -> None:
    """upsert_toggle creates a new toggle when none exists for the key."""
    mock_session.get.return_value = None

    repo = NotificationSettingsRepository(mock_session)
    result = repo.upsert_toggle("employees", "email", enabled=True)

    mock_session.add.assert_called_once()
    mock_session.flush.assert_called_once()
    assert result.module == "employees"
    assert result.channel == "email"
    assert result.enabled is True


# ---------------------------------------------------------------------------
# replace_toggles
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_replace_toggles_deletes_existing_and_inserts_new(mock_session) -> None:
    """replace_toggles deletes matching rows and inserts the new set."""
    existing = _make_toggle("employees", "email")
    mock_session.get.return_value = existing

    entries = [{"module": "employees", "channel": "email", "enabled": False}]

    repo = NotificationSettingsRepository(mock_session)
    result = repo.replace_toggles(entries)

    mock_session.delete.assert_called_once_with(existing)
    assert len(result) == 1
    assert result[0].module == "employees"
    assert result[0].enabled is False


@pytest.mark.unit
def test_replace_toggles_inserts_without_delete_when_no_existing(mock_session) -> None:
    """replace_toggles skips delete when no existing row matches."""
    mock_session.get.return_value = None

    entries = [{"module": "assets", "channel": "inapp", "enabled": True}]

    repo = NotificationSettingsRepository(mock_session)
    result = repo.replace_toggles(entries)

    mock_session.delete.assert_not_called()
    assert len(result) == 1
    assert result[0].module == "assets"
