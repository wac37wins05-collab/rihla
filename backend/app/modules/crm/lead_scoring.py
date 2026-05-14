"""Lead scoring — DMC-tourism weighted rules (0-100).

score_lead(lead_data) → (score: int, breakdown: dict)
assign_owner(lead_data, db, company_id) → user_id or None
"""
from __future__ import annotations
from datetime import date, datetime
from typing import Any, Optional
from sqlalchemy.orm import Session

COUNTRY_WEIGHTS: dict[str, int] = {
    "US": 20, "UK": 20, "AU": 18, "CA": 15,
    "DE": 15, "CH": 15, "NL": 12, "BE": 12,
    "FR": 12, "IT": 10, "ES": 10, "JP": 12,
    "MA": 5,  "DZ": 4,  "TN": 4,
}
SOURCE_WEIGHTS: dict[str, int] = {
    "referral": 15, "portal_b2b": 12, "webform": 10,
    "email": 8, "instagram": 5, "whatsapp": 5, "salon": 8,
}
NICHE_WEIGHTS: dict[str, int] = {
    "luxury": 20, "mice": 20, "honeymoon": 15,
    "adventure": 12, "family": 10, "cultural": 8,
}
HIGH_SEASON_MONTHS = {10, 11, 12, 1, 2, 3, 4, 5}
LOW_SEASON_MONTHS  = {7, 8}


def _season_weight(departure_dates: list[str]) -> int:
    if not departure_dates:
        return 0
    try:
        d = datetime.strptime(departure_dates[0], "%Y-%m-%d")
        if d.month in HIGH_SEASON_MONTHS:
            return 15
        if d.month in LOW_SEASON_MONTHS:
            return -10
        return 5
    except (ValueError, IndexError):
        return 0


def _lead_time_weight(departure_dates: list[str]) -> int:
    if not departure_dates:
        return 0
    try:
        dep = datetime.strptime(departure_dates[0], "%Y-%m-%d").date()
        days = (dep - date.today()).days
        if days >= 90:  return 15
        if days >= 60:  return 10
        if days >= 30:  return 5
        if days >= 14:  return 0
        return -10
    except (ValueError, IndexError):
        return 0


def _budget_weight(budget: Optional[float]) -> int:
    if budget is None:
        return 0
    if budget > 10000: return 20
    if budget > 5000:  return 10
    if budget > 2000:  return 5
    return 0


def score_lead(lead_data: dict[str, Any], db: Optional[Session] = None) -> tuple[int, dict[str, int]]:
    """Compute lead score (0-100) and per-criteria breakdown."""
    breakdown: dict[str, int] = {}
    breakdown["base"] = 50

    country = lead_data.get("extracted_country")
    breakdown["country"] = COUNTRY_WEIGHTS.get(country or "", 0)

    breakdown["budget"] = _budget_weight(lead_data.get("extracted_budget"))

    departure_dates = lead_data.get("extracted_dates", [])
    breakdown["season"] = _season_weight(departure_dates)
    breakdown["lead_time"] = _lead_time_weight(departure_dates)

    niche = lead_data.get("extracted_niche")
    breakdown["niche"] = NICHE_WEIGHTS.get(niche or "", 0)

    source = lead_data.get("source", "email")
    breakdown["source"] = SOURCE_WEIGHTS.get(source, 0)

    repeat_w = 0
    if db is not None:
        email = lead_data.get("extracted_email")
        if email:
            try:
                from app.modules.crm.models import CrmAccount
                existing = (
                    db.query(CrmAccount)
                    .filter(CrmAccount.primary_email == email, CrmAccount.active == True)
                    .first()
                )
                if existing and (existing.trips_count or 0) >= 1:
                    repeat_w = 20
            except Exception:
                pass
    breakdown["repeat_customer"] = repeat_w

    total = sum(breakdown.values())
    return max(0, min(100, total)), breakdown


