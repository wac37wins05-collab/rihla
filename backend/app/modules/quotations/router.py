"""Quotation endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.projects.models import Project
from app.modules.quotations.models import Quotation
from app.modules.quotations.schemas import (
    QuotationCreate, QuotationUpdate, QuotationResponse,
    QuotationLineCreate, QuotationLineResponse, QuotationRecalcResponse
)
from app.modules.quotations.service import QuotationService
from app.shared.dependencies import require_auth, get_tenant_id

router = APIRouter(prefix="/quotations", tags=["quotations"], dependencies=[Depends(require_auth)])


# ── Tenant helpers ────────────────────────────────────────────────────────────

def _get_project_for_tenant(project_id: str, company_id: str, db: Session) -> Project:
    """Load a Project and assert it belongs to the caller's company."""
    project = db.execute(
        select(Project).where(Project.id == project_id, Project.active == True)
    ).scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Dossier introuvable.")
    if project.company_id and project.company_id != company_id:
        raise HTTPException(status_code=403, detail="Accès refusé à ce dossier.")
    return project


def _assert_quotation_tenant(quotation_id: str, company_id: str, db: Session) -> Quotation:
    """Load a Quotation and verify its parent project belongs to the caller's company."""
    row = db.execute(
        select(Quotation, Project.company_id)
        .join(Project, Project.id == Quotation.project_id)
        .where(Quotation.id == quotation_id, Quotation.active == True)
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Cotation introuvable.")
    quotation, proj_company_id = row
    if proj_company_id and proj_company_id != company_id:
        raise HTTPException(status_code=403, detail="Accès refusé à cette cotation.")
    return quotation


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.post("/", response_model=QuotationResponse, status_code=201)
def create_quotation(
    data: QuotationCreate,
    db: Session = Depends(get_db),
    company_id: str = Depends(get_tenant_id),
):
    _get_project_for_tenant(data.project_id, company_id, db)
    return QuotationService(db).create(data)


@router.get("/{quotation_id}", response_model=QuotationResponse)
def get_quotation(
    quotation_id: str,
    db: Session = Depends(get_db),
    company_id: str = Depends(get_tenant_id),
):
    _assert_quotation_tenant(quotation_id, company_id, db)
    return QuotationService(db).get(quotation_id)


@router.put("/{quotation_id}", response_model=QuotationResponse)
def update_quotation(
    quotation_id: str,
    data: QuotationUpdate,
    db: Session = Depends(get_db),
    company_id: str = Depends(get_tenant_id),
):
    _assert_quotation_tenant(quotation_id, company_id, db)
    return QuotationService(db).update(quotation_id, data)


@router.delete("/{quotation_id}", status_code=204)
def delete_quotation(
    quotation_id: str,
    db: Session = Depends(get_db),
    company_id: str = Depends(get_tenant_id),
):
    _assert_quotation_tenant(quotation_id, company_id, db)
    QuotationService(db).delete(quotation_id)


@router.post("/{quotation_id}/lines", response_model=QuotationLineResponse, status_code=201)
def add_line(
    quotation_id: str,
    data: QuotationLineCreate,
    db: Session = Depends(get_db),
    company_id: str = Depends(get_tenant_id),
):
    _assert_quotation_tenant(quotation_id, company_id, db)
    return QuotationService(db).add_line(quotation_id, data)


@router.post("/{quotation_id}/recalculate", response_model=QuotationRecalcResponse)
def recalculate(
    quotation_id: str,
    pax: int = Query(default=20, ge=1, le=500),
    db: Session = Depends(get_db),
    company_id: str = Depends(get_tenant_id),
):
    _assert_quotation_tenant(quotation_id, company_id, db)
    return QuotationService(db).recalculate(quotation_id, pax)

# ══════════════════════════════════════════════════════════════════
# NEW PRICING ENGINE — spec DMC avancée (multi-ranges, transport ceil)
# ══════════════════════════════════════════════════════════════════

from typing import Optional
from app.modules.quotations.pricing_engine import (
    calculate_quotation as engine_calculate,
    calculate_range as engine_calculate_range,
)


class PaxRange(BaseModel):
    min:   int       = Field(..., ge=1, description="Min pax (base du calcul)")
    max:   Optional[int] = None
    label: Optional[str] = None


class PricingCalcRequest(BaseModel):
    ranges:     list[PaxRange]
    services:   list[dict]        # format libre; voir pricing_engine.py
    margin_pct: float = Field(default=0, ge=0, le=100)
    currency:   str   = "EUR"


@router.post("/engine/calculate",
             summary="Calcul multi-ranges avec règles DMC avancées")
def engine_calc(data: PricingCalcRequest):
    """Moteur déterministe avancé :
       - calcul sur MIN pax (jamais max)
       - transport : ceil(min_pax / capacity) × price × days
       - hôtel : price / occupancy divisor × nights
       - taxi 3/7 places · 4×4 capacité 4
       - multi-ranges avec comparaison automatique
    """
    result = engine_calculate(
        ranges=[r.model_dump() for r in data.ranges],
        services=data.services,
        margin_pct=data.margin_pct,
        currency=data.currency,
    )
    return {"success": True, "data": result}


@router.post("/engine/calculate-range",
             summary="Calcul pour UNE seule plage (aperçu temps réel)")
def engine_calc_single(
    min_pax: int = Query(..., ge=1),
    max_pax: Optional[int] = None,
    margin_pct: float = Query(default=0, ge=0, le=100),
    currency: str = Query(default="EUR"),
    services: list[dict] = None,
):
    """Utile pour les aperçus live pendant l'édition."""
    r = engine_calculate_range(
        min_pax=min_pax,
        max_pax=max_pax,
        services=services or [],
        margin_pct=margin_pct,
        currency=currency,
    )
    return {"success": True, "data": r.to_dict()}


@router.get("/engine/presets",
            summary="Listes de référence (capacités véhicules, occupancies…)")
def engine_presets():
    from app.modules.quotations.pricing_engine import (
        DEFAULT_CAPACITY, OCCUPANCY_DIVISOR,
    )
    return {
        "occupancies": [
            {"value": k, "label": k.capitalize(), "divisor": v}
            for k, v in OCCUPANCY_DIVISOR.items()
        ],
        "vehicle_capacities": [
            {"label": "Petit taxi",       "capacity": 3},
            {"label": "Grand taxi",       "capacity": 7},
            {"label": "4×4 / SUV",        "capacity": 4},
            {"label": "Minivan",          "capacity": 8},
            {"label": "Minibus 17 pl.",   "capacity": 17},
            {"label": "Minibus 25 pl.",   "capacity": 25},
            {"label": "Autocar 35 pl.",   "capacity": 35},
            {"label": "Autocar 48 pl.",   "capacity": 48},
            {"label": "Autocar 55 pl.",   "capacity": 55},
        ],
        "categories": [
            {"value": "hotel",        "label": "🏨 Hôtel"},
            {"value": "transport",    "label": "🚌 Transport"},
            {"value": "guide",        "label": "🧭 Guide"},
            {"value": "activity",     "label": "🎭 Activité"},
            {"value": "monument",     "label": "🏛 Monument"},
            {"value": "taxi",         "label": "🚕 Taxi"},
            {"value": "four_by_four", "label": "🚙 4×4"},
            {"value": "misc",         "label": "📦 Divers"},
        ],
        "currencies": ["EUR", "USD", "GBP", "MAD"],
    }


# ══════════════════════════════════════════════════════════════════
# SIMULATE CIRCUIT — Endpoint haut niveau pour le simulateur frontend
# ══════════════════════════════════════════════════════════════════

class CircuitDay(BaseModel):
    day: int
    hotel: str = ""
    formula: str = "BB"  # BB / HB / FB
    half_dbl: float = 0  # Prix chambre double / 2 (par pax)
    single_sup: float = 0
    city_tax: float = 0
    water: float = 0
    restaurant: str = ""
    rest_price: float = 0
    monument: str = ""
    monu_price: float = 0
    local_guide: float = 0

class CircuitVariableCost(BaseModel):
    key: str           # ex: "bus", "guide", "taxi_chef"
    label: str         # ex: "Autocar 48 places"
    total_group: float # coût total pour le groupe entier

class SimulateCircuitRequest(BaseModel):
    days: list[CircuitDay]
    variable_costs: list[CircuitVariableCost]
    margin_pct: float = Field(default=8, ge=0, le=100)
    currency: str = "MAD"
    pax_tiers: list[int] = Field(default=[10, 15, 20, 25, 30, 35])
    exchange_rate: float = Field(default=10.1, description="MAD per 1 USD")


@router.post("/engine/simulate-circuit",
             summary="Simulateur haut niveau — circuit jour-par-jour → grille PAX")
def simulate_circuit(data: SimulateCircuitRequest):
    """
    Transforme un itinéraire jour-par-jour + coûts variables en
    une grille de prix multi-ranges utilisant le pricing_engine.

    Le frontend envoie les données brutes du circuit,
    le backend fait TOUS les calculs et renvoie la grille complète.
    """
    # 1. Construire les services depuis les jours
    services: list[dict] = []

    # Hôtels : chaque nuit = 1 service
    for d in data.days:
        if d.half_dbl > 0:
            services.append({
                "id": f"htl-{d.day}",
                "category": "hotel",
                "name": f"{d.hotel} (J{d.day})",
                "price_per_room": d.half_dbl * 2,  # reconvertir en prix chambre
                "occupancy": "double",
                "nights": 1,
            })

    # Restaurants : chaque repas = 1 service misc per_person
    for d in data.days:
        if d.rest_price > 0:
            services.append({
                "id": f"rst-{d.day}",
                "category": "misc",
                "name": f"{d.restaurant} (J{d.day})",
                "price": d.rest_price,
            })

    # Monuments
    for d in data.days:
        if d.monu_price > 0:
            services.append({
                "id": f"mon-{d.day}",
                "category": "monument",
                "name": f"{d.monument} (J{d.day})",
                "price": d.monu_price,
                "pricing_mode": "per_person",
            })

    # Taxes
    total_tax = sum(d.city_tax for d in data.days)
    if total_tax > 0:
        services.append({
            "id": "tax-total",
            "category": "misc",
            "name": "Taxes de séjour",
            "price": total_tax,
        })

    # Eau
    total_water = sum(d.water for d in data.days)
    if total_water > 0:
        services.append({
            "id": "water-total",
            "category": "misc",
            "name": "Eau minérale",
            "price": total_water,
        })

    # Guides locaux (fixe per pax)
    total_lg = sum(d.local_guide for d in data.days)
    if total_lg > 0:
        services.append({
            "id": "lg-total",
            "category": "misc",
            "name": "Guides locaux",
            "price": total_lg,
        })

    # 2. Ajouter les coûts variables comme des services "guide" ou "transport"
    for vc in data.variable_costs:
        if vc.key == "bus":
            services.append({
                "id": f"var-{vc.key}",
                "category": "transport",
                "name": vc.label,
                "price_per_vehicle": vc.total_group,
                "vehicle_capacity": 999,  # 1 seul véhicule (forfait)
                "days": 1,
            })
        else:
            services.append({
                "id": f"var-{vc.key}",
                "category": "guide",
                "name": vc.label,
                "daily_cost": vc.total_group,
                "days": 1,
            })

    # 3. Construire les ranges
    ranges = [{"min": p, "max": p, "label": f"{p} pax"} for p in data.pax_tiers]

    # 4. Calculer via le moteur
    result = engine_calculate(
        ranges=ranges,
        services=services,
        margin_pct=data.margin_pct,
        currency=data.currency,
    )

    # 5. Calculer le supplément single total
    single_total = sum(d.single_sup for d in data.days)

    # 6. Enrichir avec USD et single
    grid = []
    for r_item in result["ranges"]:
        grid.append({
            "pax": r_item["range_min"],
            "cost_per_pax": r_item["cost_per_person"],
            "selling_per_pax": r_item["selling_per_person"],
            "margin_per_pax": r_item["margin_per_pax"],
            "total_group": r_item["selling_total_group"],
            "usd_per_pax": round(r_item["selling_per_person"] / data.exchange_rate, 2),
            "by_category": r_item["by_category"],
            "warnings": r_item["warnings"],
        })

    # Summary metrics based on the first range
    first_r = result["ranges"][0] if result["ranges"] else {}
    fixed_pp = sum(first_r.get("by_category", {}).get(c, 0) for c in ["hotel", "misc", "monument"])
    var_grp  = sum(first_r.get("by_category", {}).get(c, 0) for c in ["transport", "guide"]) * (first_r.get("range_min") or 1)

    return {
        "success": True,
        "data": {
            "grid": grid,
            "single_supplement": single_total,
            "fixed_per_pax": round(fixed_pp, 2),
            "variable_group": round(var_grp, 2),
            "summary": result["summary"],
            "currency": data.currency,
            "exchange_rate": data.exchange_rate,
        },
    }


# ── Send email ────────────────────────────────────────────────────────────────

class SendEmailRequest(BaseModel):
    recipient_email: str
    recipient_name: str = ""
    message: str = ""
    language: str = "fr"


@router.post("/{quotation_id}/send-email", summary="Send quotation by email")
def send_quotation_email(
    quotation_id: str,
    data: SendEmailRequest,
    db: Session = Depends(get_db),
    company_id: str = Depends(get_tenant_id),
):
    """Send the quotation to a client by email.

    In demo / dev mode (no SMTP configured), returns a preview of what
    would be sent without actually delivering the message.
    """
    import os

    quotation = _assert_quotation_tenant(quotation_id, company_id, db)

    # Get a human-readable reference (use project name if available)
    try:
        project_name = quotation.project.name if quotation.project else quotation_id
    except Exception:
        project_name = quotation_id
    ref_label = f"{project_name} (v{getattr(quotation, 'version', 1)})"

    # Build subject
    subject_fr = f"Votre devis S'TOURS — {ref_label}"
    subject_en = f"Your S'TOURS quotation — {ref_label}"
    subject = subject_fr if data.language != "en" else subject_en

    # Build body
    greeting = f"Bonjour {data.recipient_name}," if data.language != "en" else f"Dear {data.recipient_name},"
    body_lines = [
        greeting,
        "",
        data.message or (
            "Veuillez trouver ci-joint votre devis S'TOURS DMC Maroc."
            if data.language != "en" else
            "Please find attached your S'TOURS DMC Morocco quotation."
        ),
        "",
        f"Référence : {quotation_id}",
        f"Montant estimé : {quotation.total_selling or '–'} {quotation.currency or 'EUR'}",
        "",
        "Cordialement," if data.language != "en" else "Kind regards,",
        "L'équipe S'TOURS",
    ]
    body = "\n".join(body_lines)

    smtp_host = os.getenv("SMTP_HOST", "")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASSWORD", "")
    from_email = os.getenv("FROM_EMAIL", "noreply@stours.ma")

    demo_mode = not (smtp_host and smtp_user and smtp_pass)

    if not demo_mode:
        try:
            import smtplib
            from email.mime.text import MIMEText
            msg = MIMEText(body, "plain", "utf-8")
            msg["Subject"] = subject
            msg["From"] = from_email
            msg["To"] = data.recipient_email
            with smtplib.SMTP(smtp_host, smtp_port) as srv:
                srv.starttls()
                srv.login(smtp_user, smtp_pass)
                srv.sendmail(from_email, [data.recipient_email], msg.as_string())
        except Exception as e:
            raise HTTPException(500, f"Email sending failed: {e}")

    return {
        "sent": not demo_mode,
        "demo_mode": demo_mode,
        "recipient": data.recipient_email,
        "subject": subject,
        "body_preview": body[:200],
        "message": (
            "Email envoyé avec succès." if not demo_mode
            else "Mode démo — aucun SMTP configuré. Configurez SMTP_HOST/SMTP_USER/SMTP_PASSWORD dans .env pour activer l'envoi réel."
        ),
    }


# ── What-if simulation ────────────────────────────────────────────────────────

class WhatIfRequest(BaseModel):
    pax: int = 20
    margin_pct: float = 18.0
    exchange_rate: float = 10.8   # EUR→MAD or any pair
    currency: str = "EUR"


@router.post("/{quotation_id}/what-if", summary="What-if price simulation")
def what_if_simulation(
    quotation_id: str,
    data: WhatIfRequest,
    db: Session = Depends(get_db),
    company_id: str = Depends(get_tenant_id),
):
    """Simulate price impact of changing PAX, margin or exchange rate.

    Uses the stored quotation lines to compute a quick estimate without
    persisting anything.
    """
    quotation = _assert_quotation_tenant(quotation_id, company_id, db)

    # Sum raw costs from lines
    total_cost_raw = float(quotation.total_cost or 0)

    if total_cost_raw == 0:
        # No lines yet — use a rough estimate from total_selling if available
        total_cost_raw = float(quotation.total_selling or 0) / (1 + (quotation.margin_pct or 18) / 100)

    if total_cost_raw == 0:
        raise HTTPException(400, "Aucune donnée de coût disponible. Ajoutez des lignes et recalculez d'abord.")

    # Re-compute with new PAX
    # total_cost_raw is the total group cost; dividing by pax gives per-person cost
    cost_per_pax = total_cost_raw / max(data.pax, 1)

    # Apply margin
    sell_per_pax = round(cost_per_pax * (1 + data.margin_pct / 100), 2)

    # Group totals
    total_selling = round(sell_per_pax * data.pax, 2)
    margin_amount = round((sell_per_pax - cost_per_pax) * data.pax, 2)
    group_revenue = total_selling

    # Exchange rate conversion (to secondary currency)
    sell_converted = round(sell_per_pax * data.exchange_rate, 2)

    return {
        "pax": data.pax,
        "margin_pct": data.margin_pct,
        "exchange_rate": data.exchange_rate,
        "currency": data.currency,
        "cost_per_pax": round(cost_per_pax, 2),
        "sell_per_pax": sell_per_pax,
        "sell_converted": sell_converted,
        "total_selling": total_selling,
        "margin_amount": margin_amount,
        "margin_pct": data.margin_pct,
        "group_revenue": group_revenue,
    }
