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
