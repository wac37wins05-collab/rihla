"""Lead intake parsers — email / webform / WhatsApp / Instagram / B2B portal.

All parsers return a normalized dict ready to populate CrmLead fields.
In demo mode every channel is simulated (no external credentials needed).
"""
from __future__ import annotations
import re
from datetime import datetime, timezone
from typing import Any, Optional


# ── Extraction helpers ────────────────────────────────────────────────────────

_EMAIL_RE = re.compile(r"[\w.+\-]+@[\w\-]+\.[\w.\-]+")
_PHONE_RE = re.compile(r"[\+]?[\d\s\-\(\)]{7,20}")
_BUDGET_RE = re.compile(
    r"(?:budget|montant|price|prix|coût|cost)[^\d]*(\d[\d\s,.]*)\s*([€$£kK]?)",
    re.IGNORECASE,
)
_PAX_RE = re.compile(
    r"(\d+)\s*(?:pax|persons?|personnes?|participants?|adults?|adultes?|guests?)",
    re.IGNORECASE,
)
_DATE_RE = re.compile(
    r"(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})",
)
_COUNTRY_CODES = {
    "united states": "US", "usa": "US", "us": "US",
    "united kingdom": "UK", "uk": "UK", "england": "UK",
    "france": "FR", "fr": "FR",
    "germany": "DE", "deutschland": "DE", "allemagne": "DE",
    "spain": "ES", "españa": "ES", "espagne": "ES",
    "morocco": "MA", "maroc": "MA", "ma": "MA",
    "australia": "AU", "canada": "CA", "italy": "IT", "italie": "IT",
    "netherlands": "NL", "belgique": "BE", "belgium": "BE",
    "switzerland": "CH", "suisse": "CH", "japan": "JP",
    "china": "CN", "india": "IN",
}
_LANGUAGE_KEYWORDS = {
    "fr": ["bonjour", "merci", "voyage", "départ", "séjour", "circuit", "devis", "nuits"],
    "en": ["hello", "dear", "trip", "tour", "nights", "budget", "departure", "looking for"],
    "es": ["hola", "viaje", "noches", "precio", "salida", "circuito", "presupuesto"],
    "de": ["guten", "reise", "nächte", "preis", "abfahrt", "gruppe", "angebot"],
}
_NICHE_KEYWORDS = {
    "luxury": ["luxe", "luxury", "5*", "five star", "premium", "exclusive", "butler"],
    "mice": ["mice", "incentive", "corporate", "team building", "séminaire", "conference", "congrès"],
    "family": ["family", "famille", "kids", "children", "enfants", "school"],
    "honeymoon": ["honeymoon", "lune de miel", "mariage", "wedding", "romantique"],
    "cultural": ["culture", "histoire", "heritage", "museum", "patrimoine", "kasbahs"],
    "adventure": ["trekking", "aventure", "adventure", "desert", "désert", "climbing"],
}
_DESTINATION_KEYWORDS = [
    "marrakech", "marrakesh", "fes", "fez", "chefchaouen", "agadir", "casablanca",
    "essaouira", "ouarzazate", "merzouga", "sahara", "atlas", "toubkal", "rabat",
    "tangier", "tanger", "meknes", "meknès", "ifrane", "draa", "dades",
]


def _extract_email(text: str) -> Optional[str]:
    m = _EMAIL_RE.search(text)
    return m.group(0).lower() if m else None


def _extract_phone(text: str) -> Optional[str]:
    m = _PHONE_RE.search(text)
    return m.group(0).strip() if m else None


def _extract_budget(text: str) -> Optional[float]:
    m = _BUDGET_RE.search(text)
    if not m:
        return None
    raw = m.group(1).replace(" ", "").replace(",", ".")
    try:
        val = float(raw)
        suffix = m.group(2).lower()
        if suffix in ("k", "K"):
            val *= 1000
        return val
    except ValueError:
        return None


def _extract_pax(text: str) -> Optional[int]:
    m = _PAX_RE.search(text)
    if m:
        try:
            return int(m.group(1))
        except ValueError:
            pass
    # fallback: look for "2 people" / "group of 12"
    m2 = re.search(r"group\s+of\s+(\d+)", text, re.IGNORECASE)
    if m2:
        return int(m2.group(1))
    return None


def _extract_country(text: str) -> Optional[str]:
    lower = text.lower()
    for kw, code in _COUNTRY_CODES.items():
        if kw in lower:
            return code
    return None


def _detect_language(text: str) -> str:
    lower = text.lower()
    scores: dict[str, int] = {lang: 0 for lang in _LANGUAGE_KEYWORDS}
    for lang, keywords in _LANGUAGE_KEYWORDS.items():
        for kw in keywords:
            if kw in lower:
                scores[lang] += 1
    best = max(scores, key=lambda k: scores[k])
    return best if scores[best] > 0 else "en"


def _detect_niche(text: str) -> Optional[str]:
    lower = text.lower()
    for niche, keywords in _NICHE_KEYWORDS.items():
        for kw in keywords:
            if kw in lower:
                return niche
    return None


def _extract_destinations(text: str) -> list[str]:
    lower = text.lower()
    found = []
    for dest in _DESTINATION_KEYWORDS:
        if dest in lower:
            found.append(dest.title())
    return list(dict.fromkeys(found))  # deduplicate preserving order


def _extract_dates(text: str) -> list[str]:
    found = []
    for m in _DATE_RE.finditer(text):
        try:
            day, month, year = int(m.group(1)), int(m.group(2)), int(m.group(3))
            if year < 100:
                year += 2000
            found.append(f"{year:04d}-{month:02d}-{day:02d}")
        except ValueError:
            pass
    return found[:2]  # at most 2 dates (start + end)


