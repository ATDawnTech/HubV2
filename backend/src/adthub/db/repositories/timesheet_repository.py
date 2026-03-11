from sqlalchemy.orm import Session
from .base import BaseRepository
from ..models.timesheets import Timesheet


class TimesheetRepository(BaseRepository[Timesheet]):
    """Repository for timesheet data access."""

    def __init__(self, session: Session) -> None:
        super().__init__(Timesheet, session)

    def find_by_employee(self, employee_id: str, limit: int = 20, cursor: str | None = None) -> list[Timesheet]:
        """Find timesheets for a specific employee."""
        query = (
            self._session.query(Timesheet)
            .filter(
                Timesheet.employee_id == employee_id,
                Timesheet.deleted_at.is_(None),
            )
            .order_by(Timesheet.id)
            .limit(limit + 1)
        )
        if cursor:
            query = query.filter(Timesheet.id > cursor)
        return query.all()

    def find_by_project(self, project_id: str, limit: int = 20, cursor: str | None = None) -> list[Timesheet]:
        """Find timesheets for a specific project."""
        query = (
            self._session.query(Timesheet)
            .filter(
                Timesheet.project_id == project_id,
                Timesheet.deleted_at.is_(None),
            )
            .order_by(Timesheet.id)
            .limit(limit + 1)
        )
        if cursor:
            query = query.filter(Timesheet.id > cursor)
        return query.all()

    def find_by_status(self, status: str, limit: int = 20) -> list[Timesheet]:
        """Find timesheets by approval status."""
        return (
            self._session.query(Timesheet)
            .filter(
                Timesheet.status == status,
                Timesheet.deleted_at.is_(None),
            )
            .order_by(Timesheet.id)
            .limit(limit)
            .all()
        )
