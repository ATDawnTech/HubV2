"""Unit tests for SkillRepository — all dependencies mocked."""

import pytest
from unittest.mock import MagicMock
from datetime import datetime, timezone

from src.adthub.db.repositories.skill_repository import SkillRepository
from tests.factories.skill_factory import SkillsCatalogFactory


def _mock_query_chain(mock_session, return_value):
    """Set up mock_session.query().filter().first() chain to return a value."""
    mock_session.query.return_value.filter.return_value.first.return_value = return_value
    return mock_session


# ---------------------------------------------------------------------------
# find_by_id
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_find_by_id_returns_skill_when_session_returns_one(mock_session) -> None:
    """SkillRepository.find_by_id returns the skill returned by the query."""
    expected = SkillsCatalogFactory()
    _mock_query_chain(mock_session, expected)

    repo = SkillRepository(mock_session)
    result = repo.find_by_id(expected.id)

    assert result == expected


@pytest.mark.unit
def test_find_by_id_returns_none_when_session_returns_none(mock_session) -> None:
    """SkillRepository.find_by_id returns None when query returns nothing."""
    _mock_query_chain(mock_session, None)

    repo = SkillRepository(mock_session)
    result = repo.find_by_id("skill_missing")

    assert result is None


# ---------------------------------------------------------------------------
# find_by_name
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_find_by_name_returns_skill_when_matched(mock_session) -> None:
    """SkillRepository.find_by_name returns the matched skill."""
    skill = SkillsCatalogFactory(name="TypeScript")
    _mock_query_chain(mock_session, skill)

    repo = SkillRepository(mock_session)
    result = repo.find_by_name("TypeScript")

    assert result == skill


@pytest.mark.unit
def test_find_by_name_returns_none_when_no_match(mock_session) -> None:
    """SkillRepository.find_by_name returns None when no skill matches."""
    _mock_query_chain(mock_session, None)

    repo = SkillRepository(mock_session)
    result = repo.find_by_name("NonExistent")

    assert result is None


# ---------------------------------------------------------------------------
# find_by_ids
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_find_by_ids_returns_list_of_matched_skills(mock_session) -> None:
    """SkillRepository.find_by_ids returns all matching skills."""
    skills = [SkillsCatalogFactory(), SkillsCatalogFactory()]
    mock_session.query.return_value.filter.return_value.all.return_value = skills

    repo = SkillRepository(mock_session)
    result = repo.find_by_ids([s.id for s in skills])

    assert result == skills


@pytest.mark.unit
def test_find_by_ids_returns_empty_list_for_no_matches(mock_session) -> None:
    """SkillRepository.find_by_ids returns empty list when no IDs match."""
    mock_session.query.return_value.filter.return_value.all.return_value = []

    repo = SkillRepository(mock_session)
    result = repo.find_by_ids(["skill_missing1", "skill_missing2"])

    assert result == []


# ---------------------------------------------------------------------------
# count
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_count_returns_total_when_no_search(mock_session) -> None:
    """SkillRepository.count returns total non-deleted count without search."""
    mock_session.query.return_value.filter.return_value.scalar.return_value = 42

    repo = SkillRepository(mock_session)
    result = repo.count()

    assert result == 42


@pytest.mark.unit
def test_count_returns_zero_when_scalar_is_none(mock_session) -> None:
    """SkillRepository.count returns 0 when scalar returns None."""
    mock_session.query.return_value.filter.return_value.scalar.return_value = None

    repo = SkillRepository(mock_session)
    result = repo.count()

    assert result == 0


@pytest.mark.unit
def test_count_with_search_filters_by_name_and_tokens(mock_session) -> None:
    """SkillRepository.count applies ILIKE filter when search is provided."""
    mock_session.query.return_value.filter.return_value.filter.return_value.scalar.return_value = 5

    repo = SkillRepository(mock_session)
    result = repo.count(search="js")

    assert result == 5


