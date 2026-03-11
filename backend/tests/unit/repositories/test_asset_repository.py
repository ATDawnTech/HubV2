import pytest
from unittest.mock import MagicMock
from src.adthub.db.repositories.asset_repository import AssetRepository
from src.adthub.exceptions import ResourceNotFoundError
from tests.factories.asset_factory import AssetFactory, AssignedAssetFactory


def _mock_query_chain(mock_session, return_value):
    """Set up mock_session.query().filter().first() chain to return a value."""
    mock_session.query.return_value.filter.return_value.first.return_value = return_value
    return mock_session


@pytest.mark.unit
def test_find_by_id_returns_asset_when_session_returns_one(mock_session) -> None:
    """AssetRepository.find_by_id returns the asset returned by the query."""
    expected = AssetFactory()
    _mock_query_chain(mock_session, expected)

    repo = AssetRepository(mock_session)
    result = repo.find_by_id(expected.id)

    assert result == expected


@pytest.mark.unit
def test_find_by_id_returns_none_when_session_returns_none(mock_session) -> None:
    """AssetRepository.find_by_id returns None when query returns nothing."""
    _mock_query_chain(mock_session, None)

    repo = AssetRepository(mock_session)
    result = repo.find_by_id("ast_missing")

    assert result is None


@pytest.mark.unit
def test_save_calls_session_add_and_flush(mock_session) -> None:
    """AssetRepository.save calls session.add and session.flush."""
    asset = AssetFactory()

    repo = AssetRepository(mock_session)
    result = repo.save(asset)

    mock_session.add.assert_called_once_with(asset)
    mock_session.flush.assert_called_once()
    assert result == asset


@pytest.mark.unit
def test_soft_delete_sets_deleted_at_on_entity(mock_session) -> None:
    """AssetRepository.soft_delete sets deleted_at and flushes."""
    asset = AssetFactory()
    assert asset.deleted_at is None

    repo = AssetRepository(mock_session)
    repo.find_by_id = MagicMock(return_value=asset)

    repo.soft_delete(asset.id)

    assert asset.deleted_at is not None
    mock_session.flush.assert_called_once()


@pytest.mark.unit
def test_soft_delete_raises_error_when_asset_not_found(mock_session) -> None:
    """AssetRepository.soft_delete raises ResourceNotFoundError for missing ID."""
    repo = AssetRepository(mock_session)
    repo.find_by_id = MagicMock(return_value=None)

    with pytest.raises(ResourceNotFoundError):
        repo.soft_delete("ast_doesnotexist")


@pytest.mark.unit
def test_find_by_asset_tag_returns_asset_when_found(mock_session) -> None:
    """AssetRepository.find_by_asset_tag returns the matched asset."""
    asset = AssetFactory(asset_tag="AST-00042")
    _mock_query_chain(mock_session, asset)

    repo = AssetRepository(mock_session)
    result = repo.find_by_asset_tag("AST-00042")

    assert result == asset


@pytest.mark.unit
def test_find_by_asset_tag_returns_none_when_not_found(mock_session) -> None:
    """AssetRepository.find_by_asset_tag returns None when tag not found."""
    _mock_query_chain(mock_session, None)

    repo = AssetRepository(mock_session)
    result = repo.find_by_asset_tag("AST-99999")

    assert result is None


@pytest.mark.unit
def test_find_assigned_to_returns_assets_list(mock_session) -> None:
    """AssetRepository.find_assigned_to returns all assets assigned to the employee."""
    employee_id = "emp_abc123456789"
    assets = [AssignedAssetFactory(assigned_to=employee_id) for _ in range(3)]
    (mock_session.query.return_value
     .filter.return_value
     .order_by.return_value
     .all.return_value) = assets

    repo = AssetRepository(mock_session)
    results = repo.find_assigned_to(employee_id)

    assert results == assets
    mock_session.query.assert_called_once()


@pytest.mark.unit
def test_find_by_status_returns_filtered_assets(mock_session) -> None:
    """AssetRepository.find_by_status returns assets matching the given status."""
    assets = [AssetFactory(status="available") for _ in range(2)]
    (mock_session.query.return_value
     .filter.return_value
     .order_by.return_value
     .limit.return_value
     .all.return_value) = assets

    repo = AssetRepository(mock_session)
    results = repo.find_by_status("available")

    assert results == assets
    mock_session.query.assert_called_once()
