"""Repository for SkillsCatalog — paginated CRUD with fuzzy search and usage counts."""

from datetime import UTC, datetime, timezone

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from ..models.config_tables import SkillsCatalog
from ..models.employees import EmployeeSkill


class SkillRepository:
    """Data-access layer for the skills_catalog table.

    All queries automatically exclude soft-deleted rows (deleted_at IS NOT NULL).
    """

    def __init__(self, session: Session) -> None:
        self._db = session

    # ------------------------------------------------------------------
    # Queries
    # ------------------------------------------------------------------

    def find_by_id(self, skill_id: str) -> SkillsCatalog | None:
        """Return a single non-deleted skill by primary key, or None if absent.

        Args:
            skill_id: The skills_catalog primary key.

        Returns:
            The matching SkillsCatalog row, or None.
        """
        return (
            self._db.query(SkillsCatalog)
            .filter(SkillsCatalog.id == skill_id, SkillsCatalog.deleted_at.is_(None))
            .first()
        )

    def find_by_name(self, name: str) -> SkillsCatalog | None:
        """Return a non-deleted skill whose name matches case-insensitively, or None.

        Args:
            name: The skill name to search for (case-insensitive).

        Returns:
            The matching SkillsCatalog row, or None.
        """
        return (
            self._db.query(SkillsCatalog)
            .filter(
                func.lower(SkillsCatalog.name) == name.lower(),
                SkillsCatalog.deleted_at.is_(None),
            )
            .first()
        )

    def find_by_ids(self, ids: list[str]) -> list[SkillsCatalog]:
        """Return all non-deleted skills whose IDs are in the provided list.

        Args:
            ids: List of skills_catalog primary keys to fetch.

        Returns:
            List of matching SkillsCatalog rows (may be shorter than ids if some
            are missing or soft-deleted).
        """
        return (
            self._db.query(SkillsCatalog)
            .filter(SkillsCatalog.id.in_(ids), SkillsCatalog.deleted_at.is_(None))
            .all()
        )

    def count(self, search: str | None = None, category: str | None = None) -> int:
        """Return the total count of non-deleted skills, optionally filtered.

        Args:
            search: Optional substring to filter names with ILIKE.
            category: Optional exact category match.

        Returns:
            Total matching row count.
        """
        q = self._db.query(func.count(SkillsCatalog.id)).filter(
            SkillsCatalog.deleted_at.is_(None)
        )
        if search:
            term = f"%{search}%"
            q = q.filter(or_(
                SkillsCatalog.name.ilike(term),
                SkillsCatalog.search_tokens.ilike(term),
            ))
        if category:
            q = q.filter(SkillsCatalog.category == category)
        return q.scalar() or 0

    def find_all_categories(self) -> list[str]:
        """Return all distinct non-null categories in alphabetical order."""
        rows = (
            self._db.query(SkillsCatalog.category)
            .filter(SkillsCatalog.deleted_at.is_(None), SkillsCatalog.category.isnot(None))
            .distinct()
            .order_by(SkillsCatalog.category.asc())
            .all()
        )
        return [r.category for r in rows]

    def find_all_paginated(
        self,
        search: str | None,
        sort_by: str,
        sort_dir: str,
        limit: int,
        cursor: str | None,
        category: str | None,
    ) -> list[SkillsCatalog]:
        """Return a page of skills using cursor-based pagination.

        The cursor encodes the last row seen as ``sort_value|id``. For
        ``usage_count`` sort, the cursor encodes ``created_at|id`` (the
        secondary sort key) because usage counts are dynamic and cannot be
        used reliably for keyset pagination.

        Args:
            search: Optional ILIKE filter applied to skill name and search_tokens.
            sort_by: Column to sort by — "name", "created_at", or "usage_count".
            sort_dir: "asc" or "desc".
            limit: Maximum number of rows to return.
            cursor: Opaque continuation token from the previous page, or None.
            category: Optional exact category filter.

        Returns:
            Up to ``limit + 1`` matching rows. The caller checks ``len > limit``
            to determine whether a next page exists.
        """
        q = self._db.query(SkillsCatalog).filter(SkillsCatalog.deleted_at.is_(None))

        if search:
            term = f"%{search}%"
            q = q.filter(or_(
                SkillsCatalog.name.ilike(term),
                SkillsCatalog.search_tokens.ilike(term),
            ))

        if category:
            q = q.filter(SkillsCatalog.category == category)

        if sort_by == "usage_count":
            usage_subq = (
                self._db.query(func.count(EmployeeSkill.skill_id))
                .filter(EmployeeSkill.skill_id == SkillsCatalog.id)
                .correlate(SkillsCatalog)
                .scalar_subquery()
            )
            if sort_dir == "asc":
                q = q.order_by(usage_subq.asc(), SkillsCatalog.created_at.asc(), SkillsCatalog.id.asc())
            else:
                q = q.order_by(usage_subq.desc(), SkillsCatalog.created_at.desc(), SkillsCatalog.id.desc())

            # Cursor for usage_count sort is created_at|id (stable secondary key)
            if cursor:
                parts = cursor.split("|", 1)
                if len(parts) == 2:
                    try:
                        cursor_dt = datetime.fromisoformat(parts[0]).replace(tzinfo=timezone.utc)
                        cursor_id = parts[1]
                        if sort_dir == "asc":
                            q = q.filter(
                                (SkillsCatalog.created_at > cursor_dt)
                                | ((SkillsCatalog.created_at == cursor_dt) & (SkillsCatalog.id > cursor_id))
                            )
                        else:
                            q = q.filter(
                                (SkillsCatalog.created_at < cursor_dt)
                                | ((SkillsCatalog.created_at == cursor_dt) & (SkillsCatalog.id < cursor_id))
                            )
                    except ValueError:
                        pass

        elif sort_by == "name":
            if sort_dir == "asc":
                q = q.order_by(SkillsCatalog.name.asc(), SkillsCatalog.id.asc())
            else:
                q = q.order_by(SkillsCatalog.name.desc(), SkillsCatalog.id.desc())

            if cursor:
                parts = cursor.split("|", 1)
                if len(parts) == 2:
                    cursor_name, cursor_id = parts[0], parts[1]
                    if sort_dir == "asc":
                        q = q.filter(
                            (SkillsCatalog.name > cursor_name)
                            | ((SkillsCatalog.name == cursor_name) & (SkillsCatalog.id > cursor_id))
                        )
                    else:
                        q = q.filter(
                            (SkillsCatalog.name < cursor_name)
                            | ((SkillsCatalog.name == cursor_name) & (SkillsCatalog.id < cursor_id))
                        )

        else:  # created_at
            if sort_dir == "asc":
                q = q.order_by(SkillsCatalog.created_at.asc(), SkillsCatalog.id.asc())
            else:
                q = q.order_by(SkillsCatalog.created_at.desc(), SkillsCatalog.id.desc())

            if cursor:
                parts = cursor.split("|", 1)
                if len(parts) == 2:
                    try:
                        cursor_dt = datetime.fromisoformat(parts[0]).replace(tzinfo=timezone.utc)
                        cursor_id = parts[1]
                        if sort_dir == "asc":
                            q = q.filter(
                                (SkillsCatalog.created_at > cursor_dt)
                                | ((SkillsCatalog.created_at == cursor_dt) & (SkillsCatalog.id > cursor_id))
                            )
                        else:
                            q = q.filter(
                                (SkillsCatalog.created_at < cursor_dt)
                                | ((SkillsCatalog.created_at == cursor_dt) & (SkillsCatalog.id < cursor_id))
                            )
                    except ValueError:
                        pass

        return q.limit(limit + 1).all()

    def get_usage_count(self, skill_id: str) -> int:
        """Return how many employee_skills rows reference this skill.

        Args:
            skill_id: The skills_catalog primary key.

        Returns:
            Count of employee_skills rows with skill_id matching the argument.
        """
        return (
            self._db.query(func.count(EmployeeSkill.skill_id))
            .filter(EmployeeSkill.skill_id == skill_id)
            .scalar()
            or 0
        )

    def get_usage_counts_bulk(self, skill_ids: list[str]) -> dict[str, int]:
        """Return a mapping of skill_id → employee_skills count for all requested IDs.

        Runs a single aggregated query rather than N individual queries.

        Args:
            skill_ids: List of skills_catalog primary keys.

        Returns:
            Dict mapping each skill_id to its usage count; missing IDs default to 0.
        """
        if not skill_ids:
            return {}
        rows = (
            self._db.query(EmployeeSkill.skill_id, func.count(EmployeeSkill.skill_id))
            .filter(EmployeeSkill.skill_id.in_(skill_ids))
            .group_by(EmployeeSkill.skill_id)
            .all()
        )
        result = {sid: 0 for sid in skill_ids}
        for sid, cnt in rows:
            result[sid] = cnt
        return result

    # ------------------------------------------------------------------
    # Mutations
    # ------------------------------------------------------------------

    def save(self, skill: SkillsCatalog) -> SkillsCatalog:
        """Persist a new or updated SkillsCatalog row and flush to the session.

        Args:
            skill: The ORM instance to persist.

        Returns:
            The persisted SkillsCatalog instance.
        """
        self._db.add(skill)
        self._db.flush()
        return skill

    def soft_delete(self, skill: SkillsCatalog) -> None:
        """Mark a single skill as deleted by setting deleted_at to now.

        Args:
            skill: The ORM instance to soft-delete.
        """
        skill.deleted_at = datetime.now(UTC)
        self._db.flush()

    def bulk_recategorize(self, from_category: str | None, to_category: str | None) -> int:
        """Reassign all non-deleted skills from one category to another.

        Args:
            from_category: Source category name, or None for uncategorized skills.
            to_category: Target category name, or None to uncategorize.

        Returns:
            Number of rows updated.
        """
        q = self._db.query(SkillsCatalog).filter(SkillsCatalog.deleted_at.is_(None))
        if from_category is None:
            q = q.filter(SkillsCatalog.category.is_(None))
        else:
            q = q.filter(SkillsCatalog.category == from_category)
        rows = q.all()
        now = datetime.now(UTC)
        for row in rows:
            row.category = to_category
            row.updated_at = now
        self._db.flush()
        return len(rows)

    def bulk_soft_delete(self, skills: list[SkillsCatalog]) -> int:
        """Mark multiple skills as deleted in a single flush.

        Args:
            skills: List of ORM instances to soft-delete.

        Returns:
            The number of skills marked as deleted.
        """
        now = datetime.now(UTC)
        for skill in skills:
            skill.deleted_at = now
        self._db.flush()
        return len(skills)
