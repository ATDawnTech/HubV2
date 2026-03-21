"""Integration tests for SkillRepository (Epic 3.2 — Skill Management).

All tests run against a real PostgreSQL database using per-test transaction rollback.
"""

from datetime import datetime, timezone

import pytest

from src.adthub.db.repositories.skill_repository import SkillRepository
from tests.factories.config_factory import SkillsCatalogFactory


# ---------------------------------------------------------------------------
# find_by_id
# ---------------------------------------------------------------------------

@pytest.mark.integration
def test_find_by_id_returns_skill_when_found(db_session) -> None:
    """SkillRepository.find_by_id returns the correct skill row."""
    skill = SkillsCatalogFactory()
    db_session.add(skill)
    db_session.flush()

    repo = SkillRepository(db_session)
    result = repo.find_by_id(skill.id)

    assert result is not None
    assert result.id == skill.id
    assert result.name == skill.name


@pytest.mark.integration
def test_find_by_id_returns_none_when_not_found(db_session) -> None:
    """SkillRepository.find_by_id returns None for a non-existent ID."""
    repo = SkillRepository(db_session)
    result = repo.find_by_id("skill_doesnotexist")
    assert result is None


@pytest.mark.integration
def test_find_by_id_returns_none_when_soft_deleted(db_session) -> None:
    """SkillRepository.find_by_id does not return soft-deleted skills."""
    skill = SkillsCatalogFactory(deleted_at=datetime.now(timezone.utc))
    db_session.add(skill)
    db_session.flush()

    repo = SkillRepository(db_session)
    result = repo.find_by_id(skill.id)
    assert result is None


# ---------------------------------------------------------------------------
# find_by_name
# ---------------------------------------------------------------------------

@pytest.mark.integration
def test_find_by_name_matches_case_insensitively(db_session) -> None:
    """SkillRepository.find_by_name returns a skill regardless of letter casing."""
    skill = SkillsCatalogFactory(name="TypeScript")
    db_session.add(skill)
    db_session.flush()

    repo = SkillRepository(db_session)
    assert repo.find_by_name("typescript") is not None
    assert repo.find_by_name("TYPESCRIPT") is not None
    assert repo.find_by_name("TypeScript") is not None


@pytest.mark.integration
def test_find_by_name_returns_none_when_not_found(db_session) -> None:
    """SkillRepository.find_by_name returns None when no matching skill exists."""
    repo = SkillRepository(db_session)
    assert repo.find_by_name("NonExistentSkill") is None


@pytest.mark.integration
def test_find_by_name_returns_none_for_soft_deleted(db_session) -> None:
    """SkillRepository.find_by_name ignores soft-deleted skills."""
    skill = SkillsCatalogFactory(name="DeletedSkill", deleted_at=datetime.now(timezone.utc))
    db_session.add(skill)
    db_session.flush()

    repo = SkillRepository(db_session)
    assert repo.find_by_name("DeletedSkill") is None


# ---------------------------------------------------------------------------
# find_all_paginated
# ---------------------------------------------------------------------------

@pytest.mark.integration
def test_find_all_paginated_returns_active_skills(db_session) -> None:
    """find_all_paginated returns non-deleted skills only."""
    active = SkillsCatalogFactory(name="ActiveSkill")
    deleted = SkillsCatalogFactory(name="DeletedSkill", deleted_at=datetime.now(timezone.utc))
    db_session.add_all([active, deleted])
    db_session.flush()

    repo = SkillRepository(db_session)
    rows = repo.find_all_paginated(
        search=None, sort_by="name", sort_dir="asc", limit=50, cursor=None, category=None
    )

    ids = [r.id for r in rows]
    assert active.id in ids
    assert deleted.id not in ids


