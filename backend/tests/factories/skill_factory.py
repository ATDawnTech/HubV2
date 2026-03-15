import uuid
from datetime import datetime, timezone
import factory
from src.adthub.db.models.config_tables import SkillsCatalog


class SkillsCatalogFactory(factory.Factory):
    """Factory for SkillsCatalog test instances."""

    class Meta:
        model = SkillsCatalog

    id = factory.LazyFunction(lambda: f"skill_{uuid.uuid4().hex[:12]}")
    name = factory.Sequence(lambda n: f"Skill_{n}")
    category = "Technical"
    search_tokens = factory.LazyAttribute(lambda o: o.name.lower())
    created_by = None
    created_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))
    updated_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))
    deleted_at = None


class DeletedSkillsCatalogFactory(SkillsCatalogFactory):
    """Factory for soft-deleted SkillsCatalog instances."""

    deleted_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))
