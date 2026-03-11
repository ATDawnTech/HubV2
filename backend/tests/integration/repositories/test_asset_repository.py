import pytest
from datetime import datetime, timezone
from src.adthub.db.repositories.asset_repository import AssetRepository
from src.adthub.exceptions import ResourceNotFoundError
from src.adthub.db.models.assets import Asset
from tests.factories.asset_factory import AssetFactory, AssignedAssetFactory
from tests.factories.employee_factory import EmployeeFactory


@pytest.mark.integration
def test_find_by_id_returns_asset_when_found(db_session) -> None:
    """AssetRepository.find_by_id returns the correct asset."""
    asset = AssetFactory()
    db_session.add(asset)
    db_session.flush()

    repo = AssetRepository(db_session)
    result = repo.find_by_id(asset.id)

    assert result is not None
    assert result.id == asset.id
    assert result.asset_tag == asset.asset_tag


@pytest.mark.integration
def test_find_by_id_returns_none_when_not_found(db_session) -> None:
    """AssetRepository.find_by_id returns None for non-existent ID."""
    repo = AssetRepository(db_session)
    result = repo.find_by_id("ast_doesnotexist")
    assert result is None


@pytest.mark.integration
def test_find_by_id_returns_none_when_soft_deleted(db_session) -> None:
    """AssetRepository.find_by_id does not return soft-deleted assets."""
    asset = AssetFactory()
    asset.deleted_at = datetime.now(timezone.utc)
    db_session.add(asset)
    db_session.flush()

    repo = AssetRepository(db_session)
    result = repo.find_by_id(asset.id)

    assert result is None


@pytest.mark.integration
def test_find_all_returns_assets(db_session) -> None:
    """AssetRepository.find_all returns all active assets."""
    asset1 = AssetFactory()
    asset2 = AssetFactory()
    db_session.add_all([asset1, asset2])
    db_session.flush()

    repo = AssetRepository(db_session)
    results = repo.find_all()
    ids = [r.id for r in results]

    assert asset1.id in ids
    assert asset2.id in ids


@pytest.mark.integration
def test_find_all_excludes_deleted_assets(db_session) -> None:
    """AssetRepository.find_all does not return soft-deleted assets."""
    active = AssetFactory()
    deleted = AssetFactory()
    deleted.deleted_at = datetime.now(timezone.utc)
    db_session.add_all([active, deleted])
    db_session.flush()

    repo = AssetRepository(db_session)
    results = repo.find_all()
    result_ids = [r.id for r in results]

    assert active.id in result_ids
    assert deleted.id not in result_ids


@pytest.mark.integration
def test_find_all_paginates_with_cursor(db_session) -> None:
    """AssetRepository.find_all returns the next page when cursor is provided."""
    assets = [AssetFactory() for _ in range(5)]
    assets.sort(key=lambda a: a.id)
    db_session.add_all(assets)
    db_session.flush()

    repo = AssetRepository(db_session)
    first_page = repo.find_all(limit=2)
    assert len(first_page) <= 3

    cursor = first_page[1].id
    second_page = repo.find_all(limit=2, cursor=cursor)
    assert all(a.id > cursor for a in second_page)


@pytest.mark.integration
def test_save_creates_asset_with_all_fields(db_session) -> None:
    """AssetRepository.save persists a new asset with correct field values."""
    asset = AssetFactory(model="MacBook Pro", status="available")

    repo = AssetRepository(db_session)
    saved = repo.save(asset)

    assert saved.id == asset.id
    assert saved.model == "MacBook Pro"
    assert saved.status == "available"
    assert saved.deleted_at is None


@pytest.mark.integration
def test_save_updates_asset_status(db_session) -> None:
    """AssetRepository.save updates an existing asset's status."""
    asset = AssetFactory(status="available")
    db_session.add(asset)
    db_session.flush()

    asset.status = "assigned"
    repo = AssetRepository(db_session)
    repo.save(asset)

    result = repo.find_by_id(asset.id)
    assert result.status == "assigned"


