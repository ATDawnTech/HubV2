from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Text, Date, DateTime,
    ForeignKey, Index
)
from ..base import Base


class Asset(Base):
    __tablename__ = "assets"

    id = Column(String(255), primary_key=True)
    asset_tag = Column(String(100), nullable=False, unique=True)
    model = Column(String(255), nullable=False)
    manufacturer = Column(String(255), nullable=True)
    category_id = Column(
        String(255),
        ForeignKey("asset_categories.id", onupdate="CASCADE"),
        nullable=True,
    )
    serial_number = Column(String(255), nullable=True)
    location = Column(String(255), nullable=True)
    assigned_to = Column(String(255), ForeignKey("employees.id"), nullable=True)
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

    id = Column(String(255), primary_key=True)
    asset_id = Column(
        String(255), ForeignKey("assets.id", ondelete="CASCADE"), nullable=False
    )
    file_url = Column(Text, nullable=False)
    file_name = Column(String(255), nullable=False)
    label = Column(String(255), nullable=True)
    uploaded_by = Column(String(255), ForeignKey("employees.id"), nullable=True)
    uploaded_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_asset_attachments_asset_id", "asset_id"),
        Index("idx_asset_attachments_uploaded_by", "uploaded_by"),
    )


class AssetAssignmentHistory(Base):
    __tablename__ = "asset_assignment_history"

    id = Column(String(255), primary_key=True)
    asset_id = Column(
        String(255), ForeignKey("assets.id", ondelete="CASCADE"), nullable=False
    )
    assigned_to = Column(
        String(255), ForeignKey("employees.id", ondelete="SET NULL"), nullable=True
    )
    assigned_by = Column(
        String(255), ForeignKey("employees.id", ondelete="SET NULL"), nullable=True
    )
    assigned_at = Column(DateTime(timezone=True), nullable=False)
    returned_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)

    __table_args__ = (
        Index("idx_asset_assignment_history_asset_id", "asset_id"),
        Index("idx_asset_assignment_history_assigned_to", "assigned_to"),
        Index("idx_asset_assignment_history_assigned_by", "assigned_by"),
    )
