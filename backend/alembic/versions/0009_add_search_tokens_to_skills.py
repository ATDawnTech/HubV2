"""Add search_tokens column to skills_catalog for fuzzy abbreviation search.

Revision ID: 0009
Revises: 0008
Create Date: 2026-03-13

Changes:
- Adds search_tokens TEXT column to skills_catalog
- Backfills tokens for all existing skills
"""

import re

from alembic import op
from sqlalchemy import text

revision: str = "0009"
down_revision: str = "0008"
branch_labels = None
depends_on = None


def _generate_tokens(name: str) -> str:
    """Generate search tokens from a skill name.

    Produces a space-separated string of lowercase aliases:
    - The full name lowercased
    - Initials of multi-word names (e.g. "Machine Learning" -> "ml")
    - Name with all non-alphanumeric chars stripped (e.g. "Vue.js" -> "vuejs")
    - Individual words from the name
    - CamelCase split (e.g. "TypeScript" -> "type script")
    """
    lower = name.lower().strip()
    tokens: set[str] = set()

    # Full name
    tokens.add(lower)

    # Individual words (split on spaces, dots, slashes, hyphens)
    words = re.split(r"[\s./\-_]+", lower)
    words = [w for w in words if w]
    for w in words:
        tokens.add(w)

    # Initials from words
    if len(words) > 1:
        initials = "".join(w[0] for w in words if w)
        tokens.add(initials)

    # Stripped version (remove all non-alphanumeric)
    stripped = re.sub(r"[^a-z0-9]", "", lower)
    if stripped:
        tokens.add(stripped)

    # CamelCase split: "TypeScript" -> ["type", "script"]
    camel_parts = re.sub(r"([a-z])([A-Z])", r"\1 \2", name).lower().split()
    for part in camel_parts:
        clean = re.sub(r"[^a-z0-9]", "", part)
        if clean:
            tokens.add(clean)

    # Concatenated camel parts without spaces
    if len(camel_parts) > 1:
        concat = "".join(re.sub(r"[^a-z0-9]", "", p) for p in camel_parts)
        if concat:
            tokens.add(concat)
        # Also initials from camel parts
        camel_initials = "".join(p[0] for p in camel_parts if p)
        tokens.add(camel_initials)

    # Common tech patterns: "C#" -> "csharp", "C++" -> "cpp"
    special = {
        "c#": "csharp",
        "c++": "cpp",
        "f#": "fsharp",
    }
    if lower in special:
        tokens.add(special[lower])

    return " ".join(sorted(tokens))


def upgrade() -> None:
    conn = op.get_bind()

    # 1. Add column
    conn.execute(text(
        "ALTER TABLE skills_catalog ADD COLUMN IF NOT EXISTS search_tokens TEXT DEFAULT ''"
    ))

    # 2. Backfill existing rows
    rows = conn.execute(text("SELECT id, name FROM skills_catalog")).fetchall()
    for row in rows:
        tokens = _generate_tokens(row[1])
        conn.execute(
            text("UPDATE skills_catalog SET search_tokens = :tokens WHERE id = :id"),
            {"tokens": tokens, "id": row[0]},
        )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE skills_catalog DROP COLUMN IF EXISTS search_tokens"))