def assign_owner(lead_data: dict[str, Any], db: Session, company_id: str) -> Optional[str]:
    """Auto-assign lead to agent with matching language + lowest workload."""
    language = lead_data.get("extracted_language", "en")
    try:
        from app.modules.crm.models import CrmDeal
        from app.modules.auth.models import User  # type: ignore
        agents = (
            db.query(User)
            .filter(User.company_id == company_id, User.is_active == True)
            .all()
        )
        if not agents:
            return None
        lang_agents = [a for a in agents if getattr(a, "preferred_language", None) == language]
        pool = lang_agents if lang_agents else agents

        def open_count(agent) -> int:
            return db.query(CrmDeal).filter(
                CrmDeal.company_id == company_id,
                CrmDeal.owner_user_id == str(agent.id),
                CrmDeal.stage.in_(["qualification", "proposal", "negotiation"]),
                CrmDeal.active == True,
            ).count()

        return str(min(pool, key=open_count).id)
    except Exception:
        return None


DEMO_LEADS = [
    {"source": "email", "subject": "Luxury Morocco trip for 2 adults - Oct 2026",
     "body": "Looking for exclusive 10-night luxury Morocco circuit. Budget 15000 EUR. Marrakech, Fes, Sahara.",
     "extracted_email": "james.smith@luxtravel.co.uk", "extracted_country": "UK",
     "extracted_pax": 2, "extracted_budget": 15000.0, "extracted_dates": ["2026-10-15"],
     "extracted_destinations": ["Marrakech", "Fes", "Sahara"], "extracted_niche": "luxury",
     "extracted_language": "en"},
    {"source": "webform", "subject": "Webform — Sarah Johnson (honeymoon)",
     "body": "Planning honeymoon Morocco October 2026. Budget 12000 USD for 2 people.",
     "extracted_email": "sarah.j@outlook.com", "extracted_country": "US",
     "extracted_pax": 2, "extracted_budget": 11000.0, "extracted_dates": ["2026-10-20"],
     "extracted_destinations": ["Chefchaouen", "Marrakech"], "extracted_niche": "honeymoon",
     "extracted_language": "en"},
    {"source": "portal_b2b", "subject": "Portal B2B — Wanderlust Travel GmbH (MICE 35 pax)",
     "body": "MICE incentive trip for 35 executives. Budget 50000 EUR. November 2026.",
     "extracted_email": "groups@wanderlust.de", "extracted_country": "DE",
     "extracted_pax": 35, "extracted_budget": 50000.0, "extracted_dates": ["2026-11-05"],
     "extracted_destinations": ["Atlas", "Marrakech"], "extracted_niche": "mice",
     "extracted_language": "de"},
    {"source": "referral", "subject": "Référencement — Voyages Lumière Paris",
     "body": "Circuit luxe Maroc novembre 2026. 4 adultes, budget 20000 EUR.",
     "extracted_email": "reservations@voyages-lumiere.fr", "extracted_country": "FR",
     "extracted_pax": 4, "extracted_budget": 20000.0, "extracted_dates": ["2026-11-12"],
     "extracted_destinations": ["Marrakech", "Essaouira"], "extracted_niche": "luxury",
     "extracted_language": "fr"},
    {"source": "instagram", "subject": "Instagram DM — @adventure_aus_couple",
     "body": "Hi! 2 people Australia, 7-day adventure Morocco December 2026. Budget 4000 AUD.",
     "extracted_email": None, "extracted_country": "AU",
     "extracted_pax": 2, "extracted_budget": 2500.0, "extracted_dates": ["2026-12-01"],
     "extracted_destinations": ["Sahara", "Merzouga"], "extracted_niche": "adventure",
     "extracted_language": "en"},
    {"source": "email", "subject": "Family vacation Morocco April 2027",
     "body": "4 adults 2 children April 2027. Budget 8000 EUR.",
     "extracted_email": "family.mueller@gmx.de", "extracted_country": "DE",
     "extracted_pax": 6, "extracted_budget": 8000.0, "extracted_dates": ["2027-04-05"],
     "extracted_destinations": ["Marrakech", "Atlas"], "extracted_niche": "family",
     "extracted_language": "de"},
    {"source": "whatsapp", "subject": "WhatsApp — Grupo España 8 pax",
     "body": "Grupo 8 personas España viaje cultural Marruecos marzo 2026. Presupuesto 6000 EUR.",
     "extracted_email": None, "extracted_phone": "+34612345678", "extracted_country": "ES",
     "extracted_pax": 8, "extracted_budget": 6000.0, "extracted_dates": ["2026-03-15"],
     "extracted_destinations": ["Fes", "Meknes"], "extracted_niche": "cultural",
     "extracted_language": "es"},
    {"source": "webform", "subject": "Webform — Marco Bianchi Italy",
     "body": "Viaggio culturale Marocco aprile 2026 per 3 persone. Budget 5000 EUR.",
     "extracted_email": "m.bianchi@gmail.it", "extracted_country": "IT",
     "extracted_pax": 3, "extracted_budget": 5000.0, "extracted_dates": ["2026-04-10"],
     "extracted_destinations": ["Fes", "Rabat"], "extracted_niche": "cultural",
     "extracted_language": "fr"},
    {"source": "portal_b2b", "subject": "Portal B2B — Horizon Travel Canada",
     "body": "Group 20 pax Canada. Adventure Morocco November 2026. Budget 18000 CAD.",
     "extracted_email": "ops@horizontravel.ca", "extracted_country": "CA",
     "extracted_pax": 20, "extracted_budget": 13000.0, "extracted_dates": ["2026-11-20"],
     "extracted_destinations": ["Sahara", "Atlas", "Marrakech"], "extracted_niche": "adventure",
     "extracted_language": "en"},
    {"source": "webform", "subject": "Webform — Mohammed Alami Casablanca",
     "body": "Circuit week-end Marrakech 2 personnes juin 2026. Budget 3000 MAD.",
     "extracted_email": "m.alami@gmail.com", "extracted_country": "MA",
     "extracted_pax": 2, "extracted_budget": 280.0, "extracted_dates": ["2026-06-20"],
     "extracted_destinations": ["Marrakech"], "extracted_niche": None,
     "extracted_language": "fr"},
    {"source": "instagram", "subject": "Instagram DM — local inquiry",
     "body": "Salam, c'est quoi le prix pour Marrakech samedi?",
     "extracted_email": None, "extracted_country": "MA",
     "extracted_pax": None, "extracted_budget": None, "extracted_dates": [],
     "extracted_destinations": ["Marrakech"], "extracted_niche": None,
     "extracted_language": "fr"},
    {"source": "email", "subject": "info request",
     "body": "Hi, what do you offer?",
     "extracted_email": "unknown@test.com", "extracted_country": None,
     "extracted_pax": None, "extracted_budget": None, "extracted_dates": [],
     "extracted_destinations": [], "extracted_niche": None,
     "extracted_language": "en"},
]
def seed_demo_leads(db: Session, company_id: str) -> int:
    """Insert DEMO_LEADS into the database for a company."""
    from app.modules.crm.models import CrmLead
    import uuid

    count = 0
    for data in DEMO_LEADS:
        # Score and assign
        score, breakdown = score_lead(data, db=db)
        owner_id = assign_owner(data, db, company_id)

        lead = CrmLead(
            id=str(uuid.uuid4()),
            company_id=company_id,
            source=data["source"],
            subject=data.get("subject"),
            body=data.get("body"),
            raw_payload=data,
            extracted_email=data.get("extracted_email"),
            extracted_phone=data.get("extracted_phone"),
            extracted_country=data.get("extracted_country"),
            extracted_pax=data.get("extracted_pax"),
            extracted_budget=data.get("extracted_budget"),
            extracted_dates=data.get("extracted_dates"),
            extracted_destinations=data.get("extracted_destinations"),
            extracted_niche=data.get("extracted_niche"),
            extracted_language=data.get("extracted_language"),
            score=score,
            score_breakdown=breakdown,
            status="new",
            assigned_to_user_id=owner_id,
            received_at=datetime.now(),
        )
        db.add(lead)
        count += 1
    db.commit()
    return count
