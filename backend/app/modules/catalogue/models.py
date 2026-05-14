"""Catalogue Premium — unified rich item store.

One `catalogue_items` table holds all 4 kinds (hotel | restaurant | activity | guide)
with type-specific extensions in `specs` JSON. Existing thin inventory tables
(hotels/guides/menus) remain untouched so legacy pages keep working.
"""
from datetime import date, datetime, timezone
from typing import Optional

from sqlalchemy import String, Text, Numeric, Integer, Boolean, JSON, DateTime, Date, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.models import Base, BaseMixin


class CatalogueItem(Base, BaseMixin):
    __tablename__ = "catalogue_items"

    # Type & identity
    kind: Mapped[str] = mapped_column(String(20), index=True)  # hotel | restaurant | activity | guide
    slug: Mapped[Optional[str]] = mapped_column(String(120), unique=True, nullable=True)
    name: Mapped[str] = mapped_column(String(200))

    # Location
    city: Mapped[str] = mapped_column(String(100), index=True)
    region: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    latitude: Mapped[Optional[float]] = mapped_column(Numeric(10, 6), nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Numeric(10, 6), nullable=True)

    # Contact
    phone: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    website: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    contact_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)

    # Identity / classification
    category: Mapped[Optional[str]] = mapped_column(String(80), index=True, nullable=True)
    # hotel: "5* Palace" / "5*" / "Riad 4*" / "Boutique 4*" / "Camp luxe" …
    # restaurant: "gastronomique" / "traditionnel" / "rooftop" / "show cooking" …
    # activity: "culturelle" / "aventure" / "bien-être" / "gastronomique" / "famille" …
    # guide: "culturel" / "désert" / "montagne" / "tour-leader" …
    stars: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # 1-5 (hotels)
    rating: Mapped[float] = mapped_column(Numeric(3, 2), default=4.5)     # internal score 0-5

    # Pricing
    unit_cost: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    currency: Mapped[str] = mapped_column(String(8), default="MAD")
    cost_unit: Mapped[str] = mapped_column(String(30), default="per_pax")
    # per_pax | per_night_dbl | per_night_sgl | per_day | per_group | per_event | per_hour
    min_pax: Mapped[int] = mapped_column(Integer, default=1)
    max_pax: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    single_supplement: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)

    # Type-specific specs (JSON blob)
    specs: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    # hotel: {room_types[], amenities[], stars, breakfast_included, pool, spa, has_restaurant, season_high}
    # restaurant: {cuisine, ambiance, signature_dishes[], has_terrace, dress_code, dietary[]}
    # activity: {duration_hours, difficulty, age_min, group_size, includes[], best_season}
    # guide: {languages[], specialties[], years_experience, certifications[], regions[]}

    # Description & media
    short_description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, default="")
    cover_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    photos: Mapped[Optional[list]] = mapped_column(JSON, default=list)  # [{url, caption}]
    tags: Mapped[Optional[list]] = mapped_column(JSON, default=list)

    # S'TOURS internal context
    internal_note: Mapped[Optional[str]] = mapped_column(Text, default="")
    partner_since: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    last_audit_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    is_preferred: Mapped[bool] = mapped_column(Boolean, default=False)
    is_exclusive: Mapped[bool] = mapped_column(Boolean, default=False)

    # Status
    status: Mapped[str] = mapped_column(String(20), default="active")  # active | paused | archived

    __table_args__ = (
        Index("idx_catalogue_kind_city", "kind", "city"),
        Index("idx_catalogue_status_kind", "status", "kind"),
    )