@pytest.mark.integration
def test_find_all_paginated_filters_by_search(db_session) -> None:
    """find_all_paginated returns only skills whose names match the search term."""
    matching = SkillsCatalogFactory(name="Python Expert")
    non_matching = SkillsCatalogFactory(name="Java Developer")
    db_session.add_all([matching, non_matching])
    db_session.flush()

    repo = SkillRepository(db_session)
    rows = repo.find_all_paginated(
        search="python", sort_by="name", sort_dir="asc", limit=50, cursor=None, category=None
    )

    ids = [r.id for r in rows]
    assert matching.id in ids
    assert non_matching.id not in ids


@pytest.mark.integration
def test_find_all_paginated_filters_by_category(db_session) -> None:
    """find_all_paginated returns only skills matching the category filter."""
    backend = SkillsCatalogFactory(name="FastAPI", category="Backend")
    frontend = SkillsCatalogFactory(name="React", category="Frontend")
    db_session.add_all([backend, frontend])
    db_session.flush()

    repo = SkillRepository(db_session)
    rows = repo.find_all_paginated(
        search=None, sort_by="name", sort_dir="asc", limit=50, cursor=None, category="Backend"
    )

    ids = [r.id for r in rows]
    assert backend.id in ids
    assert frontend.id not in ids


@pytest.mark.integration
def test_find_all_paginated_respects_limit_and_offset(db_session) -> None:
    """find_all_paginated returns the correct page slice using cursor pagination."""
    skills = [SkillsCatalogFactory(name=f"Skill_{i:03}") for i in range(5)]
    db_session.add_all(skills)
    db_session.flush()

    repo = SkillRepository(db_session)
    # Repository returns limit+1 rows for next-page detection; slice like the service does.
    page1 = repo.find_all_paginated(
        search=None, sort_by="name", sort_dir="asc", limit=3, cursor=None, category=None
    )[:3]
    last = page1[-1]
    cursor = f"{last.name}|{last.id}"
    page2 = repo.find_all_paginated(
        search=None, sort_by="name", sort_dir="asc", limit=3, cursor=cursor, category=None
    )

    assert len(page1) == 3
    page1_ids = {r.id for r in page1}
    page2_ids = {r.id for r in page2}
    assert len(page2) >= 1
    assert page1_ids.isdisjoint(page2_ids)


@pytest.mark.integration
def test_find_all_paginated_sort_by_name_ascending(db_session) -> None:
    """find_all_paginated sorted by name asc returns alphabetically ordered rows."""
    skill_b = SkillsCatalogFactory(name="Bravo", category="SortTest")
    skill_a = SkillsCatalogFactory(name="Alpha", category="SortTest")
    db_session.add_all([skill_b, skill_a])
    db_session.flush()

    repo = SkillRepository(db_session)
    rows = repo.find_all_paginated(
        search=None, sort_by="name", sort_dir="asc", limit=50, cursor=None, category="SortTest"
    )

    names = [r.name for r in rows]
    assert names.index("Alpha") < names.index("Bravo")


# ---------------------------------------------------------------------------
# count
# ---------------------------------------------------------------------------

@pytest.mark.integration
def test_count_excludes_soft_deleted(db_session) -> None:
    """SkillRepository.count does not include soft-deleted skills."""
    active = SkillsCatalogFactory(category="CountSoftDeleteTest")
    deleted = SkillsCatalogFactory(category="CountSoftDeleteTest", deleted_at=datetime.now(timezone.utc))
    db_session.add_all([active, deleted])
    db_session.flush()

    repo = SkillRepository(db_session)
    count = repo.count(category="CountSoftDeleteTest")

    assert count == 1


@pytest.mark.integration
def test_count_with_category_returns_matching_count(db_session) -> None:
    """SkillRepository.count with category returns only skills in that category."""
    db_session.add_all([
        SkillsCatalogFactory(category="CountCatX"),
        SkillsCatalogFactory(category="CountCatX"),
        SkillsCatalogFactory(category="CountCatY"),
    ])
    db_session.flush()

    repo = SkillRepository(db_session)
    assert repo.count(category="CountCatX") == 2
    assert repo.count(category="CountCatY") == 1


