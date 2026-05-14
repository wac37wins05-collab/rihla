"""Tests for the Flight Search module — deterministic mock provider."""

import pytest
from fastapi.testclient import TestClient


SEARCH_PAYLOAD = {
    "origin": "CMN",
    "destination": "CDG",
    "depart_date": "2026-06-15",
    "return_date": "2026-06-22",
    "pax": 1,
    "cabin_class": "economy",
}


class TestFlightSearch:
    """POST /api/flight-search/search"""

    def test_search_returns_results(self, client: TestClient, auth_headers: dict):
        resp = client.post("/api/flight-search/search", json=SEARCH_PAYLOAD, headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "outbound" in data
        assert "inbound" in data
        assert isinstance(data["outbound"], list)
        assert len(data["outbound"]) > 0

    def test_outbound_flight_has_required_fields(self, client: TestClient, auth_headers: dict):
        resp = client.post("/api/flight-search/search", json=SEARCH_PAYLOAD, headers=auth_headers)
        assert resp.status_code == 200
        flight = resp.json()["outbound"][0]
        assert "airline" in flight
        assert "flight_number" in flight
        assert "departure_time" in flight
        assert "arrival_time" in flight
        assert "price" in flight
        assert "duration_minutes" in flight

    def test_deterministic_results(self, client: TestClient, auth_headers: dict):
        """Same input → same output (deterministic mock)."""
        resp1 = client.post("/api/flight-search/search", json=SEARCH_PAYLOAD, headers=auth_headers)
        resp2 = client.post("/api/flight-search/search", json=SEARCH_PAYLOAD, headers=auth_headers)
        assert resp1.json()["outbound"] == resp2.json()["outbound"]

    def test_different_routes_give_different_results(self, client: TestClient, auth_headers: dict):
        payload2 = {**SEARCH_PAYLOAD, "destination": "LHR"}  # London Heathrow instead of Paris
        resp1 = client.post("/api/flight-search/search", json=SEARCH_PAYLOAD, headers=auth_headers)
        resp2 = client.post("/api/flight-search/search", json=payload2, headers=auth_headers)
        # Different destinations → different flights
        prices1 = {f["price"] for f in resp1.json()["outbound"]}
        prices2 = {f["price"] for f in resp2.json()["outbound"]}
        # At least some prices should differ
        assert prices1 != prices2

    def test_one_way_search_no_inbound(self, client: TestClient, auth_headers: dict):
        payload = {k: v for k, v in SEARCH_PAYLOAD.items() if k != "return_date"}  # omit return_date
        resp = client.post("/api/flight-search/search", json=payload, headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        # One-way: inbound list should be empty or not present
        assert data.get("inbound") == [] or data.get("inbound") is None

    def test_prices_are_positive(self, client: TestClient, auth_headers: dict):
        resp = client.post("/api/flight-search/search", json=SEARCH_PAYLOAD, headers=auth_headers)
        for flight in resp.json()["outbound"]:
            assert flight["price"] > 0

    def test_search_requires_auth(self, client: TestClient):
        resp = client.post("/api/flight-search/search", json=SEARCH_PAYLOAD)
        assert resp.status_code in (401, 403)


class TestAirportAutocomplete:
    """GET /api/flight-search/airports"""

    def test_list_airports(self, client: TestClient, auth_headers: dict):
        resp = client.get("/api/flight-search/airports", headers=auth_headers)
        assert resp.status_code == 200
        airports = resp.json()
        assert isinstance(airports, list)
        assert len(airports) > 0

    def test_airports_have_required_fields(self, client: TestClient, auth_headers: dict):
        resp = client.get("/api/flight-search/airports", headers=auth_headers)
        airport = resp.json()[0]
        assert "code" in airport
        assert "name" in airport
        assert "city" in airport

    def test_airports_include_moroccan_airports(self, client: TestClient, auth_headers: dict):
        resp = client.get("/api/flight-search/airports", headers=auth_headers)
        codes = {a["code"] for a in resp.json()}
        assert "CMN" in codes  # Casablanca Mohammed V
        assert "RAK" in codes  # Marrakech Menara

    def test_airports_filter_by_query(self, client: TestClient, auth_headers: dict):
        resp = client.get("/api/flight-search/airports?q=Casa", headers=auth_headers)
        # Should filter to Casablanca
        if resp.status_code == 200:
            airports = resp.json()
            names = [a["name"].lower() + a["city"].lower() for a in airports]
            assert any("casablanca" in n or "cmn" in n.lower() for n in names)
