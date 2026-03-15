"""Unit tests for SkillService (Epic 3.2 — Skill Management).

All tests use mock repositories — no database is touched.
"""

import pytest
from unittest.mock import MagicMock

from src.adthub.db.models.config_tables import SkillsCatalog
from src.adthub.exceptions import ConflictError, ResourceNotFoundError
from src.adthub.schemas.skills import CreateSkillRequest
from src.adthub.schemas.common import PaginationMeta
from src.adthub.services.skill_service import SkillService


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_skill(
    skill_id: str = "skill_abc123",
    name: str = "TypeScript",
    category: str | None = "Frontend",
) -> SkillsCatalog:
    """Return a minimal SkillsCatalog ORM instance for use in tests."""
    from datetime import datetime, timezone

    s = SkillsCatalog()
    s.id = skill_id
    s.name = name
    s.category = category
    s.created_by = None
    s.created_at = datetime(2025, 1, 1, tzinfo=timezone.utc)
    s.updated_at = datetime(2025, 1, 1, tzinfo=timezone.utc)
    s.deleted_at = None
    return s


def _make_service(mock_repo: MagicMock) -> SkillService:
    return SkillService(repository=mock_repo)


# ---------------------------------------------------------------------------
# list_skills
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_list_skills_returns_skills_with_usage_counts() -> None:
    """list_skills combines paginated rows with bulk usage counts into SkillResponse objects."""
    skill = _make_skill()
    mock_repo = MagicMock()
    mock_repo.find_all_paginated.return_value = [skill]
    mock_repo.count.return_value = 1
    mock_repo.get_usage_counts_bulk.return_value = {skill.id: 3}

    service = _make_service(mock_repo)
    skills, meta = service.list_skills(
        search=None, sort_by="created_at", sort_dir="desc", limit=50, offset=0, category=None
    )

    assert len(skills) == 1
    assert skills[0].id == skill.id
    assert skills[0].usage_count == 3
    assert meta.total == 1


@pytest.mark.unit
def test_list_skills_clamps_limit_to_500() -> None:
    """list_skills clamps limit to 500 even when a larger value is requested."""
    mock_repo = MagicMock()
    mock_repo.find_all_paginated.return_value = []
    mock_repo.count.return_value = 0
    mock_repo.get_usage_counts_bulk.return_value = {}

    service = _make_service(mock_repo)
    service.list_skills(search=None, sort_by="created_at", sort_dir="desc", limit=9999, offset=0, category=None)

    call_args = mock_repo.find_all_paginated.call_args
    assert call_args.kwargs["limit"] == 500


@pytest.mark.unit
def test_list_skills_defaults_invalid_sort_to_desc() -> None:
    """list_skills treats any unrecognised sort_dir as 'desc'."""
    mock_repo = MagicMock()
    mock_repo.find_all_paginated.return_value = []
    mock_repo.count.return_value = 0
    mock_repo.get_usage_counts_bulk.return_value = {}

    service = _make_service(mock_repo)
    service.list_skills(search=None, sort_by="created_at", sort_dir="random", limit=50, offset=0, category=None)

    call_args = mock_repo.find_all_paginated.call_args
    assert call_args.kwargs["sort_dir"] == "desc"


# ---------------------------------------------------------------------------
# create_skill
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_create_skill_raises_conflict_when_name_exists() -> None:
    """create_skill raises ConflictError when a skill with the same name already exists."""
    mock_repo = MagicMock()
    mock_repo.find_by_name.return_value = _make_skill()

    service = _make_service(mock_repo)
    with pytest.raises(ConflictError):
        service.create_skill(
            CreateSkillRequest(name="TypeScript"),
            created_by=None,
        )


@pytest.mark.unit
def test_create_skill_returns_new_skill_on_success() -> None:
    """create_skill persists the row and returns a SkillResponse with usage_count 0."""
    mock_repo = MagicMock()
    mock_repo.find_by_name.return_value = None

    saved = _make_skill(name="Python", category="Backend")
    mock_repo.save.return_value = saved

    service = _make_service(mock_repo)
    result = service.create_skill(
        CreateSkillRequest(name="Python", category="Backend"),
        created_by="emp_admin1",
    )

    assert result.name == "Python"
    assert result.usage_count == 0
    mock_repo.save.assert_called_once()


@pytest.mark.unit
def test_create_skill_attaches_created_by() -> None:
    """create_skill passes created_by to the ORM instance before saving."""
    mock_repo = MagicMock()
    mock_repo.find_by_name.return_value = None
    captured: dict[str, str | None] = {}

    def _save(skill: SkillsCatalog) -> SkillsCatalog:
        captured["created_by"] = skill.created_by
        return skill

    mock_repo.save.side_effect = _save

    service = _make_service(mock_repo)
    service.create_skill(
        CreateSkillRequest(name="Go"),
        created_by="emp_owner99",
    )

    assert captured["created_by"] == "emp_owner99"


# ---------------------------------------------------------------------------
# delete_skill
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_delete_skill_raises_not_found_for_unknown_id() -> None:
    """delete_skill raises ResourceNotFoundError when the skill ID does not exist."""
    mock_repo = MagicMock()
    mock_repo.find_by_id.return_value = None

    service = _make_service(mock_repo)
    with pytest.raises(ResourceNotFoundError):
        service.delete_skill("skill_missing")


@pytest.mark.unit
def test_delete_skill_calls_soft_delete_on_found_skill() -> None:
    """delete_skill calls soft_delete exactly once on the located skill."""
    skill = _make_skill()
    mock_repo = MagicMock()
    mock_repo.find_by_id.return_value = skill

    service = _make_service(mock_repo)
    service.delete_skill(skill.id)

    mock_repo.soft_delete.assert_called_once_with(skill)


# ---------------------------------------------------------------------------
# bulk_delete_skills
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_bulk_delete_skills_reports_skipped_ids_for_missing_skills() -> None:
    """bulk_delete_skills includes IDs not found in the database in skipped_ids."""
    found = _make_skill(skill_id="skill_found1")
    mock_repo = MagicMock()
    mock_repo.find_by_ids.return_value = [found]
    mock_repo.bulk_soft_delete.return_value = 1

    service = _make_service(mock_repo)
    result = service.bulk_delete_skills(["skill_found1", "skill_missing2"])

    assert result.deleted_count == 1
    assert result.skipped_count == 1
    assert "skill_missing2" in result.skipped_ids


@pytest.mark.unit
def test_bulk_delete_skills_all_found_reports_zero_skipped() -> None:
    """bulk_delete_skills reports skipped_count 0 when all requested IDs are found."""
    skills = [_make_skill(skill_id=f"skill_{i}") for i in range(3)]
    mock_repo = MagicMock()
    mock_repo.find_by_ids.return_value = skills
    mock_repo.bulk_soft_delete.return_value = 3

    service = _make_service(mock_repo)
    result = service.bulk_delete_skills([s.id for s in skills])

    assert result.deleted_count == 3
    assert result.skipped_count == 0
    assert result.skipped_ids == []