# ---------------------------------------------------------------------------
# save
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_save_calls_session_add_and_flush(mock_session) -> None:
    """SkillRepository.save calls session.add and session.flush."""
    skill = SkillsCatalogFactory()

    repo = SkillRepository(mock_session)
    result = repo.save(skill)

    mock_session.add.assert_called_once_with(skill)
    mock_session.flush.assert_called_once()
    assert result == skill


# ---------------------------------------------------------------------------
# soft_delete
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_soft_delete_sets_deleted_at_on_skill(mock_session) -> None:
    """SkillRepository.soft_delete sets deleted_at and flushes."""
    skill = SkillsCatalogFactory()
    assert skill.deleted_at is None

    repo = SkillRepository(mock_session)
    repo.soft_delete(skill)

    assert skill.deleted_at is not None
    mock_session.flush.assert_called_once()


# ---------------------------------------------------------------------------
# bulk_soft_delete
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_bulk_soft_delete_sets_deleted_at_on_all_skills(mock_session) -> None:
    """SkillRepository.bulk_soft_delete marks all skills as deleted."""
    skills = [SkillsCatalogFactory() for _ in range(3)]
    for s in skills:
        assert s.deleted_at is None

    repo = SkillRepository(mock_session)
    count = repo.bulk_soft_delete(skills)

    assert count == 3
    for s in skills:
        assert s.deleted_at is not None
    mock_session.flush.assert_called_once()


@pytest.mark.unit
def test_bulk_soft_delete_returns_zero_for_empty_list(mock_session) -> None:
    """SkillRepository.bulk_soft_delete returns 0 for an empty list."""
    repo = SkillRepository(mock_session)
    count = repo.bulk_soft_delete([])

    assert count == 0


# ---------------------------------------------------------------------------
# get_usage_count
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_get_usage_count_returns_integer(mock_session) -> None:
    """SkillRepository.get_usage_count returns the count from the query."""
    mock_session.query.return_value.filter.return_value.scalar.return_value = 7

    repo = SkillRepository(mock_session)
    result = repo.get_usage_count("skill_abc")

    assert result == 7


@pytest.mark.unit
def test_get_usage_count_returns_zero_when_none(mock_session) -> None:
    """SkillRepository.get_usage_count returns 0 when scalar returns None."""
    mock_session.query.return_value.filter.return_value.scalar.return_value = None

    repo = SkillRepository(mock_session)
    result = repo.get_usage_count("skill_abc")

    assert result == 0


# ---------------------------------------------------------------------------
# get_usage_counts_bulk
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_get_usage_counts_bulk_returns_dict(mock_session) -> None:
    """SkillRepository.get_usage_counts_bulk returns a mapping of id to count."""
    (
        mock_session.query.return_value
        .filter.return_value
        .group_by.return_value
        .all.return_value
    ) = [("skill_a", 3), ("skill_b", 1)]

    repo = SkillRepository(mock_session)
    result = repo.get_usage_counts_bulk(["skill_a", "skill_b", "skill_c"])

    assert result == {"skill_a": 3, "skill_b": 1, "skill_c": 0}


@pytest.mark.unit
def test_get_usage_counts_bulk_returns_empty_dict_for_empty_input(mock_session) -> None:
    """SkillRepository.get_usage_counts_bulk returns empty dict for empty input."""
    repo = SkillRepository(mock_session)
    result = repo.get_usage_counts_bulk([])

    assert result == {}


# ---------------------------------------------------------------------------
# count — category filter
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_count_with_category_applies_extra_filter(mock_session) -> None:
    """SkillRepository.count with category applies an additional filter and returns count."""
    mock_session.query.return_value.filter.return_value.filter.return_value.scalar.return_value = 3

    repo = SkillRepository(mock_session)
    result = repo.count(category="Technical")

    assert result == 3


@pytest.mark.unit
def test_count_with_category_returns_zero_when_scalar_is_none(mock_session) -> None:
    """SkillRepository.count returns 0 when category filter matches no rows."""
    mock_session.query.return_value.filter.return_value.filter.return_value.scalar.return_value = None

    repo = SkillRepository(mock_session)
    result = repo.count(category="Nonexistent")

    assert result == 0


