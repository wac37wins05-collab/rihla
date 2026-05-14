"""Tests for the CRM module — accounts, contacts, deals, leads, pipeline."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modules.auth.models import User
from app.modules.companies.models import Company
from app.modules.crm.models import CrmAccount, CrmContact, CrmDeal, CrmLead


# ── Helpers ────────────────────────────────────────────────────────────────────
VALID_ACCOUNT = {
    "name": "Voyageurs du Monde",
    "account_type": "agency",
    "primary_email": "contact@voyageurs.fr",
    "country": "FR",
    "currency": "EUR",
    "tier": "gold",
}

VALID_CONTACT = {
    "first_name": "Sophie",
    "last_name": "Martin",
    "email": "sophie.martin@voyageurs.fr",
    "phone": "+33600000000",
    "job_title": "Directrice Groupes",
}

VALID_DEAL = {
    "name": "Circuit Maroc 2025 — VDM",
    "stage": "qualification",
    "amount": 45000.0,
    "currency": "EUR",
    "pax_count": 20,
    "destination": "Marrakech",
}

VALID_LEAD = {
    "first_name": "Jean",
    "last_name": "Dupont",
    "email": "jean.dupont@tours.fr",
    "source": "web_form",
    "brief": "Circuit de 7 jours au Maroc pour 15 personnes, budget confort",
    "destination": "Fès",
    "pax_count": 15,
    "budget_min": 1200.0,
    "budget_max": 1800.0,
}


# ── Accounts ───────────────────────────────────────────────────────────────────

class TestCrmAccounts:
    """GET/POST/PATCH/DELETE /api/crm/accounts"""

    def test_list_accounts_requires_auth(self, client: TestClient):
        resp = client.get("/api/crm/accounts")
        assert resp.status_code in (401, 403)

    def test_list_accounts_empty(self, client: TestClient, auth_headers: dict):
        resp = client.get("/api/crm/accounts", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, (list, dict))  # list or paginated

    def test_create_account(self, client: TestClient, auth_headers: dict):
        resp = client.post("/api/crm/accounts", json=VALID_ACCOUNT, headers=auth_headers)
        assert resp.status_code in (200, 201)
        data = resp.json()
        assert data["name"] == VALID_ACCOUNT["name"]
        assert "id" in data

    def test_create_account_missing_name(self, client: TestClient, auth_headers: dict):
        resp = client.post("/api/crm/accounts", json={"account_type": "agency"}, headers=auth_headers)
        assert resp.status_code == 422

    def test_get_account(self, client: TestClient, auth_headers: dict):
        create = client.post("/api/crm/accounts", json=VALID_ACCOUNT, headers=auth_headers)
        account_id = create.json()["id"]
        resp = client.get(f"/api/crm/accounts/{account_id}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == account_id

    def test_get_account_not_found(self, client: TestClient, auth_headers: dict):
        resp = client.get("/api/crm/accounts/nonexistent-id-999", headers=auth_headers)
        assert resp.status_code == 404

    def test_update_account(self, client: TestClient, auth_headers: dict):
        create = client.post("/api/crm/accounts", json=VALID_ACCOUNT, headers=auth_headers)
        account_id = create.json()["id"]
        resp = client.patch(
            f"/api/crm/accounts/{account_id}",
            json={"tier": "platinum", "health_score": 85},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["tier"] == "platinum"
        assert resp.json()["health_score"] == 85

    def test_delete_account(self, client: TestClient, auth_headers: dict):
        create = client.post("/api/crm/accounts", json=VALID_ACCOUNT, headers=auth_headers)
        account_id = create.json()["id"]
        del_resp = client.delete(f"/api/crm/accounts/{account_id}", headers=auth_headers)
        assert del_resp.status_code in (200, 204)
        get_resp = client.get(f"/api/crm/accounts/{account_id}", headers=auth_headers)
        assert get_resp.status_code == 404

    def test_search_accounts_by_name(self, client: TestClient, auth_headers: dict):
        client.post("/api/crm/accounts", json=VALID_ACCOUNT, headers=auth_headers)
        resp = client.get("/api/crm/accounts?q=Voyageurs", headers=auth_headers)
        assert resp.status_code == 200

    def test_filter_accounts_by_tier(self, client: TestClient, auth_headers: dict):
        client.post("/api/crm/accounts", json=VALID_ACCOUNT, headers=auth_headers)  # gold
        resp = client.get("/api/crm/accounts?tier=gold", headers=auth_headers)
        assert resp.status_code == 200

    def test_account_360_view(self, client: TestClient, auth_headers: dict):
        create = client.post("/api/crm/accounts", json=VALID_ACCOUNT, headers=auth_headers)
        account_id = create.json()["id"]
        resp = client.get(f"/api/crm/accounts/{account_id}/360", headers=auth_headers)
        assert resp.status_code == 200


# ── Contacts ───────────────────────────────────────────────────────────────────

class TestCrmContacts:
    """Contacts nested under accounts."""

    def _create_account(self, client: TestClient, headers: dict) -> str:
        return client.post("/api/crm/accounts", json=VALID_ACCOUNT, headers=headers).json()["id"]

    def test_create_contact(self, client: TestClient, auth_headers: dict):
        account_id = self._create_account(client, auth_headers)
        payload = {**VALID_CONTACT, "account_id": account_id}
        resp = client.post("/api/crm/contacts", json=payload, headers=auth_headers)
        assert resp.status_code in (200, 201)
        assert resp.json()["email"] == VALID_CONTACT["email"]

    def test_list_contacts_for_account(self, client: TestClient, auth_headers: dict):
        account_id = self._create_account(client, auth_headers)
        client.post("/api/crm/contacts", json={**VALID_CONTACT, "account_id": account_id}, headers=auth_headers)
        resp = client.get(f"/api/crm/contacts?account_id={account_id}", headers=auth_headers)
        assert resp.status_code == 200


# ── Deals / Pipeline ───────────────────────────────────────────────────────────

class TestCrmDeals:
    """GET/POST/PATCH /api/crm/deals"""

    def _create_account(self, client: TestClient, headers: dict) -> str:
        return client.post("/api/crm/accounts", json=VALID_ACCOUNT, headers=headers).json()["id"]

    def test_create_deal(self, client: TestClient, auth_headers: dict):
        account_id = self._create_account(client, auth_headers)
        payload = {**VALID_DEAL, "account_id": account_id}
        resp = client.post("/api/crm/deals", json=payload, headers=auth_headers)
        assert resp.status_code in (200, 201)
        data = resp.json()
        assert data["name"] == VALID_DEAL["name"]
        assert data["stage"] == "qualification"

    def test_list_deals(self, client: TestClient, auth_headers: dict):
        account_id = self._create_account(client, auth_headers)
        client.post("/api/crm/deals", json={**VALID_DEAL, "account_id": account_id}, headers=auth_headers)
        resp = client.get("/api/crm/deals", headers=auth_headers)
        assert resp.status_code == 200

    def test_move_deal_stage(self, client: TestClient, auth_headers: dict):
        account_id = self._create_account(client, auth_headers)
        create = client.post("/api/crm/deals", json={**VALID_DEAL, "account_id": account_id}, headers=auth_headers)
        deal_id = create.json()["id"]
        resp = client.patch(f"/api/crm/deals/{deal_id}", json={"stage": "proposal"}, headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["stage"] == "proposal"

    def test_get_pipeline(self, client: TestClient, auth_headers: dict):
        resp = client.get("/api/crm/pipeline", headers=auth_headers)
        assert resp.status_code == 200

    def test_get_dmc_pipeline(self, client: TestClient, auth_headers: dict):
        resp = client.get("/api/crm/pipeline/dmc", headers=auth_headers)
        assert resp.status_code == 200


# ── Leads ──────────────────────────────────────────────────────────────────────

class TestCrmLeads:
    """GET/POST /api/crm/leads"""

    def test_list_leads_requires_auth(self, client: TestClient):
        resp = client.get("/api/crm/leads")
        assert resp.status_code in (401, 403)

    def test_create_lead(self, client: TestClient, auth_headers: dict):
        resp = client.post("/api/crm/leads", json=VALID_LEAD, headers=auth_headers)
        assert resp.status_code in (200, 201)
        data = resp.json()
        assert data["email"] == VALID_LEAD["email"]
        assert "id" in data

    def test_list_leads(self, client: TestClient, auth_headers: dict):
        client.post("/api/crm/leads", json=VALID_LEAD, headers=auth_headers)
        resp = client.get("/api/crm/leads", headers=auth_headers)
        assert resp.status_code == 200

    def test_qualify_lead(self, client: TestClient, auth_headers: dict):
        create = client.post("/api/crm/leads", json=VALID_LEAD, headers=auth_headers)
        lead_id = create.json()["id"]
        resp = client.post(f"/api/crm/leads/{lead_id}/qualify", headers=auth_headers)
        assert resp.status_code in (200, 201, 204)

    def test_filter_leads_by_source(self, client: TestClient, auth_headers: dict):
        client.post("/api/crm/leads", json=VALID_LEAD, headers=auth_headers)
        resp = client.get("/api/crm/leads?source=web_form", headers=auth_headers)
        assert resp.status_code == 200


# ── Dashboard KPIs ─────────────────────────────────────────────────────────────

class TestCrmDashboard:
    """GET /api/crm/dashboard"""

    def test_crm_dashboard(self, client: TestClient, auth_headers: dict):
        resp = client.get("/api/crm/dashboard", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        # Dashboard must return aggregates
        assert isinstance(data, dict)

    def test_crm_reporting(self, client: TestClient, auth_headers: dict):
        resp = client.get("/api/crm/reporting", headers=auth_headers)
        assert resp.status_code == 200

    def test_rfm_recompute(self, client: TestClient, auth_headers: dict):
        resp = client.post("/api/crm/scoring/recompute", headers=auth_headers)
        assert resp.status_code in (200, 202, 204)
