"""Add entra_oid column to employees table.

Stores the Microsoft Entra Object ID for each employee. Used to link
SSO logins to employee records. Nullable for existing employees who
have not yet logged in via SSO.

Revision ID: 0016
Revises: 0015
"""

from alembic import op
import sqlalchemy as sa

revision: str = "0016"
down_revision: str = "0015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "employees",
        sa.Column("entra_oid", sa.String(255), nullable=True),
    )
    op.create_unique_constraint("uq_employees_entra_oid", "employees", ["entra_oid"])
    op.create_index("idx_employees_entra_oid", "employees", ["entra_oid"])


def downgrade() -> None:
    op.drop_index("idx_employees_entra_oid", table_name="employees")
    op.drop_constraint("uq_employees_entra_oid", "employees", type_="unique")
    op.drop_column("employees", "entra_oid")
