"""Utility: generate a suggested work email from an employee's full name.

Formula (Spec 2.2 / U.7):
  1. Strip leading/trailing whitespace.
  2. Collapse internal whitespace runs to single dots.
  3. Append @AtDawnTech.com.
"""

import re


def generate_work_email(full_name: str) -> str:
    """Return a work email suggestion derived from the employee's full name.

    Args:
        full_name: Display name, e.g. "Jane Smith" or " Ryan Tjan ".

    Returns:
        Email string, e.g. "Jane.Smith@AtDawnTech.com".
    """
    name = full_name.strip()
    name = re.sub(r"\s+", ".", name)
    return f"{name}@AtDawnTech.com"
