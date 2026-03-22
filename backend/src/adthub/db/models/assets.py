from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Text, Date, DateTime, Boolean, Integer,
    ForeignKey, Index, text, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from ..base import Base


class Asset(Base):
    __tablename__ = "assets"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    asset_tag = Column(String(100), nullable=False, unique=True)
    model = Column(String(255), nullable=False)
    manufacturer = Column(String(255), nullable=True)
    category_id = Column(
        UUID(as_uuid=True),
        ForeignKey("asset_categories.id", onupdate="CASCADE"),
        nullable=True,
    )
    serial_number = Column(String(255), nullable=True)
    location = Column(String(255), nullable=True)
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    status = Column(String(50), nullable=True, default="available")
    condition = Column(String(50), nullable=True)
    procurement_date = Column(Date, nullable=True)
    warranty_start_date = Column(Date, nullable=True)
    warranty_end_date = Column(Date, nullable=True)
    warranty_type = Column(String(50), nullable=True)
    vendor = Column(String(255), nullable=True)
    invoice_verified_status = Column(String(50), nullable=True, default="unverified")
    import_source = Column(String(255), nullable=True)
    import_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True, default=None)

    __table_args__ = (
        Index("idx_assets_category_id", "category_id"),
        Index("idx_assets_assigned_to", "assigned_to"),
        Index("idx_assets_status", "status"),
    )


class AssetAttachment(Base):
    __tablename__ = "asset_attachments"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    asset_id = Column(
        UUID(as_uuid=True), ForeignKey("assets.id", ondelete="CASCADE"), nullable=False
    )
    file_url = Column(Text, nullable=False)
    file_name = Column(String(255), nullable=False)
    label = Column(String(255), nullable=True)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    uploaded_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_asset_attachments_asset_id", "asset_id"),
        Index("idx_asset_attachments_uploaded_by", "uploaded_by"),
    )


class AssetAssignmentHistory(Base):
    __tablename__ = "asset_assignment_history"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    asset_id = Column(
        UUID(as_uuid=True), ForeignKey("assets.id", ondelete="CASCADE"), nullable=False
    )
    assigned_to = Column(
        UUID(as_uuid=True), ForeignKey("employees.id", ondelete="SET NULL"), nullable=True
    )
    assigned_by = Column(
        UUID(as_uuid=True), ForeignKey("employees.id", ondelete="SET NULL"), nullable=True
    )
    assigned_at = Column(DateTime(timezone=True), nullable=False)
    returned_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)

    __table_args__ = (
        Index("idx_asset_assignment_history_asset_id", "asset_id"),
        Index("idx_asset_assignment_history_assigned_to", "assigned_to"),
        Index("idx_asset_assignment_history_assigned_by", "assigned_by"),
    )

class AssetCategory(Base):
    __tablename__ = "asset_categories"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    code = Column(String(255), nullable=True)
    is_active = Column(Boolean, nullable=False, server_default=text("true"))
    sort_order = Column(Integer, nullable=True, server_default=text("0"))
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True, default=None)

    __table_args__ = (
        Index("idx_asset_categories_name", "name"),
        UniqueConstraint("code", name="uq_asset_categories_code"),
    )