@pytest.mark.integration
def test_soft_delete_sets_deleted_at(db_session) -> None:
    """AssetRepository.soft_delete sets deleted_at on the record."""
    asset = AssetFactory()
    db_session.add(asset)
    db_session.flush()

    repo = AssetRepository(db_session)
    repo.soft_delete(asset.id)

    raw = db_session.query(Asset).filter(Asset.id == asset.id).first()
    assert raw.deleted_at is not None


@pytest.mark.integration
def test_soft_delete_record_no_longer_returned(db_session) -> None:
    """AssetRepository.soft_delete causes find_by_id to return None."""
    asset = AssetFactory()
    db_session.add(asset)
    db_session.flush()

    repo = AssetRepository(db_session)
    repo.soft_delete(asset.id)

    result = repo.find_by_id(asset.id)
    assert result is None


@pytest.mark.integration
def test_soft_delete_raises_error_when_not_found(db_session) -> None:
    """AssetRepository.soft_delete raises ResourceNotFoundError for missing ID."""
    repo = AssetRepository(db_session)
    with pytest.raises(ResourceNotFoundError):
        repo.soft_delete("ast_doesnotexist")


@pytest.mark.integration
def test_find_by_asset_tag_returns_asset(db_session) -> None:
    """AssetRepository.find_by_asset_tag returns asset with matching tag."""
    asset = AssetFactory(asset_tag="LAPTOP-001")
    db_session.add(asset)
    db_session.flush()

    repo = AssetRepository(db_session)
    result = repo.find_by_asset_tag("LAPTOP-001")

    assert result is not None
    assert result.id == asset.id


@pytest.mark.integration
def test_find_by_asset_tag_returns_none_when_not_found(db_session) -> None:
    """AssetRepository.find_by_asset_tag returns None for unknown tag."""
    repo = AssetRepository(db_session)
    result = repo.find_by_asset_tag("NONEXISTENT-TAG")
    assert result is None


@pytest.mark.integration
def test_find_assigned_to_returns_employee_assets(db_session) -> None:
    """AssetRepository.find_assigned_to returns all assets assigned to employee."""
    employee = EmployeeFactory()
    db_session.add(employee)
    db_session.flush()

    asset1 = AssignedAssetFactory(assigned_to=employee.id)
    asset2 = AssignedAssetFactory(assigned_to=employee.id)
    db_session.add_all([asset1, asset2])
    db_session.flush()

    repo = AssetRepository(db_session)
    results = repo.find_assigned_to(employee.id)
    result_ids = [r.id for r in results]

    assert asset1.id in result_ids
    assert asset2.id in result_ids


@pytest.mark.integration
def test_find_assigned_to_excludes_unassigned_assets(db_session) -> None:
    """AssetRepository.find_assigned_to excludes assets assigned to other employees."""
    employee1 = EmployeeFactory()
    employee2 = EmployeeFactory()
    db_session.add_all([employee1, employee2])
    db_session.flush()

    asset_emp1 = AssignedAssetFactory(assigned_to=employee1.id)
    asset_emp2 = AssignedAssetFactory(assigned_to=employee2.id)
    unassigned = AssetFactory(assigned_to=None)
    db_session.add_all([asset_emp1, asset_emp2, unassigned])
    db_session.flush()

    repo = AssetRepository(db_session)
    results = repo.find_assigned_to(employee1.id)
    result_ids = [r.id for r in results]

    assert asset_emp1.id in result_ids
    assert asset_emp2.id not in result_ids
    assert unassigned.id not in result_ids


@pytest.mark.integration
def test_find_by_status_returns_matching_assets(db_session) -> None:
    """AssetRepository.find_by_status returns assets with the given status."""
    available1 = AssetFactory(status="available")
    available2 = AssetFactory(status="available")
    assigned = AssetFactory(status="assigned")
    db_session.add_all([available1, available2, assigned])
    db_session.flush()

    repo = AssetRepository(db_session)
    results = repo.find_by_status("available")
    result_ids = [r.id for r in results]

    assert available1.id in result_ids
    assert available2.id in result_ids
    assert assigned.id not in result_ids