# ---------------------------------------------------------------------------
# find_all_categories
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_find_all_categories_returns_list_of_strings(mock_session) -> None:
    """SkillRepository.find_all_categories extracts category strings from rows."""
    mock_rows = [MagicMock(category="Backend"), MagicMock(category="Frontend")]
    (
        mock_session.query.return_value
        .filter.return_value
        .distinct.return_value
        .order_by.return_value
        .all.return_value
    ) = mock_rows

    repo = SkillRepository(mock_session)
    result = repo.find_all_categories()

    assert result == ["Backend", "Frontend"]


@pytest.mark.unit
def test_find_all_categories_returns_empty_list_when_no_categories(mock_session) -> None:
    """SkillRepository.find_all_categories returns [] when no skills have a category."""
    (
        mock_session.query.return_value
        .filter.return_value
        .distinct.return_value
        .order_by.return_value
        .all.return_value
    ) = []

    repo = SkillRepository(mock_session)
    result = repo.find_all_categories()

    assert result == []


# ---------------------------------------------------------------------------
# find_all_paginated — offset-based
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_find_all_paginated_returns_list_from_query(mock_session) -> None:
    """find_all_paginated returns skills from the query result."""
    skills = [SkillsCatalogFactory(), SkillsCatalogFactory()]
    (
        mock_session.query.return_value
        .filter.return_value
        .order_by.return_value
        .offset.return_value
        .limit.return_value
        .all.return_value
    ) = skills

    repo = SkillRepository(mock_session)
    result = repo.find_all_paginated(
        search=None, sort_by="name", sort_dir="asc", limit=10, offset=0, category=None
    )

    assert result == skills


@pytest.mark.unit
def test_find_all_paginated_with_search_adds_filter(mock_session) -> None:
    """find_all_paginated with search applies an additional ILIKE filter."""
    skills = [SkillsCatalogFactory()]
    (
        mock_session.query.return_value
        .filter.return_value
        .filter.return_value
        .order_by.return_value
        .offset.return_value
        .limit.return_value
        .all.return_value
    ) = skills

    repo = SkillRepository(mock_session)
    result = repo.find_all_paginated(
        search="python", sort_by="created_at", sort_dir="desc", limit=50, offset=0, category=None
    )

    assert result == skills


@pytest.mark.unit
def test_find_all_paginated_returns_empty_list_when_no_rows(mock_session) -> None:
    """find_all_paginated returns [] when the query produces no rows."""
    (
        mock_session.query.return_value
        .filter.return_value
        .order_by.return_value
        .offset.return_value
        .limit.return_value
        .all.return_value
    ) = []

    repo = SkillRepository(mock_session)
    result = repo.find_all_paginated(
        search=None, sort_by="name", sort_dir="asc", limit=100, offset=0, category=None
    )

    assert result == []


@pytest.mark.unit
def test_find_all_paginated_with_category_adds_filter(mock_session) -> None:
    """find_all_paginated with category applies an additional filter."""
    skills = [SkillsCatalogFactory(category="Backend")]
    (
        mock_session.query.return_value
        .filter.return_value
        .filter.return_value
        .order_by.return_value
        .offset.return_value
        .limit.return_value
        .all.return_value
    ) = skills

    repo = SkillRepository(mock_session)
    result = repo.find_all_paginated(
        search=None, sort_by="name", sort_dir="desc", limit=10, offset=0, category="Backend"
    )

    assert result == skills


@pytest.mark.unit
def test_find_all_paginated_with_nonzero_offset(mock_session) -> None:
    """find_all_paginated passes offset through to the query chain."""
    skills = [SkillsCatalogFactory()]
    (
        mock_session.query.return_value
        .filter.return_value
        .order_by.return_value
        .offset.return_value
        .limit.return_value
        .all.return_value
    ) = skills

    repo = SkillRepository(mock_session)
    result = repo.find_all_paginated(
        search=None, sort_by="created_at", sort_dir="asc", limit=10, offset=100, category=None
    )

    assert result == skills


