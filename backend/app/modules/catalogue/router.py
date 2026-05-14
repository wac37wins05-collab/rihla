"""Catalogue Premium router — H/R/A/G unified rich catalogue."""
from typing import Optional, Literal
from collections import Counter

from fastapi import APIRouter, Depends, HTTPException, Query, Body
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app.core.database import get_db
from app.modules.catalogue.models import CatalogueItem
from app.modules.catalogue.seed_data import HOTELS, RESTAURANTS, ACTIVITIES, GUIDES, all_seed_items

router = APIRouter(prefix="/catalogue", tags=["Catalogue Premium"])


# ─── Pydantic schemas ────────────────────────────────────────────────────────
class ItemOut(BaseModel):
    id: int
    kind: str
    slug: Optional[str] = None
    name: str
    city: str
    region: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    contact_name: Optional[str] = None
    category: Optional[str] = None
    stars: Optional[int] = None
    rating: float
    unit_cost: float
    currency: str
    cost_unit: str
    min_pax: int
    max_pax: Optional[int] = None
    single_supplement: Optional[float] = None
    specs: Optional[dict] = None
    short_description: Optional[str] = None
    description: Optional[str] = None
    cover_url: Optional[str] = None
    photos: Optional[list] = None
    tags: Optional[list] = None
    internal_note: Optional[str] = None
    partner_since: Optional[str] = None
    is_preferred: bool
    is_exclusive: bool
    status: str

    class Config:
        from_attributes = True


class ItemIn(BaseModel):
    kind: Literal["hotel", "restaurant", "activity", "guide"]
    name: str
    city: str
    region: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    contact_name: Optional[str] = None
    category: Optional[str] = None
    stars: Optional[int] = None
    rating: float = 4.5
    unit_cost: float = 0
    currency: str = "MAD"
    cost_unit: str = "per_pax"
    min_pax: int = 1
    max_pax: Optional[int] = None
    single_supplement: Optional[float] = None
    specs: Optional[dict] = Field(default_factory=dict)
    short_description: Optional[str] = None
    description: Optional[str] = ""
    cover_url: Optional[str] = None
    photos: Optional[list] = Field(default_factory=list)
    tags: Optional[list] = Field(default_factory=list)
    internal_note: Optional[str] = ""
    is_preferred: bool = False
    is_exclusive: bool = False
    status: str = "active"


def _to_out(it: CatalogueItem) -> dict:
    return {
        "id": it.id, "kind": it.kind, "slug": it.slug, "name": it.name,
        "city": it.city, "region": it.region, "address": it.address,
        "latitude": float(it.latitude) if it.latitude is not None else None,
        "longitude": float(it.longitude) if it.longitude is not None else None,
        "phone": it.phone, "email": it.email, "website": it.website,
        "contact_name": it.contact_name, "category": it.category,
        "stars": it.stars, "rating": float(it.rating),
        "unit_cost": float(it.unit_cost), "currency": it.currency,
        "cost_unit": it.cost_unit, "min_pax": it.min_pax, "max_pax": it.max_pax,
        "single_supplement": float(it.single_supplement) if it.single_supplement is not None else None,
        "specs": it.specs or {}, "short_description": it.short_description,
        "description": it.description or "", "cover_url": it.cover_url,
        "photos": it.photos or [], "tags": it.tags or [],
        "internal_note": it.internal_note or "",
        "partner_since": it.partner_since.isoformat() if it.partner_since else None,
        "is_preferred": bool(it.is_preferred), "is_exclusive": bool(it.is_exclusive),
        "status": it.status,
    }


# ─── Endpoints ───────────────────────────────────────────────────────────────
@router.get("/items")
def list_items(
    kind: Optional[str] = None,
    city: Optional[str] = None,
    category: Optional[str] = None,
    q: Optional[str] = None,
    preferred: Optional[bool] = None,
    status: str = "active",
    limit: int = Query(200, le=500),
    db: Session = Depends(get_db),
):
    qy = db.query(CatalogueItem).filter(CatalogueItem.status == status)
    if kind: qy = qy.filter(CatalogueItem.kind == kind)
    if city: qy = qy.filter(CatalogueItem.city == city)
    if category: qy = qy.filter(CatalogueItem.category == category)
    if preferred is not None: qy = qy.filter(CatalogueItem.is_preferred == preferred)
    if q:
        like = f"%{q}%"
        qy = qy.filter(or_(
            CatalogueItem.name.ilike(like),
            CatalogueItem.city.ilike(like),
            CatalogueItem.short_description.ilike(like),
            CatalogueItem.category.ilike(like),
        ))
    items = qy.order_by(CatalogueItem.is_preferred.desc(), CatalogueItem.rating.desc()).limit(limit).all()
    return [_to_out(it) for it in items]


