from sqlalchemy.orm import Session
from .base import BaseRepository
from ..models.employees import Employee


class EmployeeRepository(BaseRepository[Employee]):
    """Repository for employee data access."""

    def __init__(self, session: Session) -> None:
        super().__init__(Employee, session)

    def find_by_email(self, email: str) -> Employee | None:
        """Find an employee by work email."""
        return (
            self._session.query(Employee)
            .filter(
                Employee.work_email == email,
                Employee.deleted_at.is_(None),
            )
            .first()
        )

    def find_by_status(self, status: str, limit: int = 20, cursor: str | None = None) -> list[Employee]:
        """Find employees by status."""
        query = (
            self._session.query(Employee)
            .filter(
                Employee.status == status,
                Employee.deleted_at.is_(None),
            )
            .order_by(Employee.id)
            .limit(limit + 1)
        )
        if cursor:
            query = query.filter(Employee.id > cursor)
        return query.all()

    def find_active(self, limit: int = 20, cursor: str | None = None) -> list[Employee]:
        """Find all active employees."""
        return self.find_by_status("active", limit=limit, cursor=cursor)
