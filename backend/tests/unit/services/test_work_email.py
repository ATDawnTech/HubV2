"""Unit tests for work email generation (U.7).

Spec: Trim leading/trailing whitespace → replace internal spaces with `.`
      → append @AtDawnTech.com
"""

import pytest

from src.adthub.services.work_email import generate_work_email


@pytest.mark.unit
def test_u7_1_standard_name() -> None:
    """U.7.1: Standard first/last name produces FirstName.LastName@AtDawnTech.com."""
    assert generate_work_email("Jane Smith") == "Jane.Smith@AtDawnTech.com"


@pytest.mark.unit
def test_u7_2_strips_leading_trailing_whitespace() -> None:
    """U.7.2: Leading/trailing whitespace is stripped before generating the email."""
    assert generate_work_email(" Ryan Tjan ") == "Ryan.Tjan@AtDawnTech.com"


@pytest.mark.unit
def test_u7_3_single_name_no_space() -> None:
    """U.7.3: Single-token name (no spaces) appends domain directly."""
    assert generate_work_email("Alice") == "Alice@AtDawnTech.com"


@pytest.mark.unit
def test_u7_4_multiple_internal_spaces_collapsed() -> None:
    """U.7.4: Multiple consecutive internal spaces are collapsed to single dots."""
    assert generate_work_email("Mary  Jane  Watson") == "Mary.Jane.Watson@AtDawnTech.com"
