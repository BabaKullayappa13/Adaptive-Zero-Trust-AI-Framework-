"""Smoke tests for the public health contract and authentication route wiring."""

import pytest
from httpx import ASGITransport, AsyncClient

from backend.main import app


@pytest.mark.asyncio
async def test_health_endpoint() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "zero-trust-backend"}


def test_authentication_routes_are_registered() -> None:
    routes = {route.path for route in app.routes}
    assert "/api/auth/register" in routes
    assert "/api/auth/login" in routes
    assert "/api/auth/refresh" in routes
    assert "/api/auth/logout" in routes
    assert "/api/auth/me" in routes


def test_health_alias_is_registered() -> None:
    routes = {route.path for route in app.routes}
    assert "/api/health" in routes