@router.get("/items/{item_id}")
def get_item(item_id: int, db: Session = Depends(get_db)):
    it = db.get(CatalogueItem, item_id)
    if not it:
        raise HTTPException(404, "Item not found")
    return _to_out(it)


@router.post("/items", status_code=201)
def create_item(body: ItemIn, db: Session = Depends(get_db)):
    it = CatalogueItem(**body.model_dump())
    db.add(it); db.commit(); db.refresh(it)
    return _to_out(it)


@router.patch("/items/{item_id}")
def update_item(item_id: int, body: dict = Body(...), db: Session = Depends(get_db)):
    it = db.get(CatalogueItem, item_id)
    if not it:
        raise HTTPException(404, "Item not found")
    for k, v in body.items():
        if hasattr(it, k):
            setattr(it, k, v)
    db.commit(); db.refresh(it)
    return _to_out(it)


@router.delete("/items/{item_id}", status_code=204)
def delete_item(item_id: int, db: Session = Depends(get_db)):
    it = db.get(CatalogueItem, item_id)
    if not it:
        raise HTTPException(404, "Item not found")
    db.delete(it); db.commit()


@router.get("/stats")
def stats(db: Session = Depends(get_db)):
    items = db.query(CatalogueItem).filter(CatalogueItem.status == "active").all()
    if not items:
        return {"total": 0, "by_kind": {}, "by_city": {}, "by_category": {},
                "preferred": 0, "exclusive": 0, "avg_rating": 0,
                "price_ranges": {}, "regions": []}
    by_kind = Counter(i.kind for i in items)
    by_city = Counter(i.city for i in items)
    by_cat  = Counter(i.category for i in items if i.category)
    avg_rating = round(sum(float(i.rating) for i in items) / len(items), 2)
    by_region = Counter(i.region for i in items if i.region)
    price_ranges = {
        k: {
            "min":  min((float(i.unit_cost) for i in items if i.kind == k and i.unit_cost), default=0),
            "max":  max((float(i.unit_cost) for i in items if i.kind == k and i.unit_cost), default=0),
            "avg":  round(sum(float(i.unit_cost) for i in items if i.kind == k) / max(by_kind.get(k, 1), 1), 2),
        } for k in ["hotel", "restaurant", "activity", "guide"]
    }
    return {
        "total": len(items),
        "by_kind": dict(by_kind),
        "by_city": dict(by_city.most_common(15)),
        "by_category": dict(by_cat.most_common(15)),
        "preferred": sum(1 for i in items if i.is_preferred),
        "exclusive": sum(1 for i in items if i.is_exclusive),
        "avg_rating": avg_rating,
        "price_ranges": price_ranges,
        "regions": [{"name": r, "count": c} for r, c in by_region.most_common()],
    }


@router.get("/cities")
def list_cities(db: Session = Depends(get_db)):
    rows = (db.query(CatalogueItem.city, func.count(CatalogueItem.id))
              .filter(CatalogueItem.status == "active")
              .group_by(CatalogueItem.city)
              .order_by(func.count(CatalogueItem.id).desc()).all())
    return [{"city": r[0], "count": r[1]} for r in rows]


