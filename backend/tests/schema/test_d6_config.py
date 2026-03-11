import uuid
import pytest
import sqlalchemy.exc
from datetime import datetime, timezone
from src.adthub.db.models.config_tables import ConfigDropdown


def _make_dropdown(db_session, module="ats", category="stage", value=None):
    """Create and flush a ConfigDropdown, returning it."""
    dropdown = ConfigDropdown(
        id=f"cdrop_{uuid.uuid4().hex[:10]}",
        module=module,
        category=category,
        value=value or f"val_{uuid.uuid4().hex[:8]}",
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(dropdown)
    db_session.flush()
    return dropdown


@pytest.mark.skip(
    reason=(
        "Requires alembic migration 0002 "
        "(functional index uq_skills_catalog_name_lower not created by metadata.create_all)"
    )
)
@pytest.mark.schema
def test_d6_1_skills_catalog_case_insensitive_unique(db_session) -> None:
    """D.6.1: skills_catalog case-insensitive unique on lower(name) via functional index."""
    pass


@pytest.mark.schema
def test_d6_2_config_dropdown_unique_violation(db_session) -> None:
    """D.6.2: config_dropdowns UNIQUE(module, category, value) — duplicate is rejected."""
    _make_dropdown(db_session, module="employees", category="hire_type", value="full_time")

    duplicate = ConfigDropdown(
        id=f"cdrop_{uuid.uuid4().hex[:10]}",
        module="employees",
        category="hire_type",
        value="full_time",  # same (module, category, value) — should fail
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(duplicate)
    with pytest.raises(sqlalchemy.exc.IntegrityError):
        db_session.flush()


@pytest.mark.schema
def test_d6_3_config_dropdown_value_not_null(db_session) -> None:
    """D.6.3: config_dropdowns.value NOT NULL — null value is rejected."""
    dropdown = ConfigDropdown(
        id=f"cdrop_{uuid.uuid4().hex[:10]}",
        module="ats",
        category="stage",
        value=None,  # should fail NOT NULL constraint
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(dropdown)
    with pytest.raises(sqlalchemy.exc.IntegrityError):
        db_session.flush()