# ---------------------------------------------------------------------------
# find_by_ids — edge case
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_find_by_ids_with_empty_list_returns_empty(mock_session) -> None:
    """SkillRepository.find_by_ids with empty input returns [] from the query."""
    mock_session.query.return_value.filter.return_value.all.return_value = []

    repo = SkillRepository(mock_session)
    result = repo.find_by_ids([])

    assert result == []


# ---------------------------------------------------------------------------
# count — search + category combined
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_count_with_search_and_category_chains_two_filters(mock_session) -> None:
    """SkillRepository.count with both search and category applies two extra filters."""
    (
        mock_session.query.return_value
        .filter.return_value
        .filter.return_value
        .filter.return_value
        .scalar.return_value
    ) = 2

    repo = SkillRepository(mock_session)
    result = repo.count(search="react", category="Frontend")

    assert result == 2


# ---------------------------------------------------------------------------
# get_usage_counts_bulk — partial DB results
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_get_usage_counts_bulk_defaults_missing_ids_to_zero(mock_session) -> None:
    """get_usage_counts_bulk returns 0 for IDs not present in the DB result."""
    (
        mock_session.query.return_value
        .filter.return_value
        .group_by.return_value
        .all.return_value
    ) = [("skill_a", 5)]

    repo = SkillRepository(mock_session)
    result = repo.get_usage_counts_bulk(["skill_a", "skill_b", "skill_c"])

    assert result["skill_a"] == 5
    assert result["skill_b"] == 0
    assert result["skill_c"] == 0


# ---------------------------------------------------------------------------
# bulk_recategorize
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_bulk_recategorize_updates_category_on_matched_skills(mock_session) -> None:
    """bulk_recategorize sets category on all matched skills and flushes."""
    skills = [SkillsCatalogFactory(category="OldCat") for _ in range(3)]
    (
        mock_session.query.return_value
        .filter.return_value
        .filter.return_value
        .all.return_value
    ) = skills

    repo = SkillRepository(mock_session)
    count = repo.bulk_recategorize(from_category="OldCat", to_category="NewCat")

    assert count == 3
    for skill in skills:
        assert skill.category == "NewCat"
    mock_session.flush.assert_called_once()


@pytest.mark.unit
def test_bulk_recategorize_returns_zero_when_no_skills_match(mock_session) -> None:
    """bulk_recategorize returns 0 when no skills match from_category."""
    (
        mock_session.query.return_value
        .filter.return_value
        .filter.return_value
        .all.return_value
    ) = []

    repo = SkillRepository(mock_session)
    count = repo.bulk_recategorize(from_category="Ghost", to_category="NewCat")

    assert count == 0


@pytest.mark.unit
def test_bulk_recategorize_from_none_targets_uncategorized_skills(mock_session) -> None:
    """bulk_recategorize with from_category=None reassigns uncategorized skills."""
    skills = [SkillsCatalogFactory(category=None) for _ in range(2)]
    (
        mock_session.query.return_value
        .filter.return_value
        .filter.return_value
        .all.return_value
    ) = skills

    repo = SkillRepository(mock_session)
    count = repo.bulk_recategorize(from_category=None, to_category="Backend")

    assert count == 2
    for skill in skills:
        assert skill.category == "Backend"


@pytest.mark.unit
def test_bulk_recategorize_to_none_clears_category(mock_session) -> None:
    """bulk_recategorize with to_category=None sets category to None on all matched rows."""
    skills = [SkillsCatalogFactory(category="Backend")]
    (
        mock_session.query.return_value
        .filter.return_value
        .filter.return_value
        .all.return_value
    ) = skills

    repo = SkillRepository(mock_session)
    repo.bulk_recategorize(from_category="Backend", to_category=None)

    assert skills[0].category is None
