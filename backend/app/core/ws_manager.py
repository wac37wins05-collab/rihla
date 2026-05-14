"""WebSocket Connection Manager — in-memory pub/sub for real-time KPI push."""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Dict, List, Optional

from fastapi import WebSocket

logger = logging.getLogger("rihla.ws")


class DashboardWSManager:
    """Manages WebSocket connections for the dashboard KPI feed.

    Clients connect to /ws/dashboard and receive JSON messages:
      - {"type": "kpi", "data": {...}}    — pushed every PUSH_INTERVAL seconds
      - {"type": "ping"}                  — keepalive every 15s
      - {"type": "event", "event": "..."} — triggered by data-mutation events
    """

    PUSH_INTERVAL = 30  # seconds between automatic KPI refreshes

    def __init__(self) -> None:
        # user_id → list of open WebSocket connections (one user can have multiple tabs)
        self._connections: Dict[str, List[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, ws: WebSocket, user_id: str) -> None:
        await ws.accept()
        async with self._lock:
            self._connections.setdefault(user_id, []).append(ws)
        logger.info("[WS] Connected user=%s  total=%d", user_id, self._total())

    async def disconnect(self, ws: WebSocket, user_id: str) -> None:
        async with self._lock:
            conns = self._connections.get(user_id, [])
            if ws in conns:
                conns.remove(ws)
            if not conns:
                self._connections.pop(user_id, None)
        logger.info("[WS] Disconnected user=%s  total=%d", user_id, self._total())

    def _total(self) -> int:
        return sum(len(v) for v in self._connections.values())

    # ── Broadcast helpers ────────────────────────────────────────────

    async def broadcast(self, message: dict, exclude_user: Optional[str] = None) -> None:
        """Send a JSON message to ALL connected users (except exclude_user)."""
        payload = json.dumps(message)
        dead: list[tuple[str, WebSocket]] = []

        async with self._lock:
            snapshot = {uid: list(ws_list) for uid, ws_list in self._connections.items()}

        for uid, ws_list in snapshot.items():
            if uid == exclude_user:
                continue
            for ws in ws_list:
                try:
                    await ws.send_text(payload)
                except Exception:
                    dead.append((uid, ws))

        for uid, ws in dead:
            await self.disconnect(ws, uid)

    async def send_to_user(self, user_id: str, message: dict) -> None:
        """Send a JSON message to a specific user (all their tabs)."""
        payload = json.dumps(message)
        dead: list[WebSocket] = []

        async with self._lock:
            ws_list = list(self._connections.get(user_id, []))

        for ws in ws_list:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)

        for ws in dead:
            await self.disconnect(ws, user_id)

    # ── Event helpers ────────────────────────────────────────────────

    async def emit_event(self, event_type: str, data: Optional[dict] = None) -> None:
        """Broadcast a named event, optionally with payload.

        The frontend hook listens for these to invalidate React Query caches.
        Common events: 'project_created', 'project_updated',
                       'invoice_created', 'quotation_created'.
        """
        await self.broadcast({"type": "event", "event": event_type, "data": data or {}})

    async def emit_ping(self) -> None:
        await self.broadcast({"type": "ping"})


# ── Singleton ────────────────────────────────────────────────────────
dashboard_ws = DashboardWSManager()
