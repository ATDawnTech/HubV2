"""Repository for Dashboard task data access — all DB interaction for Epic 1."""

import base64
import json
from datetime import UTC, datetime

from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

from ..models.tasks import DashboardTask


class DashboardRepository:
    """Data access layer for the Hub Dashboard.

    Owns all queries against the dashboard_tasks table. No business logic lives here.
    """

    def __init__(self, session: Session) -> None:
        self._session = session

    def get_module_task_counts(self, assigned_to_id: str) -> dict[str, int]:
        """Return the count of open tasks per module for a given user.

        Args:
            assigned_to_id: The employee ID of the requesting user.

        Returns:
            A dict mapping module identifiers to their open task count.
            Modules with zero open tasks are omitted from the result.
        """
        rows = (
            self._session.query(DashboardTask.module, func.count(DashboardTask.id))
            .filter(
                DashboardTask.assigned_to_id == assigned_to_id,
                DashboardTask.status == "open",
            )
            .group_by(DashboardTask.module)
            .all()
        )
        return dict(rows)

    def find_tasks_for_user(
        self,
        assigned_to_id: str,
        limit: int,
        cursor: str | None,
    ) -> list[DashboardTask]:
        """Return open tasks for a user, sorted by deadline ascending (nulls last).

        Results are cursor-paginated. The caller receives limit+1 rows to determine
        whether a next page exists; the extra row must not be returned to the consumer.

        Args:
            assigned_to_id: The employee ID of the requesting user.
            limit: Maximum number of records to return (caller adds +1 for next-page detection).
            cursor: Opaque cursor from a previous response. None for the first page.

        Returns:
            A list of DashboardTask instances ordered by (deadline ASC NULLS LAST, id ASC).
        """
        query = (
            self._session.query(DashboardTask)
            .filter(
                DashboardTask.assigned_to_id == assigned_to_id,
                DashboardTask.status == "open",
            )
            .order_by(
                DashboardTask.deadline.asc().nulls_last(),
                DashboardTask.id.asc(),
            )
        )

        if cursor is not None:
            cursor_deadline, cursor_id = _decode_cursor(cursor)
            if cursor_deadline is not None:
                query = query.filter(
                    or_(
                        DashboardTask.deadline > cursor_deadline,
                        and_(
                            DashboardTask.deadline == cursor_deadline,
                            DashboardTask.id > cursor_id,
                        ),
                        DashboardTask.deadline.is_(None),
                    )
                )
            else:
                # Cursor is already in the null-deadline section.
                query = query.filter(
                    and_(
                        DashboardTask.deadline.is_(None),
                        DashboardTask.id > cursor_id,
                    )
                )

        return query.limit(limit + 1).all()

    def count_open_tasks_for_user(self, assigned_to_id: str) -> int:
        """Return the total number of open tasks assigned to a user.

        Args:
            assigned_to_id: The employee ID of the requesting user.

        Returns:
            Integer count of open tasks.
        """
        return (
            self._session.query(func.count(DashboardTask.id))
            .filter(
                DashboardTask.assigned_to_id == assigned_to_id,
                DashboardTask.status == "open",
            )
            .scalar()
        ) or 0

    def save_task(self, task: DashboardTask) -> DashboardTask:
        """Persist a new or updated task and return it.

        Args:
            task: The DashboardTask instance to save.

        Returns:
            The saved DashboardTask.
        """
        self._session.add(task)
        self._session.flush()
        return task

    def find_task_by_id(self, task_id: str) -> DashboardTask | None:
        """Find a single task by its primary key.

        Args:
            task_id: The task's unique identifier.

        Returns:
            The matching DashboardTask, or None if not found.
        """
        return (
            self._session.query(DashboardTask)
            .filter(DashboardTask.id == task_id)
            .first()
        )

    def complete_task(self, task: DashboardTask) -> DashboardTask:
        """Mark a task as completed and persist the change.

        Args:
            task: The DashboardTask instance to complete. Must be in 'open' status.

        Returns:
            The mutated task with status='completed' and completed_at set.
        """
        task.status = "completed"
        task.completed_at = datetime.now(UTC)
        task.updated_at = datetime.now(UTC)
        self._session.flush()
        return task


# ---------------------------------------------------------------------------
# Cursor encoding helpers (module-private)
# ---------------------------------------------------------------------------

def _encode_cursor(deadline: datetime | None, task_id: str) -> str:
    """Encode a (deadline, task_id) pair into an opaque cursor string.

    The cursor is base64url-encoded JSON so it is opaque to API consumers.
    """
    payload = {
        "d": deadline.isoformat() if deadline is not None else None,
        "i": task_id,
    }
    return base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()


def _decode_cursor(cursor: str) -> tuple[datetime | None, str]:
    """Decode an opaque cursor into (deadline, task_id).

    Args:
        cursor: An opaque cursor string previously produced by _encode_cursor.

    Returns:
        A tuple of (deadline or None, task_id).
    """
    payload = json.loads(base64.urlsafe_b64decode(cursor).decode())
    deadline = datetime.fromisoformat(payload["d"]) if payload["d"] is not None else None
    return deadline, payload["i"]
