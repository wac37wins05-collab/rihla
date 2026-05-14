"""Tests for the WhatsApp Hub module — conversation and message management."""

import pytest
from fastapi.testclient import TestClient

from app.modules.auth.models import User


CONVERSATION_PAYLOAD = {
    "contact_name": "Mohamed El Amrani",
    "contact_phone": "+212661234567",
    "role": "client",
    "project_ref": "YS-2026-001",
    "avatar": None,
}


class TestConversations:
    """POST / GET /api/whatsapp/conversations"""

    def test_create_conversation(self, client: TestClient, auth_headers: dict):
        resp = client.post("/api/whatsapp/conversations", json=CONVERSATION_PAYLOAD, headers=auth_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["contact_name"] == "Mohamed El Amrani"
        assert data["contact_phone"] == "+212661234567"
        assert data["unread"] == 0
        assert "id" in data

    def test_list_conversations_empty(self, client: TestClient, auth_headers: dict):
        resp = client.get("/api/whatsapp/conversations", headers=auth_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_list_conversations_after_create(self, client: TestClient, auth_headers: dict):
        client.post("/api/whatsapp/conversations", json=CONVERSATION_PAYLOAD, headers=auth_headers)
        resp = client.get("/api/whatsapp/conversations", headers=auth_headers)
        assert resp.status_code == 200
        items = resp.json()
        assert len(items) >= 1
        assert items[0]["contact_name"] == "Mohamed El Amrani"

    def test_list_conversations_requires_auth(self, client: TestClient):
        resp = client.get("/api/whatsapp/conversations")
        assert resp.status_code in (401, 403)


class TestMessages:
    """POST / GET /api/whatsapp/conversations/{id}/messages"""

    def _create_conversation(self, client: TestClient, headers: dict) -> str:
        resp = client.post("/api/whatsapp/conversations", json=CONVERSATION_PAYLOAD, headers=headers)
        return resp.json()["id"]

    def test_send_message(self, client: TestClient, auth_headers: dict):
        cid = self._create_conversation(client, auth_headers)

        resp = client.post(
            f"/api/whatsapp/conversations/{cid}/messages",
            json={"text": "Bonjour, votre dossier est prêt!", "type": "text"},
            headers=auth_headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["text"] == "Bonjour, votre dossier est prêt!"
        assert data["is_outgoing"] is True
        assert data["status"] == "delivered"
        assert "id" in data

    def test_list_messages_empty_conversation(self, client: TestClient, auth_headers: dict):
        cid = self._create_conversation(client, auth_headers)
        resp = client.get(f"/api/whatsapp/conversations/{cid}/messages", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_messages_after_send(self, client: TestClient, auth_headers: dict):
        cid = self._create_conversation(client, auth_headers)
        client.post(
            f"/api/whatsapp/conversations/{cid}/messages",
            json={"text": "Premier message"},
            headers=auth_headers,
        )
        client.post(
            f"/api/whatsapp/conversations/{cid}/messages",
            json={"text": "Deuxième message"},
            headers=auth_headers,
        )

        resp = client.get(f"/api/whatsapp/conversations/{cid}/messages", headers=auth_headers)
        assert resp.status_code == 200
        messages = resp.json()
        assert len(messages) == 2
        assert messages[0]["text"] == "Premier message"
        assert messages[1]["text"] == "Deuxième message"

    def test_messages_mark_conversation_read(self, client: TestClient, auth_headers: dict):
        """Fetching messages should set unread=0 on the conversation."""
        cid = self._create_conversation(client, auth_headers)

        # Fetch messages (marks as read)
        client.get(f"/api/whatsapp/conversations/{cid}/messages", headers=auth_headers)

        # Conversation unread should be 0
        convos = client.get("/api/whatsapp/conversations", headers=auth_headers).json()
        convo = next((c for c in convos if c["id"] == cid), None)
        assert convo is not None
        assert convo["unread"] == 0

    def test_send_message_updates_last_message(self, client: TestClient, auth_headers: dict):
        """Sending a message should update conversation.last_message."""
        cid = self._create_conversation(client, auth_headers)
        client.post(
            f"/api/whatsapp/conversations/{cid}/messages",
            json={"text": "Votre vol est confirmé pour demain"},
            headers=auth_headers,
        )
        convos = client.get("/api/whatsapp/conversations", headers=auth_headers).json()
        convo = next((c for c in convos if c["id"] == cid), None)
        assert convo is not None
        assert "Votre vol est confirmé" in convo["last_message"]

    def test_send_to_nonexistent_conversation(self, client: TestClient, auth_headers: dict):
        resp = client.post(
            "/api/whatsapp/conversations/nonexistent-id/messages",
            json={"text": "Hello"},
            headers=auth_headers,
        )
        assert resp.status_code == 404

    def test_list_messages_nonexistent_conversation(self, client: TestClient, auth_headers: dict):
        resp = client.get(
            "/api/whatsapp/conversations/nonexistent-id/messages",
            headers=auth_headers,
        )
        assert resp.status_code == 404
