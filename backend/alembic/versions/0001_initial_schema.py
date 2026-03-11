"""initial_schema

Revision ID: 0001
Revises:
Create Date: 2026-03-11 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. employees
    op.create_table(
        "employees",
        sa.Column("id", sa.String(255), nullable=False),
        sa.Column("first_name", sa.String(255), nullable=False),
        sa.Column("last_name", sa.String(255), nullable=False),
        sa.Column("work_email", sa.String(255), nullable=False),
        sa.Column("personal_email", sa.String(255), nullable=True),
        sa.Column("phone", sa.String(50), nullable=True),
        sa.Column("address", sa.Text, nullable=True),
        sa.Column("employee_code", sa.String(100), nullable=True),
        sa.Column("employee_number", sa.String(100), nullable=True),
        sa.Column("job_title", sa.String(255), nullable=True),
        sa.Column("department", sa.String(255), nullable=True),
        sa.Column("manager_id", sa.String(255), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("hire_date", sa.Date, nullable=True),
        sa.Column("hire_type", sa.String(50), nullable=True),
        sa.Column("work_mode", sa.String(50), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="active"),
        sa.Column("photo_path", sa.Text, nullable=True),
        sa.Column("location", sa.String(255), nullable=True),
        sa.Column("cost_annual", sa.Numeric, nullable=True),
        sa.Column("currency_code", sa.String(10), nullable=True, server_default="USD"),
        sa.Column("margin_pct", sa.Numeric, nullable=True, server_default="30"),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("work_email"),
        sa.UniqueConstraint("personal_email"),
        sa.UniqueConstraint("employee_code"),
    )

    # 2. skills_catalog
    op.create_table(
        "skills_catalog",
        sa.Column("id", sa.String(255), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("category", sa.String(255), nullable=True),
        sa.Column("created_by", sa.String(255), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )

    # 3. asset_categories
    op.create_table(
        "asset_categories",
        sa.Column("id", sa.String(255), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("code", sa.String(5), nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("sort_order", sa.Integer, nullable=True, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
        sa.UniqueConstraint("code"),
    )

    # 4. roles
    op.create_table(
        "roles",
        sa.Column("id", sa.String(255), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("is_system", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )

    # 5. permissions
    op.create_table(
        "permissions",
        sa.Column("id", sa.String(255), nullable=False),
        sa.Column("role_id", sa.String(255), sa.ForeignKey("roles.id"), nullable=False),
        sa.Column("module", sa.String(100), nullable=False),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("role_id", "module", "action", name="uq_permissions_role_module_action"),
    )

    # 6. role_assignments
    op.create_table(
        "role_assignments",
        sa.Column("employee_id", sa.String(255), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("role_id", sa.String(255), sa.ForeignKey("roles.id"), nullable=False),
        sa.Column("assigned_by", sa.String(255), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("employee_id", "role_id"),
    )

    # 7. config_dropdowns
    op.create_table(
        "config_dropdowns",
        sa.Column("id", sa.String(255), nullable=False),
        sa.Column("module", sa.String(100), nullable=False),
        sa.Column("category", sa.String(255), nullable=False),
        sa.Column("value", sa.String(255), nullable=False),
        sa.Column("sort_order", sa.Integer, nullable=True, server_default="0"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_by", sa.String(255), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("module", "category", "value", name="uq_config_dropdowns_module_category_value"),
    )

    # 8. system_settings
    op.create_table(
        "system_settings",
        sa.Column("key", sa.String(255), nullable=False),
        sa.Column("value", sa.Text, nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("updated_by", sa.String(255), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("key"),
    )

    # 9. owner_groups
    op.create_table(
        "owner_groups",
        sa.Column("id", sa.String(255), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("department", sa.String(255), nullable=True),
        sa.Column("manager_role_id", sa.String(255), sa.ForeignKey("roles.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )

    # 10. group_members
    op.create_table(
        "group_members",
        sa.Column("id", sa.String(255), nullable=False),
        sa.Column("group_id", sa.String(255), sa.ForeignKey("owner_groups.id", ondelete="CASCADE"), nullable=False),
        sa.Column("employee_id", sa.String(255), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("role", sa.String(50), nullable=True, server_default="member"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("group_id", "employee_id", name="uq_group_members_group_employee"),
    )

    # 11. employee_skills
    op.create_table(
        "employee_skills",
        sa.Column("employee_id", sa.String(255), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("skill_id", sa.String(255), sa.ForeignKey("skills_catalog.id"), nullable=False),
        sa.Column("level", sa.Integer, nullable=False),
        sa.Column("years", sa.Numeric, nullable=True, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("employee_id", "skill_id"),
    )

    # 12. employee_certifications
    op.create_table(
        "employee_certifications",
        sa.Column("id", sa.String(255), nullable=False),
        sa.Column("employee_id", sa.String(255), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("authority", sa.String(255), nullable=True),
        sa.Column("credential_id", sa.String(100), nullable=True),
        sa.Column("issued_on", sa.Date, nullable=True),
        sa.Column("expires_on", sa.Date, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    # 13. employee_rates
    op.create_table(
        "employee_rates",
        sa.Column("id", sa.String(255), nullable=False),
        sa.Column("employee_id", sa.String(255), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("base_rate_usd", sa.Numeric, nullable=False),
        sa.Column("effective_from", sa.Date, nullable=False),
        sa.Column("effective_to", sa.Date, nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    # 14. employee_emergency_contacts
    op.create_table(
        "employee_emergency_contacts",
        sa.Column("id", sa.String(255), nullable=False),
        sa.Column("employee_id", sa.String(255), sa.ForeignKey("employees.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("relationship", sa.String(100), nullable=False),
        sa.Column("phone", sa.String(50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    # 15. employee_attachments
    op.create_table(
        "employee_attachments",
        sa.Column("id", sa.String(255), nullable=False),
        sa.Column("employee_id", sa.String(255), sa.ForeignKey("employees.id", ondelete="CASCADE"), nullable=False),
        sa.Column("file_url", sa.Text, nullable=False),
        sa.Column("file_name", sa.String(255), nullable=False),
        sa.Column("label", sa.String(255), nullable=True),
        sa.Column("uploaded_by", sa.String(255), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # 16. projects
    op.create_table(
        "projects",
        sa.Column("id", sa.String(255), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("status", sa.String(50), nullable=True, server_default="pipeline"),
        sa.Column("category", sa.String(255), nullable=True),
        sa.Column("start_date", sa.Date, nullable=True),
        sa.Column("end_date", sa.Date, nullable=True),
        sa.Column("project_manager_id", sa.String(255), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("sales_manager_id", sa.String(255), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("internal_lead_id", sa.String(255), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("client", sa.String(255), nullable=True),
        sa.Column("discount_pct", sa.Numeric, nullable=True, server_default="0"),
        sa.Column("discount_reason", sa.Text, nullable=True),
        sa.Column("tag_color", sa.String(7), nullable=True),
        sa.Column("created_by", sa.String(255), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    # 17. employee_project_history
    op.create_table(
        "employee_project_history",
        sa.Column("id", sa.String(255), nullable=False),
        sa.Column("employee_id", sa.String(255), sa.ForeignKey("employees.id", ondelete="CASCADE"), nullable=False),
        sa.Column("project_id", sa.String(255), sa.ForeignKey("projects.id", ondelete="SET NULL"), nullable=True),
        sa.Column("project_name", sa.String(255), nullable=False),
        sa.Column("role", sa.String(255), nullable=True),
        sa.Column("start_date", sa.Date, nullable=True),
        sa.Column("end_date", sa.Date, nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_by", sa.String(255), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    # 18. offboarding_tasks
    op.create_table(
        "offboarding_tasks",
        sa.Column("id", sa.String(255), nullable=False),
        sa.Column("employee_id", sa.String(255), sa.ForeignKey("employees.id", ondelete="CASCADE"), nullable=False),
        sa.Column("task_type", sa.String(100), nullable=False),
        sa.Column("assigned_group", sa.String(50), nullable=False),
        sa.Column("assignee_id", sa.String(255), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="pending"),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_by", sa.String(255), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("sign_off_notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    # 19. intake_records
    op.create_table(
        "intake_records",
        sa.Column("id", sa.String(255), nullable=False),
        sa.Column("reference_number", sa.String(50), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="draft"),
        sa.Column("role_title", sa.String(255), nullable=False),
        sa.Column("department", sa.String(255), nullable=True),
        sa.Column("location", sa.String(255), nullable=True),
        sa.Column("work_model", sa.String(50), nullable=True),
        sa.Column("hire_type", sa.String(50), nullable=False),
        sa.Column("reason_for_hire", sa.Text, nullable=True),
        sa.Column("priority", sa.String(50), nullable=True),
        sa.Column("number_of_positions", sa.Integer, nullable=False, server_default="1"),
        sa.Column("experience_range_min", sa.Integer, nullable=True),
        sa.Column("experience_range_max", sa.Integer, nullable=True),
        sa.Column("salary_range_min", sa.Numeric, nullable=True),
        sa.Column("salary_range_max", sa.Numeric, nullable=True),
        sa.Column("salary_currency", sa.String(10), nullable=False, server_default="USD"),
        sa.Column("budget_approved", sa.Boolean, nullable=True),
        sa.Column("preferred_start_date", sa.Date, nullable=True),
        sa.Column("client_facing", sa.Boolean, nullable=True, server_default="false"),
        sa.Column("client_expectations", sa.Text, nullable=True),
        sa.Column("key_perks_benefits", sa.Text, nullable=True),
        sa.Column("comments_notes", sa.Text, nullable=True),
        sa.Column("hiring_manager_id", sa.String(255), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("ai_generated_jd", sa.Text, nullable=True),
        sa.Column("ai_jd_generated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("submitted_by", sa.String(255), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("reference_number"),
    )

    # 20. intake_skills
    op.create_table(
        "intake_skills",
        sa.Column("id", sa.String(255), nullable=False),
        sa.Column("intake_id", sa.String(255), sa.ForeignKey("intake_records.id", ondelete="CASCADE"), nullable=False),
        sa.Column("skill_id", sa.String(255), sa.ForeignKey("skills_catalog.id"), nullable=False),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("intake_id", "skill_id", "type", name="uq_intake_skills_intake_skill_type"),
    )

    # 21. intake_approvals
    op.create_table(
        "intake_approvals",
        sa.Column("id", sa.String(255), nullable=False),
        sa.Column("intake_id", sa.String(255), sa.ForeignKey("intake_records.id", ondelete="CASCADE"), nullable=False),
        sa.Column("approver_id", sa.String(255), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="pending"),
        sa.Column("comments", sa.Text, nullable=True),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    # 22. intake_audit
    op.create_table(
        "intake_audit",
        sa.Column("id", sa.String(255), nullable=False),
        sa.Column("intake_id", sa.String(255), sa.ForeignKey("intake_records.id", ondelete="CASCADE"), nullable=False),
        sa.Column("actor_id", sa.String(255), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("snapshot", JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # 23. onboarding_templates
    op.create_table(
        "onboarding_templates",
        sa.Column("id", sa.String(255), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("version", sa.Integer, nullable=False, server_default="1"),
        sa.Column("is_active", sa.Boolean, nullable=True, server_default="true"),
        sa.Column("settings", JSONB, nullable=True),
        sa.Column("location", sa.String(255), nullable=True),
        sa.Column("applicable_roles", ARRAY(sa.Text()), nullable=True),
        sa.Column("notification_config", JSONB, nullable=True),
        sa.Column("created_by", sa.String(255), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    # 24. onboarding_task_templates
    op.create_table(
        "onboarding_task_templates",
        sa.Column("id", sa.String(255), nullable=False),
        sa.Column("template_id", sa.String(255), sa.ForeignKey("onboarding_templates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("block", sa.String(50), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("owner_group_id", sa.String(255), sa.ForeignKey("owner_groups.id"), nullable=True),
        sa.Column("sla_hours", sa.Integer, nullable=True, server_default="72"),
        sa.Column("depends_on", sa.String(255), sa.ForeignKey("onboarding_task_templates.id"), nullable=True),
        sa.Column("dynamic_rules", JSONB, nullable=True),
        sa.Column("external_completion", sa.Boolean, nullable=True, server_default="false"),
        sa.Column("required_attachments", JSONB, nullable=True),
        sa.Column("order_index", sa.Integer, nullable=True, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    # 25. onboarding_task_template_dependencies
    op.create_table(
        "onboarding_task_template_dependencies",
        sa.Column("id", sa.String(255), nullable=False),
        sa.Column("task_template_id", sa.String(255), sa.ForeignKey("onboarding_task_templates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("depends_on_task_template_id", sa.String(255), sa.ForeignKey("onboarding_task_templates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("task_template_id", "depends_on_task_template_id", name="uq_onboarding_task_template_dep"),
    )

    # 26. onboarding_journeys
    op.create_table(
        "onboarding_journeys",
        sa.Column("id", sa.String(255), nullable=False),
        sa.Column("employee_id", sa.String(255), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("template_id", sa.String(255), sa.ForeignKey("onboarding_templates.id"), nullable=False),
        sa.Column("template_version", sa.Integer, nullable=False),
        sa.Column("status", sa.String(50), nullable=True, server_default="in_progress"),
        sa.Column("doj", sa.Date, nullable=True),
        sa.Column("geo", sa.String(100), nullable=True),
        sa.Column("location", sa.String(255), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("paused_reason", sa.Text, nullable=True),
        sa.Column("created_by", sa.String(255), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    # 27. onboarding_tasks
    op.create_table(
        "onboarding_tasks",
        sa.Column("id", sa.String(255), nullable=False),
        sa.Column("journey_id", sa.String(255), sa.ForeignKey("onboarding_journeys.id", ondelete="CASCADE"), nullable=False),
        sa.Column("template_task_id", sa.String(255), sa.ForeignKey("onboarding_task_templates.id"), nullable=True),
        sa.Column("block", sa.String(50), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("owner_group_id", sa.String(255), sa.ForeignKey("owner_groups.id"), nullable=True),
        sa.Column("assignee_id", sa.String(255), sa.ForeignKey("employees.id", ondelete="SET NULL"), nullable=True),
        sa.Column("status", sa.String(50), nullable=True, server_default="pending"),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notification_sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("sla_hours", sa.Integer, nullable=True, server_default="72"),
        sa.Column("depends_on", sa.String(255), sa.ForeignKey("onboarding_tasks.id"), nullable=True),
        sa.Column("external_completion", sa.Boolean, nullable=True, server_default="false"),
        sa.Column("required_attachments", JSONB, nullable=True),
        sa.Column("meta", JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    # 28. onboarding_task_dependencies
    op.create_table(
        "onboarding_task_dependencies",
        sa.Column("task_id", sa.String(255), sa.ForeignKey("onboarding_tasks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("depends_on_task_id", sa.String(255), sa.ForeignKey("onboarding_tasks.id", ondelete="CASCADE"), nullable=False),
        sa.PrimaryKeyConstraint("task_id", "depends_on_task_id"),
    )

    # 29. task_sla_events
    op.create_table(
        "task_sla_events",
        sa.Column("id", sa.String(255), nullable=False),
        sa.Column("task_id", sa.String(255), sa.ForeignKey("onboarding_tasks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("event", sa.String(100), nullable=False),
        sa.Column("meta", JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # 30. task_attachments
    op.create_table(
        "task_attachments",
        sa.Column("id", sa.String(255), nullable=False),
        sa.Column("task_id", sa.String(255), sa.ForeignKey("onboarding_tasks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("file_url", sa.Text, nullable=False),
        sa.Column("file_name", sa.String(255), nullable=True),
        sa.Column("kind", sa.String(100), nullable=True),
        sa.Column("uploaded_by", sa.String(255), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # 31. approvals
    op.create_table(
        "approvals",
        sa.Column("id", sa.String(255), nullable=False),
        sa.Column("resource_type", sa.String(100), nullable=False),
        sa.Column("resource_id", sa.String(255), nullable=False),
        sa.Column("task_id", sa.String(255), sa.ForeignKey("onboarding_tasks.id", ondelete="CASCADE"), nullable=True),
        sa.Column("approver_group_id", sa.String(255), sa.ForeignKey("owner_groups.id"), nullable=True),
        sa.Column("approver_user_id", sa.String(255), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("status", sa.String(50), nullable=True, server_default="requested"),
        sa.Column("comments", sa.Text, nullable=True),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    # 32. assets
    op.create_table(
        "assets",
        sa.Column("id", sa.String(255), nullable=False),
        sa.Column("asset_tag", sa.String(100), nullable=False),
        sa.Column("model", sa.String(255), nullable=False),
        sa.Column("manufacturer", sa.String(255), nullable=True),
        sa.Column("category_id", sa.String(255), sa.ForeignKey("asset_categories.id", onupdate="CASCADE"), nullable=True),
        sa.Column("serial_number", sa.String(255), nullable=True),
        sa.Column("location", sa.String(255), nullable=True),
        sa.Column("assigned_to", sa.String(255), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("status", sa.String(50), nullable=True, server_default="available"),
        sa.Column("condition", sa.String(50), nullable=True),
        sa.Column("procurement_date", sa.Date, nullable=True),
        sa.Column("warranty_start_date", sa.Date, nullable=True),
        sa.Column("warranty_end_date", sa.Date, nullable=True),
        sa.Column("warranty_type", sa.String(50), nullable=True),
        sa.Column("vendor", sa.String(255), nullable=True),
        sa.Column("invoice_verified_status", sa.String(50), nullable=True, server_default="unverified"),
        sa.Column("import_source", sa.String(255), nullable=True),
        sa.Column("import_date", sa.Date, nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("asset_tag"),
    )

    # 33. asset_attachments
    op.create_table(
        "asset_attachments",
        sa.Column("id", sa.String(255), nullable=False),
        sa.Column("asset_id", sa.String(255), sa.ForeignKey("assets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("file_url", sa.Text, nullable=False),
        sa.Column("file_name", sa.String(255), nullable=False),
        sa.Column("label", sa.String(255), nullable=True),
        sa.Column("uploaded_by", sa.String(255), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # 34. asset_assignment_history
    op.create_table(
        "asset_assignment_history",
        sa.Column("id", sa.String(255), nullable=False),
        sa.Column("asset_id", sa.String(255), sa.ForeignKey("assets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("assigned_to", sa.String(255), sa.ForeignKey("employees.id", ondelete="SET NULL"), nullable=True),
        sa.Column("assigned_by", sa.String(255), sa.ForeignKey("employees.id", ondelete="SET NULL"), nullable=True),
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("returned_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    # 35. project_members
    op.create_table(
        "project_members",
        sa.Column("project_id", sa.String(255), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("employee_id", sa.String(255), sa.ForeignKey("employees.id", ondelete="CASCADE"), nullable=False),
        sa.Column("bill_rate_usd", sa.Numeric, nullable=False),
        sa.Column("role", sa.String(255), nullable=True),
        sa.Column("member_discount_pct", sa.Numeric, nullable=True, server_default="0"),
        sa.Column("effective_from", sa.Date, nullable=True),
        sa.Column("effective_to", sa.Date, nullable=True),
        sa.Column("status", sa.String(50), nullable=True, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("project_id", "employee_id"),
    )

    # 36. timesheets
    op.create_table(
        "timesheets",
        sa.Column("id", sa.String(255), nullable=False),
        sa.Column("project_id", sa.String(255), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=True),
        sa.Column("employee_id", sa.String(255), sa.ForeignKey("employees.id", ondelete="CASCADE"), nullable=True),
        sa.Column("work_date", sa.Date, nullable=False),
        sa.Column("hours", sa.Numeric, nullable=False),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="submitted"),
        sa.Column("is_billable", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("week_start", sa.Date, nullable=True),
        sa.Column("approved_by", sa.String(255), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rejection_reason", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    # 37. fx_rates
    op.create_table(
        "fx_rates",
        sa.Column("code", sa.String(10), nullable=False),
        sa.Column("rate_to_usd", sa.Numeric, nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("code"),
    )

    # 38. holidays
    op.create_table(
        "holidays",
        sa.Column("id", sa.String(255), nullable=False),
        sa.Column("region", sa.String(100), nullable=False),
        sa.Column("holiday_date", sa.Date, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # 39. leaves
    op.create_table(
        "leaves",
        sa.Column("id", sa.String(255), nullable=False),
        sa.Column("employee_id", sa.String(255), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("start_date", sa.Date, nullable=False),
        sa.Column("end_date", sa.Date, nullable=False),
        sa.Column("type", sa.String(100), nullable=False),
        sa.Column("is_approved", sa.Boolean, nullable=True, server_default="false"),
        sa.Column("status", sa.String(50), nullable=True, server_default="pending"),
        sa.Column("approved_by", sa.String(255), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    # 40. ats_candidates
    op.create_table(
        "ats_candidates",
        sa.Column("id", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(50), nullable=True),
        sa.Column("location", sa.String(255), nullable=True),
        sa.Column("source", sa.String(255), nullable=True),
        sa.Column("current_company", sa.String(255), nullable=True),
        sa.Column("current_title", sa.String(255), nullable=True),
        sa.Column("resume_url", sa.Text, nullable=True),
        sa.Column("linkedin_profile", sa.Text, nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("resume_score", sa.Numeric(5, 2), nullable=True),
        sa.Column("resume_analysis", JSONB, nullable=True),
        sa.Column("ai_parsed_skills", JSONB, nullable=True),
        sa.Column("last_scored_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ai_summary", sa.Text, nullable=True),
        sa.Column("ai_summary_generated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("current_step", sa.String(100), nullable=True, server_default="sourced"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )

    # 41. requisitions
    op.create_table(
        "requisitions",
        sa.Column("id", sa.String(255), nullable=False),
        sa.Column("intake_id", sa.String(255), sa.ForeignKey("intake_records.id"), nullable=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("dept", sa.String(255), nullable=True),
        sa.Column("location", sa.String(255), nullable=True),
        sa.Column("employment_type", sa.String(50), nullable=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("min_experience", sa.Integer, nullable=True, server_default="0"),
        sa.Column("max_experience", sa.Integer, nullable=True),
        sa.Column("priority", sa.String(50), nullable=True),
        sa.Column("budget_min", sa.Numeric, nullable=True),
        sa.Column("budget_max", sa.Numeric, nullable=True),
        sa.Column("posting_start_date", sa.Date, nullable=True),
        sa.Column("posting_end_date", sa.Date, nullable=True),
        sa.Column("status", sa.String(50), nullable=True, server_default="draft"),
        sa.Column("hiring_manager_id", sa.String(255), sa.ForeignKey("employees.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_by", sa.String(255), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("linkedin_job_id", sa.String(255), nullable=True),
        sa.Column("linkedin_posted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    # 42. requisition_skills
    op.create_table(
        "requisition_skills",
        sa.Column("requisition_id", sa.String(255), sa.ForeignKey("requisitions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("skill_id", sa.String(255), sa.ForeignKey("skills_catalog.id"), nullable=False),
        sa.Column("type", sa.String(50), nullable=False),
        sa.PrimaryKeyConstraint("requisition_id", "skill_id"),
    )

    # 43. applications
    op.create_table(
        "applications",
        sa.Column("id", sa.String(255), nullable=False),
        sa.Column("candidate_id", sa.String(255), sa.ForeignKey("ats_candidates.id", ondelete="CASCADE"), nullable=True),
        sa.Column("requisition_id", sa.String(255), sa.ForeignKey("requisitions.id", ondelete="CASCADE"), nullable=True),
        sa.Column("stage", sa.String(50), nullable=True, server_default="sourced"),
        sa.Column("status", sa.String(50), nullable=True, server_default="active"),
        sa.Column("owner_id", sa.String(255), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "requisition_id", name="uq_applications_candidate_requisition"),
    )

    # 44. interviews
    op.create_table(
        "interviews",
        sa.Column("id", sa.String(255), nullable=False),
        sa.Column("application_id", sa.String(255), sa.ForeignKey("applications.id", ondelete="CASCADE"), nullable=True),
        sa.Column("requisition_id", sa.String(255), sa.ForeignKey("requisitions.id"), nullable=True),
        sa.Column("interviewer_id", sa.String(255), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("candidate_id", sa.String(255), sa.ForeignKey("ats_candidates.id", ondelete="CASCADE"), nullable=True),
        sa.Column("type", sa.String(50), nullable=True),
        sa.Column("scheduled_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("scheduled_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("meeting_link", sa.Text, nullable=True),
        sa.Column("status", sa.String(50), nullable=True, server_default="scheduled"),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_by", sa.String(255), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    # 45. interview_assignments
    op.create_table(
        "interview_assignments",
        sa.Column("id", sa.String(255), nullable=False),
        sa.Column("interview_id", sa.String(255), sa.ForeignKey("interviews.id", ondelete="CASCADE"), nullable=True),
        sa.Column("interviewer_id", sa.String(255), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("candidate_id", sa.String(255), sa.ForeignKey("ats_candidates.id", ondelete="CASCADE"), nullable=True),
        sa.Column("role", sa.String(50), nullable=True, server_default="primary"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("interview_id", "interviewer_id", name="uq_interview_assignments_interview_interviewer"),
    )

    # 46. interview_feedback
    op.create_table(
        "interview_feedback",
        sa.Column("id", sa.String(255), nullable=False),
        sa.Column("interview_id", sa.String(255), sa.ForeignKey("interviews.id", ondelete="CASCADE"), nullable=True),
        sa.Column("interviewer_id", sa.String(255), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("ratings", JSONB, nullable=True),
        sa.Column("summary", sa.Text, nullable=True),
        sa.Column("recommendation", sa.String(50), nullable=True),
        sa.Column("is_final", sa.Boolean, nullable=True, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    # 47. candidate_activities
    op.create_table(
        "candidate_activities",
        sa.Column("id", sa.String(255), nullable=False),
        sa.Column("candidate_id", sa.String(255), sa.ForeignKey("ats_candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("actor_id", sa.String(255), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("activity_type", sa.String(100), nullable=False),
        sa.Column("activity_description", sa.Text, nullable=False),
        sa.Column("metadata", JSONB, nullable=True),
        sa.Column("seen_by", ARRAY(sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    # 48. audit_events
    op.create_table(
        "audit_events",
        sa.Column("id", sa.String(255), nullable=False),
        sa.Column("actor_id", sa.String(255), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("module", sa.String(100), nullable=False),
        sa.Column("entity", sa.String(100), nullable=False),
        sa.Column("entity_id", sa.String(255), nullable=True),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("severity", sa.String(20), nullable=True, server_default="info"),
        sa.Column("old_value", JSONB, nullable=True),
        sa.Column("new_value", JSONB, nullable=True),
        sa.Column("metadata", JSONB, nullable=True),
        sa.Column("ip_address", sa.String(50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # ── Indexes ──────────────────────────────────────────────────────────────

    # employees
    op.create_index("idx_employees_manager_id", "employees", ["manager_id"])
    op.create_index("idx_employees_status", "employees", ["status"])

    # skills_catalog
    op.create_index("idx_skills_catalog_created_by", "skills_catalog", ["created_by"])

    # permissions
    op.create_index("idx_permissions_role_id", "permissions", ["role_id"])

    # role_assignments
    op.create_index("idx_role_assignments_employee_id", "role_assignments", ["employee_id"])
    op.create_index("idx_role_assignments_role_id", "role_assignments", ["role_id"])
    op.create_index("idx_role_assignments_assigned_by", "role_assignments", ["assigned_by"])

    # config_dropdowns
    op.create_index("idx_config_dropdowns_created_by", "config_dropdowns", ["created_by"])

    # system_settings
    op.create_index("idx_system_settings_updated_by", "system_settings", ["updated_by"])

    # owner_groups
    op.create_index("idx_owner_groups_manager_role_id", "owner_groups", ["manager_role_id"])

    # group_members
    op.create_index("idx_group_members_group_id", "group_members", ["group_id"])
    op.create_index("idx_group_members_employee_id", "group_members", ["employee_id"])

    # employee_skills
    op.create_index("idx_employee_skills_employee_id", "employee_skills", ["employee_id"])
    op.create_index("idx_employee_skills_skill_id", "employee_skills", ["skill_id"])

    # employee_certifications
    op.create_index("idx_employee_certifications_employee_id", "employee_certifications", ["employee_id"])

    # employee_rates
    op.create_index("idx_employee_rates_employee_id", "employee_rates", ["employee_id"])

    # employee_emergency_contacts
    op.create_index("idx_employee_emergency_contacts_employee_id", "employee_emergency_contacts", ["employee_id"])

    # employee_attachments
    op.create_index("idx_employee_attachments_employee_id", "employee_attachments", ["employee_id"])
    op.create_index("idx_employee_attachments_uploaded_by", "employee_attachments", ["uploaded_by"])

    # projects
    op.create_index("idx_projects_project_manager_id", "projects", ["project_manager_id"])
    op.create_index("idx_projects_sales_manager_id", "projects", ["sales_manager_id"])
    op.create_index("idx_projects_internal_lead_id", "projects", ["internal_lead_id"])
    op.create_index("idx_projects_created_by", "projects", ["created_by"])
    op.create_index("idx_projects_status", "projects", ["status"])

    # employee_project_history
    op.create_index("idx_employee_project_history_employee_id", "employee_project_history", ["employee_id"])
    op.create_index("idx_employee_project_history_project_id", "employee_project_history", ["project_id"])
    op.create_index("idx_employee_project_history_created_by", "employee_project_history", ["created_by"])

    # offboarding_tasks
    op.create_index("idx_offboarding_tasks_employee_id", "offboarding_tasks", ["employee_id"])
    op.create_index("idx_offboarding_tasks_assignee_id", "offboarding_tasks", ["assignee_id"])
    op.create_index("idx_offboarding_tasks_completed_by", "offboarding_tasks", ["completed_by"])

    # intake_records
    op.create_index("idx_intake_records_hiring_manager_id", "intake_records", ["hiring_manager_id"])
    op.create_index("idx_intake_records_submitted_by", "intake_records", ["submitted_by"])

    # intake_skills
    op.create_index("idx_intake_skills_intake_id", "intake_skills", ["intake_id"])
    op.create_index("idx_intake_skills_skill_id", "intake_skills", ["skill_id"])

    # intake_approvals
    op.create_index("idx_intake_approvals_intake_id", "intake_approvals", ["intake_id"])
    op.create_index("idx_intake_approvals_approver_id", "intake_approvals", ["approver_id"])

    # intake_audit
    op.create_index("idx_intake_audit_intake_id", "intake_audit", ["intake_id"])
    op.create_index("idx_intake_audit_actor_id", "intake_audit", ["actor_id"])

    # onboarding_templates
    op.create_index("idx_onboarding_templates_created_by", "onboarding_templates", ["created_by"])

    # onboarding_task_templates
    op.create_index("idx_onboarding_task_templates_template_id", "onboarding_task_templates", ["template_id"])
    op.create_index("idx_onboarding_task_templates_owner_group_id", "onboarding_task_templates", ["owner_group_id"])
    op.create_index("idx_onboarding_task_templates_depends_on", "onboarding_task_templates", ["depends_on"])

    # onboarding_task_template_dependencies
    op.create_index("idx_onboarding_task_template_dep_task_template_id", "onboarding_task_template_dependencies", ["task_template_id"])
    op.create_index("idx_onboarding_task_template_dep_depends_on", "onboarding_task_template_dependencies", ["depends_on_task_template_id"])

    # onboarding_journeys
    op.create_index("idx_onboarding_journeys_employee_id", "onboarding_journeys", ["employee_id"])
    op.create_index("idx_onboarding_journeys_template_id", "onboarding_journeys", ["template_id"])
    op.create_index("idx_onboarding_journeys_created_by", "onboarding_journeys", ["created_by"])

    # onboarding_tasks
    op.create_index("idx_onboarding_tasks_journey_id", "onboarding_tasks", ["journey_id"])
    op.create_index("idx_onboarding_tasks_template_task_id", "onboarding_tasks", ["template_task_id"])
    op.create_index("idx_onboarding_tasks_owner_group_id", "onboarding_tasks", ["owner_group_id"])
    op.create_index("idx_onboarding_tasks_assignee_id", "onboarding_tasks", ["assignee_id"])
    op.create_index("idx_onboarding_tasks_depends_on", "onboarding_tasks", ["depends_on"])

    # onboarding_task_dependencies
    op.create_index("idx_onboarding_task_dep_task_id", "onboarding_task_dependencies", ["task_id"])
    op.create_index("idx_onboarding_task_dep_depends_on_task_id", "onboarding_task_dependencies", ["depends_on_task_id"])

    # task_sla_events
    op.create_index("idx_task_sla_events_task_id", "task_sla_events", ["task_id"])

    # task_attachments
    op.create_index("idx_task_attachments_task_id", "task_attachments", ["task_id"])
    op.create_index("idx_task_attachments_uploaded_by", "task_attachments", ["uploaded_by"])

    # approvals
    op.create_index("idx_approvals_task_id", "approvals", ["task_id"])
    op.create_index("idx_approvals_approver_group_id", "approvals", ["approver_group_id"])
    op.create_index("idx_approvals_approver_user_id", "approvals", ["approver_user_id"])

    # assets
    op.create_index("idx_assets_category_id", "assets", ["category_id"])
    op.create_index("idx_assets_assigned_to", "assets", ["assigned_to"])
    op.create_index("idx_assets_status", "assets", ["status"])

    # asset_attachments
    op.create_index("idx_asset_attachments_asset_id", "asset_attachments", ["asset_id"])
    op.create_index("idx_asset_attachments_uploaded_by", "asset_attachments", ["uploaded_by"])

    # asset_assignment_history
    op.create_index("idx_asset_assignment_history_asset_id", "asset_assignment_history", ["asset_id"])
    op.create_index("idx_asset_assignment_history_assigned_to", "asset_assignment_history", ["assigned_to"])
    op.create_index("idx_asset_assignment_history_assigned_by", "asset_assignment_history", ["assigned_by"])

    # project_members
    op.create_index("idx_project_members_project_id", "project_members", ["project_id"])
    op.create_index("idx_project_members_employee_id", "project_members", ["employee_id"])

    # timesheets
    op.create_index("idx_timesheets_project_id", "timesheets", ["project_id"])
    op.create_index("idx_timesheets_employee_id", "timesheets", ["employee_id"])
    op.create_index("idx_timesheets_approved_by", "timesheets", ["approved_by"])
    op.create_index("idx_timesheets_status", "timesheets", ["status"])

    # holidays
    op.create_index("idx_holidays_region_holiday_date", "holidays", ["region", "holiday_date"])

    # leaves
    op.create_index("idx_leaves_employee_id", "leaves", ["employee_id"])
    op.create_index("idx_leaves_approved_by", "leaves", ["approved_by"])

    # requisitions
    op.create_index("idx_requisitions_intake_id", "requisitions", ["intake_id"])
    op.create_index("idx_requisitions_hiring_manager_id", "requisitions", ["hiring_manager_id"])
    op.create_index("idx_requisitions_created_by", "requisitions", ["created_by"])

    # requisition_skills
    op.create_index("idx_requisition_skills_requisition_id", "requisition_skills", ["requisition_id"])
    op.create_index("idx_requisition_skills_skill_id", "requisition_skills", ["skill_id"])

    # applications
    op.create_index("idx_applications_candidate_id", "applications", ["candidate_id"])
    op.create_index("idx_applications_requisition_id", "applications", ["requisition_id"])
    op.create_index("idx_applications_owner_id", "applications", ["owner_id"])

    # interviews
    op.create_index("idx_interviews_application_id", "interviews", ["application_id"])
    op.create_index("idx_interviews_requisition_id", "interviews", ["requisition_id"])
    op.create_index("idx_interviews_interviewer_id", "interviews", ["interviewer_id"])
    op.create_index("idx_interviews_candidate_id", "interviews", ["candidate_id"])
    op.create_index("idx_interviews_created_by", "interviews", ["created_by"])

    # interview_assignments
    op.create_index("idx_interview_assignments_interview_id", "interview_assignments", ["interview_id"])
    op.create_index("idx_interview_assignments_interviewer_id", "interview_assignments", ["interviewer_id"])
    op.create_index("idx_interview_assignments_candidate_id", "interview_assignments", ["candidate_id"])

    # interview_feedback
    op.create_index("idx_interview_feedback_interview_id", "interview_feedback", ["interview_id"])
    op.create_index("idx_interview_feedback_interviewer_id", "interview_feedback", ["interviewer_id"])

    # candidate_activities
    op.create_index("idx_candidate_activities_candidate_id", "candidate_activities", ["candidate_id"])
    op.create_index("idx_candidate_activities_actor_id", "candidate_activities", ["actor_id"])

    # audit_events
    op.create_index("idx_audit_events_actor_id", "audit_events", ["actor_id"])
    op.create_index("idx_audit_events_module_entity", "audit_events", ["module", "entity"])
    op.create_index("idx_audit_events_entity_id", "audit_events", ["entity_id"])


def downgrade() -> None:
    # Drop indexes first

    # audit_events
    op.drop_index("idx_audit_events_entity_id", table_name="audit_events")
    op.drop_index("idx_audit_events_module_entity", table_name="audit_events")
    op.drop_index("idx_audit_events_actor_id", table_name="audit_events")

    # candidate_activities
    op.drop_index("idx_candidate_activities_actor_id", table_name="candidate_activities")
    op.drop_index("idx_candidate_activities_candidate_id", table_name="candidate_activities")

    # interview_feedback
    op.drop_index("idx_interview_feedback_interviewer_id", table_name="interview_feedback")
    op.drop_index("idx_interview_feedback_interview_id", table_name="interview_feedback")

    # interview_assignments
    op.drop_index("idx_interview_assignments_candidate_id", table_name="interview_assignments")
    op.drop_index("idx_interview_assignments_interviewer_id", table_name="interview_assignments")
    op.drop_index("idx_interview_assignments_interview_id", table_name="interview_assignments")

    # interviews
    op.drop_index("idx_interviews_created_by", table_name="interviews")
    op.drop_index("idx_interviews_candidate_id", table_name="interviews")
    op.drop_index("idx_interviews_interviewer_id", table_name="interviews")
    op.drop_index("idx_interviews_requisition_id", table_name="interviews")
    op.drop_index("idx_interviews_application_id", table_name="interviews")

    # applications
    op.drop_index("idx_applications_owner_id", table_name="applications")
    op.drop_index("idx_applications_requisition_id", table_name="applications")
    op.drop_index("idx_applications_candidate_id", table_name="applications")

    # requisition_skills
    op.drop_index("idx_requisition_skills_skill_id", table_name="requisition_skills")
    op.drop_index("idx_requisition_skills_requisition_id", table_name="requisition_skills")

    # requisitions
    op.drop_index("idx_requisitions_created_by", table_name="requisitions")
    op.drop_index("idx_requisitions_hiring_manager_id", table_name="requisitions")
    op.drop_index("idx_requisitions_intake_id", table_name="requisitions")

    # leaves
    op.drop_index("idx_leaves_approved_by", table_name="leaves")
    op.drop_index("idx_leaves_employee_id", table_name="leaves")

    # holidays
    op.drop_index("idx_holidays_region_holiday_date", table_name="holidays")

    # timesheets
    op.drop_index("idx_timesheets_status", table_name="timesheets")
    op.drop_index("idx_timesheets_approved_by", table_name="timesheets")
    op.drop_index("idx_timesheets_employee_id", table_name="timesheets")
    op.drop_index("idx_timesheets_project_id", table_name="timesheets")

    # project_members
    op.drop_index("idx_project_members_employee_id", table_name="project_members")
    op.drop_index("idx_project_members_project_id", table_name="project_members")

    # asset_assignment_history
    op.drop_index("idx_asset_assignment_history_assigned_by", table_name="asset_assignment_history")
    op.drop_index("idx_asset_assignment_history_assigned_to", table_name="asset_assignment_history")
    op.drop_index("idx_asset_assignment_history_asset_id", table_name="asset_assignment_history")

    # asset_attachments
    op.drop_index("idx_asset_attachments_uploaded_by", table_name="asset_attachments")
    op.drop_index("idx_asset_attachments_asset_id", table_name="asset_attachments")

    # assets
    op.drop_index("idx_assets_status", table_name="assets")
    op.drop_index("idx_assets_assigned_to", table_name="assets")
    op.drop_index("idx_assets_category_id", table_name="assets")

    # approvals
    op.drop_index("idx_approvals_approver_user_id", table_name="approvals")
    op.drop_index("idx_approvals_approver_group_id", table_name="approvals")
    op.drop_index("idx_approvals_task_id", table_name="approvals")

    # task_attachments
    op.drop_index("idx_task_attachments_uploaded_by", table_name="task_attachments")
    op.drop_index("idx_task_attachments_task_id", table_name="task_attachments")

    # task_sla_events
    op.drop_index("idx_task_sla_events_task_id", table_name="task_sla_events")

    # onboarding_task_dependencies
    op.drop_index("idx_onboarding_task_dep_depends_on_task_id", table_name="onboarding_task_dependencies")
    op.drop_index("idx_onboarding_task_dep_task_id", table_name="onboarding_task_dependencies")

    # onboarding_tasks
    op.drop_index("idx_onboarding_tasks_depends_on", table_name="onboarding_tasks")
    op.drop_index("idx_onboarding_tasks_assignee_id", table_name="onboarding_tasks")
    op.drop_index("idx_onboarding_tasks_owner_group_id", table_name="onboarding_tasks")
    op.drop_index("idx_onboarding_tasks_template_task_id", table_name="onboarding_tasks")
    op.drop_index("idx_onboarding_tasks_journey_id", table_name="onboarding_tasks")

    # onboarding_journeys
    op.drop_index("idx_onboarding_journeys_created_by", table_name="onboarding_journeys")
    op.drop_index("idx_onboarding_journeys_template_id", table_name="onboarding_journeys")
    op.drop_index("idx_onboarding_journeys_employee_id", table_name="onboarding_journeys")

    # onboarding_task_template_dependencies
    op.drop_index("idx_onboarding_task_template_dep_depends_on", table_name="onboarding_task_template_dependencies")
    op.drop_index("idx_onboarding_task_template_dep_task_template_id", table_name="onboarding_task_template_dependencies")

    # onboarding_task_templates
    op.drop_index("idx_onboarding_task_templates_depends_on", table_name="onboarding_task_templates")
    op.drop_index("idx_onboarding_task_templates_owner_group_id", table_name="onboarding_task_templates")
    op.drop_index("idx_onboarding_task_templates_template_id", table_name="onboarding_task_templates")

    # onboarding_templates
    op.drop_index("idx_onboarding_templates_created_by", table_name="onboarding_templates")

    # intake_audit
    op.drop_index("idx_intake_audit_actor_id", table_name="intake_audit")
    op.drop_index("idx_intake_audit_intake_id", table_name="intake_audit")

    # intake_approvals
    op.drop_index("idx_intake_approvals_approver_id", table_name="intake_approvals")
    op.drop_index("idx_intake_approvals_intake_id", table_name="intake_approvals")

    # intake_skills
    op.drop_index("idx_intake_skills_skill_id", table_name="intake_skills")
    op.drop_index("idx_intake_skills_intake_id", table_name="intake_skills")

    # intake_records
    op.drop_index("idx_intake_records_submitted_by", table_name="intake_records")
    op.drop_index("idx_intake_records_hiring_manager_id", table_name="intake_records")

    # offboarding_tasks
    op.drop_index("idx_offboarding_tasks_completed_by", table_name="offboarding_tasks")
    op.drop_index("idx_offboarding_tasks_assignee_id", table_name="offboarding_tasks")
    op.drop_index("idx_offboarding_tasks_employee_id", table_name="offboarding_tasks")

    # employee_project_history
    op.drop_index("idx_employee_project_history_created_by", table_name="employee_project_history")
    op.drop_index("idx_employee_project_history_project_id", table_name="employee_project_history")
    op.drop_index("idx_employee_project_history_employee_id", table_name="employee_project_history")

    # projects
    op.drop_index("idx_projects_status", table_name="projects")
    op.drop_index("idx_projects_created_by", table_name="projects")
    op.drop_index("idx_projects_internal_lead_id", table_name="projects")
    op.drop_index("idx_projects_sales_manager_id", table_name="projects")
    op.drop_index("idx_projects_project_manager_id", table_name="projects")

    # employee_attachments
    op.drop_index("idx_employee_attachments_uploaded_by", table_name="employee_attachments")
    op.drop_index("idx_employee_attachments_employee_id", table_name="employee_attachments")

    # employee_emergency_contacts
    op.drop_index("idx_employee_emergency_contacts_employee_id", table_name="employee_emergency_contacts")

    # employee_rates
    op.drop_index("idx_employee_rates_employee_id", table_name="employee_rates")

    # employee_certifications
    op.drop_index("idx_employee_certifications_employee_id", table_name="employee_certifications")

    # employee_skills
    op.drop_index("idx_employee_skills_skill_id", table_name="employee_skills")
    op.drop_index("idx_employee_skills_employee_id", table_name="employee_skills")

    # group_members
    op.drop_index("idx_group_members_employee_id", table_name="group_members")
    op.drop_index("idx_group_members_group_id", table_name="group_members")

    # owner_groups
    op.drop_index("idx_owner_groups_manager_role_id", table_name="owner_groups")

    # system_settings
    op.drop_index("idx_system_settings_updated_by", table_name="system_settings")

    # config_dropdowns
    op.drop_index("idx_config_dropdowns_created_by", table_name="config_dropdowns")

    # role_assignments
    op.drop_index("idx_role_assignments_assigned_by", table_name="role_assignments")
    op.drop_index("idx_role_assignments_role_id", table_name="role_assignments")
    op.drop_index("idx_role_assignments_employee_id", table_name="role_assignments")

    # permissions
    op.drop_index("idx_permissions_role_id", table_name="permissions")

    # skills_catalog
    op.drop_index("idx_skills_catalog_created_by", table_name="skills_catalog")

    # employees
    op.drop_index("idx_employees_status", table_name="employees")
    op.drop_index("idx_employees_manager_id", table_name="employees")

    # Drop tables in reverse order (48 → 1)
    op.drop_table("audit_events")
    op.drop_table("candidate_activities")
    op.drop_table("interview_feedback")
    op.drop_table("interview_assignments")
    op.drop_table("interviews")
    op.drop_table("applications")
    op.drop_table("requisition_skills")
    op.drop_table("requisitions")
    op.drop_table("ats_candidates")
    op.drop_table("leaves")
    op.drop_table("holidays")
    op.drop_table("fx_rates")
    op.drop_table("timesheets")
    op.drop_table("project_members")
    op.drop_table("asset_assignment_history")
    op.drop_table("asset_attachments")
    op.drop_table("assets")
    op.drop_table("approvals")
    op.drop_table("task_attachments")
    op.drop_table("task_sla_events")
    op.drop_table("onboarding_task_dependencies")
    op.drop_table("onboarding_tasks")
    op.drop_table("onboarding_journeys")
    op.drop_table("onboarding_task_template_dependencies")
    op.drop_table("onboarding_task_templates")
    op.drop_table("onboarding_templates")
    op.drop_table("intake_audit")
    op.drop_table("intake_approvals")
    op.drop_table("intake_skills")
    op.drop_table("intake_records")
    op.drop_table("offboarding_tasks")
    op.drop_table("employee_project_history")
    op.drop_table("projects")
    op.drop_table("employee_attachments")
    op.drop_table("employee_emergency_contacts")
    op.drop_table("employee_rates")
    op.drop_table("employee_certifications")
    op.drop_table("employee_skills")
    op.drop_table("group_members")
    op.drop_table("owner_groups")
    op.drop_table("system_settings")
    op.drop_table("config_dropdowns")
    op.drop_table("role_assignments")
    op.drop_table("permissions")
    op.drop_table("roles")
    op.drop_table("asset_categories")
    op.drop_table("skills_catalog")
    op.drop_table("employees")