@router.post("/import-legacy")
def import_legacy(db: Session = Depends(get_db)):
    """Import existing hotels/guides/menus rows into catalogue_items.

    Dedup by (kind, normalized name+city). Safe to run multiple times — existing
    rows are updated rather than duplicated.
    """
    from sqlalchemy import text

    def _key(name: str, city: str) -> str:
        return f"{(name or '').strip().lower()}|{(city or '').strip().lower()}"

    existing_keys: dict[tuple[str, str], int] = {}
    for it in db.query(CatalogueItem).all():
        existing_keys[(it.kind, _key(it.name, it.city))] = it.id

    imported = {"hotel": 0, "guide": 0, "restaurant": 0}
    skipped = {"hotel": 0, "guide": 0, "restaurant": 0}

    def _has_table(name: str) -> bool:
        try:
            db.execute(text(f"SELECT 1 FROM {name} LIMIT 1"))
            return True
        except Exception:
            db.rollback()
            return False

    if _has_table("hotels"):
        rows = db.execute(text(
            "SELECT name, city, category, base_rate, single_supplement, currency,"
            " season, status, description, image_url, contact_name, contact_email"
            " FROM hotels"
        )).mappings().all()
        for r in rows:
            k = ("hotel", _key(r["name"], r["city"]))
            payload = dict(
                name=r["name"], city=r["city"], category=r.get("category"),
                unit_cost=float(r.get("base_rate") or 0),
                single_supplement=float(r.get("single_supplement") or 0) or None,
                currency=r.get("currency") or "MAD", cost_unit="per_night_dbl",
                short_description=r.get("description"), cover_url=r.get("image_url"),
                contact_name=r.get("contact_name"), email=r.get("contact_email"),
                status=(r.get("status") or "active"),
            )
            if k in existing_keys:
                row = db.get(CatalogueItem, existing_keys[k])
                for kk, vv in payload.items():
                    if vv not in (None, "", 0):
                        setattr(row, kk, vv)
                skipped["hotel"] += 1
            else:
                db.add(CatalogueItem(kind="hotel", **payload))
                imported["hotel"] += 1

    if _has_table("guides"):
        rows = db.execute(text(
            "SELECT name, email, phone, city, languages, specialty, rating,"
            " status, daily_rate, seniority, image_url, is_certified FROM guides"
        )).mappings().all()
        for r in rows:
            k = ("guide", _key(r["name"], r["city"]))
            langs = r.get("languages") or ""
            langs_list = [s.strip() for s in (langs.split(",") if isinstance(langs, str) else langs) if s and str(s).strip()]
            payload = dict(
                name=r["name"], city=r["city"], email=r.get("email"),
                phone=r.get("phone"), category=r.get("specialty"),
                rating=float(r.get("rating") or 4.5),
                unit_cost=float(r.get("daily_rate") or 0),
                cost_unit="per_day", currency="MAD",
                cover_url=r.get("image_url"),
                specs={"languages": langs_list, "years_experience": r.get("seniority"),
                       "certifications": ["officiel"] if r.get("is_certified") else []},
                status=(r.get("status") or "active"),
            )
            if k in existing_keys:
                row = db.get(CatalogueItem, existing_keys[k])
                for kk, vv in payload.items():
                    if vv not in (None, "", 0, []):
                        setattr(row, kk, vv)
                skipped["guide"] += 1
            else:
                db.add(CatalogueItem(kind="guide", **payload))
                imported["guide"] += 1

    if _has_table("menus"):
        rows = db.execute(text(
            "SELECT label, meal_type, category, city, restaurant_name, supplier_name,"
            " supplier_contact, unit_cost, currency, min_pax, max_pax, has_vegetarian"
            " FROM menus"
        )).mappings().all()
        for r in rows:
            resto = r.get("restaurant_name") or r.get("supplier_name") or r.get("label")
            k = ("restaurant", _key(resto, r["city"]))
            payload = dict(
                name=resto, city=r["city"], category=r.get("category"),
                contact_name=r.get("supplier_name"),
                phone=r.get("supplier_contact"),
                unit_cost=float(r.get("unit_cost") or 0),
                currency=r.get("currency") or "MAD",
                cost_unit="per_pax",
                min_pax=int(r.get("min_pax") or 1),
                max_pax=r.get("max_pax"),
                short_description=r.get("label"),
                specs={"meal_type": r.get("meal_type"),
                       "dietary": ["vegetarian"] if r.get("has_vegetarian") else []},
                status="active",
            )
            if k in existing_keys:
                row = db.get(CatalogueItem, existing_keys[k])
                for kk, vv in payload.items():
                    if vv not in (None, "", 0, []):
                        setattr(row, kk, vv)
                skipped["restaurant"] += 1
            else:
                db.add(CatalogueItem(kind="restaurant", **payload))
                imported["restaurant"] += 1

    db.commit()
    return {"ok": True, "imported": imported, "merged": skipped,
            "total_after": db.query(CatalogueItem).count()}


@router.post("/seed-rich")
def seed_rich(reset: bool = False, db: Session = Depends(get_db)):
    """Seed les ~90 items détaillés. `reset=true` supprime l'existant."""
    if reset:
        db.query(CatalogueItem).delete()
        db.commit()
    created = updated = 0
    for kind, payload in all_seed_items():
        slug = payload.get("slug")
        existing = db.query(CatalogueItem).filter_by(slug=slug).first() if slug else None
        if existing:
            for k, v in payload.items():
                setattr(existing, k, v)
            existing.kind = kind
            updated += 1
        else:
            it = CatalogueItem(kind=kind, **payload)
            db.add(it)
            created += 1
    db.commit()
    return {
        "ok": True, "created": created, "updated": updated,
        "totals": {"hotels": len(HOTELS), "restaurants": len(RESTAURANTS),
                   "activities": len(ACTIVITIES), "guides": len(GUIDES),
                   "total": len(HOTELS) + len(RESTAURANTS) + len(ACTIVITIES) + len(GUIDES)},
    }
