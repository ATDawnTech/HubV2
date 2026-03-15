from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Text, DateTime, Boolean,
    ForeignKey, UniqueConstraint, Index
)
from ..base import Base


class SkillsCatalog(Base):
    __tablename__ = "skills_catalog"

    id = Column(String(255), primary_key=True)
    name = Column(String(255), nullable=False, unique=True)
    category = Column(String(255), nullable=True)
    search_tokens = Column(Text, nullable=False, default="")
    created_by = Column(String(255), ForeignKey("employees.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True, default=None)

    __table_args__ = (
        Index("idx_skills_catalog_created_by", "created_by"),
    )


class AssetCategory(Base):
    __tablename__ = "asset_categories"

    id = Column(String(255), primary_key=True)
    name = Column(String(255), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    code = Column(String(5), nullable=True, unique=True)
    is_active = Column(Boolean, nullable=False, default=True)
    sort_order = Column(Integer, nullable=True, default=0)
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True, default=None)


class Role(Base):
    __tablename__ = "roles"

    id = Column(String(255), primary_key=True)
    name = Column(String(255), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    is_system = Column(Boolean, nullable=False, default=False)
    # JSON array of department values from config_dropdowns (auto-assign on dept match)
    auto_assign_departments = Column(Text, nullable=True)
    dashboard_config = Column(Text, nullable=True)
    # JSON array of {module, action} pairs granted additively to manager-level holders
    manager_permissions = Column(Text, nullable=True)
    # Hierarchy position: lower = higher authority; system roles are always 0
    sort_order = Column(Integer, nullable=False, default=9999)
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True, default=None)


class Permission(Base):
    __tablename__ = "permissions"

    id = Column(String(255), primary_key=True)
    role_id = Column(String(255), ForeignKey("roles.id"), nullable=False)
    module = Column(String(100), nullable=False)
    action = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("role_id", "module", "action", name="uq_permissions_role_module_action"),
        Index("idx_permissions_role_id", "role_id"),
    )


class RoleAssignment(Base):
    __tablename__ = "role_assignments"

    employee_id = Column(String(255), ForeignKey("employees.id"), nullable=False, primary_key=True)
    role_id = Column(String(255), ForeignKey("roles.id"), nullable=False, primary_key=True)
    assigned_by = Column(String(255), ForeignKey("employees.id"), nullable=True)
    assigned_at = Column(DateTime(timezone=True), nullable=False)
    # Manager context: set per-assignment rather than per role definition
    is_manager = Column(Boolean, nullable=False, default=False)
    # JSON array of extra {module, action} pairs active only when is_manager=True
    manager_permissions = Column(Text, nullable=True)

    __table_args__ = (
        Index("idx_role_assignments_employee_id", "employee_id"),
        Index("idx_role_assignments_role_id", "role_id"),
        Index("idx_role_assignments_assigned_by", "assigned_by"),
    )


class ConfigDropdown(Base):
    __tablename__ = "config_dropdowns"

    id = Column(String(255), primary_key=True)
    module = Column(String(100), nullable=False)
    category = Column(String(255), nullable=False)
    value = Column(String(255), nullable=False)
    sort_order = Column(Integer, nullable=True, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    created_by = Column(String(255), ForeignKey("employees.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True, default=None)

    __table_args__ = (
        UniqueConstraint("module", "category", "value", name="uq_config_dropdowns_module_category_value"),
        Index("idx_config_dropdowns_created_by", "created_by"),
    )


class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String(255), primary_key=True)
    value = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    updated_by = Column(String(255), ForeignKey("employees.id"), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_system_settings_updated_by", "updated_by"),
    )


class OwnerGroup(Base):
    __tablename__ = "owner_groups"

    id = Column(String(255), primary_key=True)
    name = Column(String(255), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    department = Column(String(255), nullable=True)
    manager_role_id = Column(String(255), ForeignKey("roles.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True, default=None)

    __table_args__ = (
        Index("idx_owner_groups_manager_role_id", "manager_role_id"),
    )


class RoleGrantPermission(Base):
    """Junction table: which roles a granting_role can assign to employees."""

    __tablename__ = "role_grant_permissions"

    granting_role_id = Column(String(255), ForeignKey("roles.id"), primary_key=True)
    assignable_role_id = Column(String(255), ForeignKey("roles.id"), primary_key=True)
    created_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_role_grant_permissions_granting", "granting_role_id"),
        Index("idx_role_grant_permissions_assignable", "assignable_role_id"),
    )


class GroupMember(Base):
    __tablename__ = "group_members"

    id = Column(String(255), primary_key=True)
    group_id = Column(
        String(255), ForeignKey("owner_groups.id", ondelete="CASCADE"), nullable=False
    )
    employee_id = Column(String(255), ForeignKey("employees.id"), nullable=False)
    role = Column(String(50), nullable=True, default="member")
    created_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("group_id", "employee_id", name="uq_group_members_group_employee"),
        Index("idx_group_members_group_id", "group_id"),
        Index("idx_group_members_employee_id", "employee_id"),
    )


class NotificationSettings(Base):
    """Singleton row (id = 'default') storing global notification configuration."""

    __tablename__ = "notification_settings"

    id = Column(String(50), primary_key=True, default="default")
    email_enabled = Column(Boolean, nullable=False, default=True)
    inapp_enabled = Column(Boolean, nullable=False, default=True)
    offboarding_deadline_hours = Column(Integer, nullable=False, default=72)
    escalation_warning_hours = Column(Integer, nullable=False, default=24)
    warranty_alert_days = Column(Integer, nullable=False, default=60)
    updated_by = Column(String(255), ForeignKey("employees.id"), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_notification_settings_updated_by", "updated_by"),
    )


class RoleAssignmentBlacklist(Base):
    """Tracks employee+role combos explicitly removed to prevent auto-reassignment."""

    __tablename__ = "role_assignment_blacklist"

    employee_id = Column(String(255), ForeignKey("employees.id"), nullable=False, primary_key=True)
    role_id = Column(String(255), ForeignKey("roles.id"), nullable=False, primary_key=True)
    created_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_role_blacklist_employee_id", "employee_id"),
        Index("idx_role_blacklist_role_id", "role_id"),
    )


class NotificationModuleToggle(Base):
    """Per-module, per-channel email/inapp enable toggle."""

    __tablename__ = "notification_module_toggles"

    module = Column(String(100), nullable=False, primary_key=True)
    channel = Column(String(20), nullable=False, primary_key=True)
    enabled = Column(Boolean, nullable=False, default=True)

    __table_args__ = (
        Index("idx_notification_module_toggles_module", "module"),
    )
