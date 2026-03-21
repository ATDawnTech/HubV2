"""Unit tests for GraphService — Microsoft Graph API client.

All HTTP calls are mocked — no real network requests are made.
"""

from unittest.mock import MagicMock, patch

import pytest

from src.adthub.services.graph_service import GraphService


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_service() -> GraphService:
    return GraphService()


def _mock_response(status_code: int = 200, json_data: dict | None = None) -> MagicMock:
    resp = MagicMock()
    resp.status_code = status_code
    resp.json.return_value = json_data or {}
    resp.raise_for_status = MagicMock()
    return resp


# ---------------------------------------------------------------------------
# _get_app_token
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_get_app_token_returns_access_token() -> None:
    """_get_app_token POSTs to Entra token endpoint and returns the access_token."""
    service = _make_service()
    mock_resp = _mock_response(json_data={"access_token": "tok-abc123"})

    with patch("src.adthub.services.graph_service.httpx.post", return_value=mock_resp) as mock_post:
        with patch("src.adthub.services.graph_service.settings") as mock_settings:
            mock_settings.azure_tenant_id = "tenant-xyz"
            mock_settings.azure_client_id = "client-xyz"
            mock_settings.azure_client_secret = "secret-xyz"

            token = service._get_app_token()

    assert token == "tok-abc123"
    mock_post.assert_called_once()
    call_url = mock_post.call_args[0][0]
    assert "tenant-xyz" in call_url


@pytest.mark.unit
def test_get_app_token_raises_on_http_error() -> None:
    """_get_app_token propagates HTTP errors from the token endpoint."""
    service = _make_service()
    mock_resp = _mock_response(status_code=401)
    mock_resp.raise_for_status.side_effect = Exception("401 Unauthorized")

    with patch("src.adthub.services.graph_service.httpx.post", return_value=mock_resp):
        with patch("src.adthub.services.graph_service.settings"):
            with pytest.raises(Exception, match="401"):
                service._get_app_token()


# ---------------------------------------------------------------------------
# get_group_members
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_get_group_members_returns_all_members() -> None:
    """get_group_members returns the list of members from Graph API."""
    service = _make_service()
    members = [
        {"id": "oid-1", "displayName": "Alice", "mail": "alice@example.com"},
        {"id": "oid-2", "displayName": "Bob", "mail": "bob@example.com"},
    ]
    mock_resp = _mock_response(json_data={"value": members})

    with patch.object(service, "_get_app_token", return_value="tok-abc"):
        with patch("src.adthub.services.graph_service.httpx.get", return_value=mock_resp):
            result = service.get_group_members("grp-123")

    assert len(result) == 2
    assert result[0]["id"] == "oid-1"


@pytest.mark.unit
def test_get_group_members_follows_pagination() -> None:
    """get_group_members follows @odata.nextLink until all pages are fetched."""
    service = _make_service()

    page1_resp = _mock_response(json_data={
        "value": [{"id": "oid-1", "mail": "a@example.com"}],
        "@odata.nextLink": "https://graph.microsoft.com/v1.0/groups/grp/members?$skiptoken=abc",
    })
    page2_resp = _mock_response(json_data={
        "value": [{"id": "oid-2", "mail": "b@example.com"}],
    })

    with patch.object(service, "_get_app_token", return_value="tok-abc"):
        with patch("src.adthub.services.graph_service.httpx.get", side_effect=[page1_resp, page2_resp]):
            result = service.get_group_members("grp-123")

    assert len(result) == 2
    assert result[1]["id"] == "oid-2"


@pytest.mark.unit
def test_get_group_members_returns_empty_list_for_empty_group() -> None:
    """get_group_members returns [] when the group has no members."""
    service = _make_service()
    mock_resp = _mock_response(json_data={"value": []})

    with patch.object(service, "_get_app_token", return_value="tok-abc"):
        with patch("src.adthub.services.graph_service.httpx.get", return_value=mock_resp):
            result = service.get_group_members("grp-empty")

    assert result == []


@pytest.mark.unit
def test_get_group_members_raises_on_http_error() -> None:
    """get_group_members propagates HTTP errors from the Graph endpoint."""
    service = _make_service()
    mock_resp = _mock_response(status_code=403)
    mock_resp.raise_for_status.side_effect = Exception("403 Forbidden")

    with patch.object(service, "_get_app_token", return_value="tok-abc"):
        with patch("src.adthub.services.graph_service.httpx.get", return_value=mock_resp):
            with pytest.raises(Exception, match="403"):
                service.get_group_members("grp-123")