def _base_extract(text: str) -> dict[str, Any]:
    """Common extraction applied to any text block."""
    return {
        "extracted_email": _extract_email(text),
        "extracted_phone": _extract_phone(text),
        "extracted_country": _extract_country(text),
        "extracted_pax": _extract_pax(text),
        "extracted_budget": _extract_budget(text),
        "extracted_dates": _extract_dates(text),
        "extracted_destinations": _extract_destinations(text),
        "extracted_niche": _detect_niche(text),
        "extracted_language": _detect_language(text),
    }


# ── Channel parsers ───────────────────────────────────────────────────────────

def parse_email(raw: dict[str, Any]) -> dict[str, Any]:
    """Parse a raw M365 email webhook payload."""
    subject = raw.get("subject", "")
    body = raw.get("body", raw.get("bodyPreview", ""))
    from_addr = raw.get("from", raw.get("sender", ""))
    full_text = f"{subject}\n{body}"

    extracted = _base_extract(full_text)
    if not extracted["extracted_email"] and from_addr:
        extracted["extracted_email"] = _extract_email(from_addr)

    return {
        "source": "email",
        "subject": subject[:255] if subject else "Email sans sujet",
        "body": body[:4000],
        "raw_payload": raw,
        **extracted,
        "received_at": raw.get("receivedDateTime", datetime.now(timezone.utc).isoformat()),
    }


def parse_webform(payload: dict[str, Any]) -> dict[str, Any]:
    """Parse a stours.ma/contact webform submission."""
    name = payload.get("name", payload.get("nom", ""))
    email = payload.get("email", "")
    phone = payload.get("phone", payload.get("tel", ""))
    message = payload.get("message", payload.get("description", ""))
    destination = payload.get("destination", "")
    pax = payload.get("pax", payload.get("travelers", None))
    budget = payload.get("budget", None)
    dates_raw = payload.get("departure_date", payload.get("date_depart", ""))

    full_text = f"{name} {message} {destination}"
    extracted = _base_extract(full_text)

    if email:
        extracted["extracted_email"] = email
    if phone:
        extracted["extracted_phone"] = phone
    if pax:
        try:
            extracted["extracted_pax"] = int(pax)
        except (ValueError, TypeError):
            pass
    if budget:
        try:
            extracted["extracted_budget"] = float(str(budget).replace(",", "."))
        except (ValueError, TypeError):
            pass
    if destination:
        extracted["extracted_destinations"] = [destination] + extracted.get("extracted_destinations", [])

    return {
        "source": "webform",
        "subject": f"Webform — {name}" if name else "Webform submission",
        "body": message[:4000],
        "raw_payload": payload,
        **extracted,
        "received_at": payload.get("submitted_at", datetime.now(timezone.utc).isoformat()),
    }


def parse_whatsapp(message: dict[str, Any]) -> dict[str, Any]:
    """Parse a WhatsApp Business webhook message."""
    text = message.get("text", {})
    body = text.get("body", "") if isinstance(text, dict) else str(text)
    from_number = message.get("from", "")
    contact_name = (
        message.get("contacts", [{}])[0].get("profile", {}).get("name", "")
        if message.get("contacts") else ""
    )

    extracted = _base_extract(body)
    if from_number:
        extracted["extracted_phone"] = from_number

    return {
        "source": "whatsapp",
        "subject": f"WhatsApp — {contact_name or from_number}",
        "body": body[:4000],
        "raw_payload": message,
        **extracted,
        "received_at": message.get("timestamp", datetime.now(timezone.utc).isoformat()),
    }


def parse_instagram_dm(payload: dict[str, Any]) -> dict[str, Any]:
    """Parse an Instagram Direct Message webhook payload."""
    messaging = payload.get("entry", [{}])[0].get("messaging", [{}])[0]
    sender = messaging.get("sender", {}).get("id", "")
    message_data = messaging.get("message", {})
    body = message_data.get("text", "")

    extracted = _base_extract(body)

    return {
        "source": "instagram",
        "subject": f"Instagram DM — @{sender}",
        "body": body[:4000],
        "raw_payload": payload,
        **extracted,
        "received_at": datetime.now(timezone.utc).isoformat(),
    }


def parse_portal_b2b(payload: dict[str, Any]) -> dict[str, Any]:
    """Parse a lead from the B2B portal (portal.stours.ma)."""
    agency_name = payload.get("agency_name", payload.get("company", ""))
    contact_name = payload.get("contact_name", "")
    email = payload.get("email", "")
    phone = payload.get("phone", "")
    destination = payload.get("destination", "")
    pax = payload.get("pax", None)
    budget = payload.get("budget_eur", payload.get("budget", None))
    travel_dates = payload.get("travel_dates", "")
    notes = payload.get("notes", payload.get("message", ""))
    niche = payload.get("tour_type", payload.get("niche", None))

    full_text = f"{agency_name} {contact_name} {destination} {notes}"
    extracted = _base_extract(full_text)

    if email:
        extracted["extracted_email"] = email
    if phone:
        extracted["extracted_phone"] = phone
    if pax:
        try:
            extracted["extracted_pax"] = int(pax)
        except (ValueError, TypeError):
            pass
    if budget:
        try:
            extracted["extracted_budget"] = float(str(budget).replace(",", "."))
        except (ValueError, TypeError):
            pass
    if niche and niche in _NICHE_KEYWORDS:
        extracted["extracted_niche"] = niche
    if destination:
        extracted["extracted_destinations"] = [destination]

    return {
        "source": "portal_b2b",
        "subject": f"Portal B2B — {agency_name or contact_name}",
        "body": notes[:4000],
        "raw_payload": payload,
        **extracted,
        "received_at": payload.get("created_at", datetime.now(timezone.utc).isoformat()),
    }
