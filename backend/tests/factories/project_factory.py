import uuid
from datetime import datetime, timezone
import factory
from src.adthub.db.models.projects import Project


class ProjectFactory(factory.Factory):
    class Meta:
        model = Project

    id = factory.LazyFunction(lambda: f"proj_{uuid.uuid4().hex[:12]}")
    name = factory.Sequence(lambda n: f"Test Project {n}")
    status = "pipeline"
    created_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))
    updated_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))
    deleted_at = None


class ActiveProjectFactory(ProjectFactory):
    status = "active"
