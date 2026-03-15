"""Business logic for the Skill Repository (Epic 3.2)."""

from __future__ import annotations

import secrets
from datetime import datetime, timezone

import structlog

from ..db.repositories.skill_repository import SkillRepository
from ..db.models.config_tables import SkillsCatalog
from ..exceptions import ConflictError, ResourceNotFoundError
from ..lib.search_tokens import generate_search_tokens
from ..schemas.common import PaginationMeta
from ..schemas.skills import (
    BulkDeleteSkillsResponse,
    BulkRecategorizeResponse,
    CreateSkillRequest,
    SkillResponse,
)

logger = structlog.get_logger()


class SkillService:
    """Orchestrates all business logic for the global skills repository.

    Delegates data access entirely to SkillRepository; raises domain exceptions
    that the API layer translates to HTTP status codes.
    """

    def __init__(self, repository: SkillRepository) -> None:
        self._repo = repository

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    def list_skills(
        self,
        search: str | None,
        sort_by: str,
        sort_dir: str,
        limit: int,
        offset: int,
        category: str | None,
    ) -> tuple[list[SkillResponse], PaginationMeta]:
        """Return a paginated, optionally filtered page of skills with usage counts.

        Args:
            search: Optional fuzzy-search term applied to skill names.
            sort_by: Column to sort by — "name", "created_at", or "usage_count".
            sort_dir: "asc" or "desc".
            limit: Page size (clamped to 1–500).
            offset: Row offset for the requested page.
            category: Optional exact category filter.

        Returns:
            Tuple of (skill list, pagination metadata).
        """
        effective_limit = min(max(limit, 1), 500)
        effective_sort_by = sort_by if sort_by in ("name", "created_at", "usage_count") else "created_at"
        effective_sort_dir = sort_dir if sort_dir in ("asc", "desc") else "desc"

        rows = self._repo.find_all_paginated(
            search=search or None,
            sort_by=effective_sort_by,
            sort_dir=effective_sort_dir,
            limit=effective_limit,
            offset=max(offset, 0),
            category=category or None,
        )
        total = self._repo.count(search=search or None, category=category or None)

        skill_ids = [r.id for r in rows]
        usage_map = self._repo.get_usage_counts_bulk(skill_ids)

        skills = [
            SkillResponse(
                id=row.id,
                name=row.name,
                category=row.category,
                usage_count=usage_map.get(row.id, 0),
                created_at=row.created_at,
            )
            for row in rows
        ]

        meta = PaginationMeta(
            total=total,
            page_size=effective_limit,
            next_cursor=None,
            prev_cursor=None,
        )
        return skills, meta

    def list_categories(self) -> list[str]:
        """Return all distinct non-null skill categories in alphabetical order."""
        return self._repo.find_all_categories()

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    def create_skill(
        self, request: CreateSkillRequest, created_by: str | None
    ) -> SkillResponse:
        """Create a new skill in the global repository.

        Args:
            request: Validated create payload containing name and optional category.
            created_by: Employee ID of the admin creating the skill, or None.

        Returns:
            The newly created skill response.

        Raises:
            ConflictError: If a skill with the same name (case-insensitive) already exists.
        """
        existing = self._repo.find_by_name(request.name)
        if existing:
            raise ConflictError(f"A skill named '{request.name}' already exists.")

        now = datetime.now(timezone.utc)
        skill = SkillsCatalog(
            id=f"skill_{secrets.token_hex(8)}",
            name=request.name,
            category=request.category,
            search_tokens=generate_search_tokens(request.name),
            created_by=created_by,
            created_at=now,
            updated_at=now,
        )
        saved = self._repo.save(skill)
        logger.info("Skill created.", skill_id=saved.id, name=saved.name)
        return SkillResponse(
            id=saved.id,
            name=saved.name,
            category=saved.category,
            usage_count=0,
            created_at=saved.created_at,
        )

    def bulk_recategorize(self, from_category: str | None, to_category: str | None) -> BulkRecategorizeResponse:
        """Reassign all skills from one category to another.

        Args:
            from_category: Source category name, or None for uncategorized.
            to_category: Target category name, or None to uncategorize.

        Returns:
            Summary with the number of updated skills.
        """
        count = self._repo.bulk_recategorize(from_category, to_category)
        logger.info("Bulk recategorize.", from_cat=from_category, to_cat=to_category, count=count)
        return BulkRecategorizeResponse(updated_count=count)

    def delete_skill(self, skill_id: str) -> None:
        """Soft-delete a single skill by ID.

        Args:
            skill_id: The skills_catalog primary key to delete.

        Raises:
            ResourceNotFoundError: If the skill does not exist or is already deleted.
        """
        skill = self._repo.find_by_id(skill_id)
        if not skill:
            raise ResourceNotFoundError(f"Skill '{skill_id}' not found.")
        self._repo.soft_delete(skill)
        logger.info("Skill deleted.", skill_id=skill_id)

    def bulk_delete_skills(self, ids: list[str]) -> BulkDeleteSkillsResponse:
        """Soft-delete a batch of skills, reporting found vs. not-found.

        Skills that cannot be found (already deleted or never existed) are reported
        in skipped_ids rather than raising an exception, so the caller can still
        delete the remaining valid items.

        Args:
            ids: List of skills_catalog primary keys to delete.

        Returns:
            Summary of how many were deleted vs. skipped.
        """
        found = self._repo.find_by_ids(ids)
        found_ids = {s.id for s in found}
        skipped = [sid for sid in ids if sid not in found_ids]

        deleted_count = self._repo.bulk_soft_delete(found)
        logger.info(
            "Bulk skill delete.",
            deleted=deleted_count,
            skipped=len(skipped),
        )
        return BulkDeleteSkillsResponse(
            deleted_count=deleted_count,
            skipped_count=len(skipped),
            skipped_ids=skipped,
        )