# ---------------------------------------------------------------------------
# soft_delete
# ---------------------------------------------------------------------------

@pytest.mark.integration
def test_soft_delete_sets_deleted_at(db_session) -> None:
    """SkillRepository.soft_delete sets deleted_at so the row is no longer returned by queries."""
    skill = SkillsCatalogFactory()
    db_session.add(skill)
    db_session.flush()

    repo = SkillRepository(db_session)
    repo.soft_delete(skill)

    assert skill.deleted_at is not None
    assert repo.find_by_id(skill.id) is None


# ---------------------------------------------------------------------------
# bulk_soft_delete
# ---------------------------------------------------------------------------

@pytest.mark.integration
def test_bulk_soft_delete_returns_deleted_count(db_session) -> None:
    """SkillRepository.bulk_soft_delete marks all provided skills as deleted."""
    skills = [SkillsCatalogFactory() for _ in range(3)]
    db_session.add_all(skills)
    db_session.flush()

    repo = SkillRepository(db_session)
    deleted_count = repo.bulk_soft_delete(skills)

    assert deleted_count == 3
    for skill in skills:
        assert skill.deleted_at is not None
        assert repo.find_by_id(skill.id) is None


# ---------------------------------------------------------------------------
# get_usage_counts_bulk
# ---------------------------------------------------------------------------

@pytest.mark.integration
def test_get_usage_counts_bulk_returns_zero_for_unused_skills(db_session) -> None:
    """get_usage_counts_bulk returns 0 for skills that have no employee_skills rows."""
    skill = SkillsCatalogFactory()
    db_session.add(skill)
    db_session.flush()

    repo = SkillRepository(db_session)
    counts = repo.get_usage_counts_bulk([skill.id])

    assert counts[skill.id] == 0


@pytest.mark.integration
def test_get_usage_counts_bulk_returns_empty_dict_for_empty_input(db_session) -> None:
    """get_usage_counts_bulk returns {} immediately when called with an empty list."""
    repo = SkillRepository(db_session)
    assert repo.get_usage_counts_bulk([]) == {}


# ---------------------------------------------------------------------------
# find_all_categories
# ---------------------------------------------------------------------------

@pytest.mark.integration
def test_find_all_categories_returns_distinct_sorted_categories(db_session) -> None:
    """find_all_categories returns unique category names in alphabetical order."""
    db_session.add_all([
        SkillsCatalogFactory(name="Skill_Z", category="Zebra"),
        SkillsCatalogFactory(name="Skill_A", category="Alpha"),
        SkillsCatalogFactory(name="Skill_A2", category="Alpha"),  # duplicate — should appear once
    ])
    db_session.flush()

    repo = SkillRepository(db_session)
    categories = repo.find_all_categories()

    assert "Alpha" in categories
    assert "Zebra" in categories
    alpha_idx = categories.index("Alpha")
    zebra_idx = categories.index("Zebra")
    assert alpha_idx < zebra_idx
    assert categories.count("Alpha") == 1


@pytest.mark.integration
def test_find_all_categories_excludes_soft_deleted(db_session) -> None:
    """find_all_categories does not include categories from soft-deleted skills."""
    db_session.add_all([
        SkillsCatalogFactory(name="ActiveSkillCat", category="ActiveCat"),
        SkillsCatalogFactory(
            name="DeletedSkillCat",
            category="GhostCat",
            deleted_at=datetime.now(timezone.utc),
        ),
    ])
    db_session.flush()

    repo = SkillRepository(db_session)
    categories = repo.find_all_categories()

    assert "ActiveCat" in categories
    assert "GhostCat" not in categories


@pytest.mark.integration
def test_find_all_categories_excludes_null_category(db_session) -> None:
    """find_all_categories does not include None entries for uncategorized skills."""
    db_session.add(SkillsCatalogFactory(name="UncategorizedSkill", category=None))
    db_session.flush()

    repo = SkillRepository(db_session)
    categories = repo.find_all_categories()

    assert None not in categories
