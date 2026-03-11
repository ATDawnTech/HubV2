import pytest
import sqlalchemy.exc
from tests.factories.asset_factory import AssetFactory
from tests.factories.employee_factory import EmployeeFactory
from src.adthub.db.models.assets import Asset


@pytest.mark.schema
def test_d2_1_asset_tag_unique_violation(db_session) -> None:
    """D.2.1: assets.asset_tag UNIQUE — duplicate asset tag is rejected."""
    asset1 = AssetFactory(asset_tag="AST-DUPE-001")
    asset2 = AssetFactory(asset_tag="AST-DUPE-001")
    db_session.add(asset1)
    db_session.flush()

    db_session.add(asset2)
    with pytest.raises(sqlalchemy.exc.IntegrityError):
        db_session.flush()


@pytest.mark.schema
def test_d2_2_asset_tag_not_null_violation(db_session) -> None:
    """D.2.2: assets.asset_tag NOT NULL — null asset_tag is rejected."""
    asset = AssetFactory()
    asset.asset_tag = None
    db_session.add(asset)
    with pytest.raises(sqlalchemy.exc.IntegrityError):
        db_session.flush()


@pytest.mark.skip(reason="Requires alembic migration 0002 (trigger not created by metadata.create_all)")
@pytest.mark.schema
def test_d2_3_asset_assignment_history_no_update(db_session) -> None:
    """D.2.3: asset_assignment_history is append-only — UPDATE is rejected by trigger."""
    pass


@pytest.mark.skip(reason="Requires alembic migration 0002 (trigger not created by metadata.create_all)")
@pytest.mark.schema
def test_d2_4_asset_assignment_history_no_delete(db_session) -> None:
    """D.2.4: asset_assignment_history is append-only — DELETE is rejected by trigger."""
    pass


@pytest.mark.schema
def test_d2_5_assigned_to_fk_violation(db_session) -> None:
    """D.2.5: assets.assigned_to FK — assigning to a non-existent employee is rejected."""
    asset = AssetFactory(assigned_to="emp_doesnotexist000")
    db_session.add(asset)
    with pytest.raises(sqlalchemy.exc.IntegrityError):
        db_session.flush()
