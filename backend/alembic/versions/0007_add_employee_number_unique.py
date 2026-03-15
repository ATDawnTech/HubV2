"""Add UNIQUE constraint to employees.employee_number.

Revision ID: 0007
Revises: 0006
Create Date: 2026-03-12

Changes:
- Adds uq_employees_employee_number UNIQUE constraint (D.1.3 compliance)
"""

from alembic import op
from sqlalchemy import text

revision: str = "0007"
down_revision: str = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    conn.execute(text(
        "ALTER TABLE employees "
        "ADD CONSTRAINT uq_employees_employee_number UNIQUE (employee_number)"
    ))


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(text(
        "ALTER TABLE employees "
        "DROP CONSTRAINT IF EXISTS uq_employees_employee_number"
    ))
