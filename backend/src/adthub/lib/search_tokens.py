"""Auto-generate search tokens from a skill name for fuzzy abbreviation matching.

Produces a space-separated string of lowercase aliases so that searching
"js" matches "JavaScript", "ml" matches "Machine Learning", etc.
"""

from __future__ import annotations

import re

# Common tech name expansions
_SPECIAL: dict[str, str] = {
    "c#": "csharp",
    "c++": "cpp",
    "f#": "fsharp",
}


def generate_search_tokens(name: str) -> str:
    """Return a space-separated string of search tokens derived from *name*.

    Token sources:
    - Full name lowercased
    - Individual words (split on space, dot, slash, hyphen, underscore)
    - Initials of multi-word names ("Machine Learning" -> "ml")
    - All non-alphanumeric characters stripped ("Vue.js" -> "vuejs")
    - CamelCase split ("TypeScript" -> "type", "script", "ts")
    - Hardcoded special expansions ("C#" -> "csharp")

    Args:
        name: The human-readable skill name.

    Returns:
        Space-separated lowercase tokens.
    """
    lower = name.lower().strip()
    tokens: set[str] = set()

    # Full name
    tokens.add(lower)

    # Individual words (split on separators)
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

    # Concatenated camel parts
    if len(camel_parts) > 1:
        concat = "".join(re.sub(r"[^a-z0-9]", "", p) for p in camel_parts)
        if concat:
            tokens.add(concat)
        camel_initials = "".join(p[0] for p in camel_parts if p)
        tokens.add(camel_initials)

    # Special expansions
    if lower in _SPECIAL:
        tokens.add(_SPECIAL[lower])

    return " ".join(sorted(tokens))
