"""Microsoft Graph API client — app-only (client credentials) token flow.

Uses client_credentials grant to obtain an access token, then calls the
Graph API to list security group members. No user interaction required.
"""

import httpx
import structlog

from ..config import settings

logger = structlog.get_logger()

_GRAPH_BASE = "https://graph.microsoft.com/v1.0"
_TOKEN_URL = "https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"

_MEMBER_FIELDS = ",".join([
    "id",
    "displayName",
    "givenName",
    "surname",
    "mail",
    "userPrincipalName",
    "jobTitle",
    "department",
    "officeLocation",
    "createdDateTime",
])


class GraphService:
    """Fetches data from Microsoft Graph using app-only (client credentials) auth."""

    def _get_app_token(self) -> str:
        """Obtain a short-lived app-only access token via client credentials."""
        url = _TOKEN_URL.format(tenant_id=settings.azure_tenant_id)
        response = httpx.post(
            url,
            data={
                "grant_type": "client_credentials",
                "client_id": settings.azure_client_id,
                "client_secret": settings.azure_client_secret,
                "scope": "https://graph.microsoft.com/.default",
            },
            timeout=10.0,
        )
        response.raise_for_status()
        return response.json()["access_token"]

    def get_group_members(self, group_id: str) -> list[dict]:
        """Return all direct members of an Entra security group.

        Handles Graph API pagination automatically via @odata.nextLink.

        Args:
            group_id: The Entra object ID of the security group.

        Returns:
            List of member dicts containing profile fields.
        """
        token = self._get_app_token()
        headers = {"Authorization": f"Bearer {token}"}
        url = f"{_GRAPH_BASE}/groups/{group_id}/members"
        params: dict = {"$select": _MEMBER_FIELDS, "$top": 999}

        members: list[dict] = []
        while url:
            response = httpx.get(url, headers=headers, params=params, timeout=15.0)
            response.raise_for_status()
            data = response.json()
            members.extend(data.get("value", []))
            url = data.get("@odata.nextLink")
            params = {}  # nextLink already encodes all params
        logger.debug(
            "Graph: fetched group members.",
            group_id=group_id,
            count=len(members),
        )
        return members
