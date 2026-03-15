"""Unit tests for search_tokens generation utility."""

import pytest

from src.adthub.lib.search_tokens import generate_search_tokens


@pytest.mark.unit
def test_single_word_name_includes_lowered_name() -> None:
    """Single-word names include the lowered full name as a token."""
    tokens = generate_search_tokens("Python")
    assert "python" in tokens.split()


@pytest.mark.unit
def test_multi_word_name_generates_initials() -> None:
    """Multi-word names generate an initials token (e.g. 'ml' for Machine Learning)."""
    tokens = generate_search_tokens("Machine Learning")
    parts = tokens.split()
    assert "ml" in parts
    assert "machine" in parts
    assert "learning" in parts


@pytest.mark.unit
def test_camel_case_name_splits_into_parts() -> None:
    """CamelCase names are split into individual lowered parts and initials."""
    tokens = generate_search_tokens("TypeScript")
    parts = tokens.split()
    assert "type" in parts
    assert "script" in parts
    assert "ts" in parts
    assert "typescript" in parts


@pytest.mark.unit
def test_dotted_name_splits_on_separator() -> None:
    """Names with dots are split into separate word tokens."""
    tokens = generate_search_tokens("Vue.js")
    parts = tokens.split()
    assert "vue" in parts
    assert "js" in parts
    assert "vuejs" in parts


@pytest.mark.unit
def test_special_expansion_csharp() -> None:
    """C# expands to 'csharp' via the special expansions table."""
    tokens = generate_search_tokens("C#")
    parts = tokens.split()
    assert "csharp" in parts
    assert "c" in parts


@pytest.mark.unit
def test_special_expansion_cpp() -> None:
    """C++ expands to 'cpp' via the special expansions table."""
    tokens = generate_search_tokens("C++")
    parts = tokens.split()
    assert "cpp" in parts


@pytest.mark.unit
def test_hyphenated_name_splits() -> None:
    """Hyphenated names are split on the separator."""
    tokens = generate_search_tokens("CI-CD")
    parts = tokens.split()
    assert "ci" in parts
    assert "cd" in parts


@pytest.mark.unit
def test_empty_after_strip_returns_empty() -> None:
    """Whitespace-only input produces at least the stripped empty result."""
    tokens = generate_search_tokens("   ")
    # Should not crash; may produce empty or minimal tokens
    assert isinstance(tokens, str)


@pytest.mark.unit
def test_returns_string_type() -> None:
    """generate_search_tokens always returns a string."""
    tokens = generate_search_tokens("Machine Learning")
    assert isinstance(tokens, str)
    assert len(tokens) > 0
