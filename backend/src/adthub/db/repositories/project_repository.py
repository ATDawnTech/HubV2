from sqlalchemy.orm import Session
from .base import BaseRepository
from ..models.projects import Project


class ProjectRepository(BaseRepository[Project]):
    """Repository for project data access."""

    def __init__(self, session: Session) -> None:
        super().__init__(Project, session)

    def find_by_status(self, status: str, limit: int = 20, cursor: str | None = None) -> list[Project]:
        """Find projects by status."""
        query = (
            self._session.query(Project)
            .filter(
                Project.status == status,
                Project.deleted_at.is_(None),
            )
            .order_by(Project.id)
            .limit(limit + 1)
        )
        if cursor:
            query = query.filter(Project.id > cursor)
        return query.all()

    def find_by_manager(self, manager_id: str, limit: int = 20) -> list[Project]:
        """Find projects managed by a specific employee."""
        return (
            self._session.query(Project)
            .filter(
                Project.project_manager_id == manager_id,
                Project.deleted_at.is_(None),
            )
            .order_by(Project.id)
            .limit(limit)
            .all()
        )
