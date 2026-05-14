"""Tests for the Allotments module — hotel room block management."""

import pytest
from fastapi.testclient import TestClient

from app.modules.auth.models import User


ALLOTMENT_PAYLOAD = {
    "hotel_name": "Riad Fes",
    "city": "Fès",
    "category": "5*",
    "check_in": "2026-06-10",
    "check_out": "2026-06-13",
    "rooms_blocked": 12,
    "rooms_confirmed": 0,
    "rooms_released": 0,
    "price_per_night": 1950.0,
    "status": "blocked",
}


class TestAllotmentCRUD:
    """POST / GET / PATCH / DELETE /api/allotments"""

    def test_create_allotment(self, client: TestClient, auth_headers: dict):
        resp = client.post("/api/allotments", json=ALLOTMENT_PAYLOAD, headers=auth_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["hotel_name"] == "Riad Fes"
        assert data["status"] == "blocked"
        assert "id" in data

    def test_list_allotments_empty(self, client: TestClient, auth_headers: dict):
        resp = client.get("/api/allotments", headers=auth_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_list_allotments_after_create(self, client: TestClient, auth_headers: dict):
        client.post("/api/allotments", json=ALLOTMENT_PAYLOAD, headers=auth_headers)
        resp = client.get("/api/allotments", headers=auth_headers)
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_list_allotments_filter_by_project(self, client: TestClient, auth_headers: dict):
        payload = {**ALLOTMENT_PAYLOAD, "project_id": "proj-xyz"}
        client.post("/api/allotments", json=payload, headers=auth_headers)
        # With project_id filter
        resp = client.get("/api/allotments?project_id=proj-xyz", headers=auth_headers)
        assert resp.status_code == 200
        items = resp.json()
        assert all(item["project_id"] == "proj-xyz" for item in items)

    def test_update_allotment(self, client: TestClient, auth_headers: dict):
        create = client.post("/api/allotments", json=ALLOTMENT_PAYLOAD, headers=auth_headers)
        aid = create.json()["id"]

        resp = client.patch(
            f"/api/allotments/{aid}",
            json={"rooms_confirmed": 10, "notes": "Updated by test"},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["rooms_confirmed"] == 10
        assert data["notes"] == "Updated by test"

    def test_update_nonexistent_allotment(self, client: TestClient, auth_headers: dict):
        resp = client.patch(
            "/api/allotments/nonexistent-id",
            json={"rooms_confirmed": 5},
            headers=auth_headers,
        )
        assert resp.status_code == 404

    def test_soft_delete_allotment(self, client: TestClient, auth_headers: dict):
        create = client.post("/api/allotments", json=ALLOTMENT_PAYLOAD, headers=auth_headers)
        aid = create.json()["id"]

        resp = client.delete(f"/api/allotments/{aid}", headers=auth_headers)
        assert resp.status_code == 204

        # Should not appear in list after soft delete
        resp2 = client.get("/api/allotments", headers=auth_headers)
        ids = [a["id"] for a in resp2.json()]
        assert aid not in ids


class TestAllotmentActions:
    """POST /confirm and /release"""

    def test_confirm_allotment(self, client: TestClient, auth_headers: dict):
        payload = {**ALLOTMENT_PAYLOAD, "rooms_blocked": 12}
        create = client.post("/api/allotments", json=payload, headers=auth_headers)
        aid = create.json()["id"]

        resp = client.post(f"/api/allotments/{aid}/confirm", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "confirmed"
        assert data["rooms_confirmed"] == 12

    def test_release_allotment(self, client: TestClient, auth_headers: dict):
        payload = {**ALLOTMENT_PAYLOAD, "rooms_blocked": 12, "rooms_confirmed": 5}
        create = client.post("/api/allotments", json=payload, headers=auth_headers)
        aid = create.json()["id"]

        resp = client.post(f"/api/allotments/{aid}/release", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        # rooms_released = blocked - confirmed = 12 - 5 = 7
        assert data["rooms_released"] == 7
        assert data["status"] == "partial"

    def test_release_unconfirmed_allotment(self, client: TestClient, auth_headers: dict):
        """Release an allotment with 0 confirmed → status=released."""
        payload = {**ALLOTMENT_PAYLOAD, "rooms_blocked": 12, "rooms_confirmed": 0}
        create = client.post("/api/allotments", json=payload, headers=auth_headers)
        aid = create.json()["id"]

        resp = client.post(f"/api/allotments/{aid}/release", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "released"
        assert data["rooms_released"] == 12


class TestAllotmentAuth:
    """Unauthenticated requests should fail."""

    def test_list_requires_auth(self, client: TestClient):
        resp = client.get("/api/allotments")
        assert resp.status_code in (401, 403)

    def test_create_requires_auth(self, client: TestClient):
        resp = client.post("/api/allotments", json=ALLOTMENT_PAYLOAD)
        assert resp.status_code in (401, 403)
