"""Schema constraint tests for skills_catalog table (Epic 3.2)."""

import pytest
import sqlalchemy.exc
from tests.factories.skill_factory import SkillsCatalogFactory


@pytest.mark.schema
def test_d10_1_skill_name_unique_violation(db_session) -> None:
    """D.10.1: skills_catalog.name UNIQUE — duplicate name is rejected."""
    skill1 = SkillsCatalogFactory(name="TypeScript")
    skill2 = SkillsCatalogFactory(name="TypeScript")
    db_session.add(skill1)
    db_session.flush()

    db_session.add(skill2)
    with pytest.raises(sqlalchemy.exc.IntegrityError):
        db_session.flush()


@pytest.mark.schema
def test_d10_2_skill_name_not_null_violation(db_session) -> None:
    """D.10.2: skills_catalog.name NOT NULL — null name is rejected."""
    skill = SkillsCatalogFactory()
    skill.name = None
    db_session.add(skill)
    with pytest.raises(sqlalchemy.exc.IntegrityError):
        db_session.flush()


@pytest.mark.schema
def test_d10_3_skill_id_primary_key_unique(db_session) -> None:
    """D.10.3: skills_catalog.id PRIMARY KEY — duplicate ID is rejected."""
    skill1 = SkillsCatalogFactory(id="skill_dup123")
    skill2 = SkillsCatalogFactory(id="skill_dup123", name="Other Skill")
    db_session.add(skill1)
    db_session.flush()

    db_session.add(skill2)
    with pytest.raises(sqlalchemy.exc.IntegrityError):
        db_session.flush()


@pytest.mark.schema
def test_d10_4_skill_search_tokens_not_null_violation(db_session) -> None:
    """D.10.4: skills_catalog.search_tokens NOT NULL — null search_tokens is rejected."""
    skill = SkillsCatalogFactory()
    skill.search_tokens = None
    db_session.add(skill)
    with pytest.raises(sqlalchemy.exc.IntegrityError):
        db_session.flush()


@pytest.mark.schema
def test_d10_5_skill_category_nullable_accepted(db_session) -> None:
    """D.10.5: skills_catalog.category is nullable — null category is accepted."""
    skill = SkillsCatalogFactory(category=None)
    db_session.add(skill)
    db_session.flush()

    assert skill.category is None


@pytest.mark.schema
def test_d10_6_skill_deleted_at_nullable_accepted(db_session) -> None:
    """D.10.6: skills_catalog.deleted_at is nullable — null is accepted (active skill)."""
    skill = SkillsCatalogFactory(deleted_at=None)
    db_session.add(skill)
    db_session.flush()

    assert skill.deleted_at is None
