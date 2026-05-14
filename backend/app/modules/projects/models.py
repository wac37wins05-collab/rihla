"""Project models — Central entity linking all components."""

from enum import Enum
from typing import Optional
from sqlalchemy import String, Text, Integer, Numeric, JSON, Index, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.models import Base, BaseMixin


class ProjectStatus(str, Enum):
    DRAFT = "draft"
    IN_PROGRESS = "in_progress"
    VALIDATED = "validated"
    SENT = "sent"
    WON = "won"
    LOST = "lost"


class ProjectType(str, Enum):
    INCENTIVE = "incentive"
    LEISURE = "leisure"
    MICE = "mice"
    FIT = "fit"
    LUXURY = "luxury"
    ADVENTURE = "adventure"
    CULTURAL = "cultural"


class Project(Base, BaseMixin):
    """Central project entity — source of truth for all outputs."""

    __tablename__ = "projects"

    name: Mapped[str] = mapped_column(String(300), nullable=False, index=True)
    reference: Mapped[Optional[str]] = mapped_column(String(100), unique=True, index=True)
    client_name: Mapped[Optional[str]] = mapped_column(String(200))
    client_email: Mapped[Optional[str]] = mapped_column(String(255))
    status: Mapped[ProjectStatus] = mapped_column(String(50), default=ProjectStatus.DRAFT, index=True)
    project_type: Mapped[Optional[ProjectType]] = mapped_column(String(50))
    destination: Mapped[Optional[str]] = mapped_column(String(200))
    duration_days: Mapped[Optional[int]] = mapped_column(Integer)
    duration_nights: Mapped[Optional[int]] = mapped_column(Integer)
    pax_count: Mapped[Optional[int]] = mapped_column(Integer)
    travel_dates: Mapped[Optional[str]] = mapped_column(String(200))
    language: Mapped[str] = mapped_column(String(10), default="fr")
    currency: Mapped[str] = mapped_column(String(10), default="EUR")
    notes: Mapped[Optional[str]] = mapped_column(Text)
    tags: Mapped[Optional[dict]] = mapped_column(JSON)
    cover_image_url: Mapped[Optional[str]] = mapped_column(String(500))
    map_image_url: Mapped[Optional[str]] = mapped_column(String(500))
    highlights: Mapped[Optional[dict]] = mapped_column(JSON)  # list of strings
    inclusions: Mapped[Optional[dict]] = mapped_column(JSON)  # list of strings
    exclusions: Mapped[Optional[dict]] = mapped_column(JSON)  # list of strings
    # Contract & Payment
    is_signed: Mapped[bool] = mapped_column(default=False)
    signed_at: Mapped[Optional[str]] = mapped_column(String(50))
    signature_data: Mapped[Optional[str]] = mapped_column(Text) # Base64 or JSON
    payment_status: Mapped[str] = mapped_column(String(50), default="pending") # pending, partial, paid
    paid_at: Mapped[Optional[str]] = mapped_column(String(50))
    client_country: Mapped[Optional[str]] = mapped_column(String(100))

    # White-Label & Branding
    branding_config: Mapped[Optional[dict]] = mapped_column(JSON) # {primary_color: str, logo_url: str, partner_name: str}

    # Hyper-Personalization & Safety
    pax_profiles: Mapped[Optional[dict]] = mapped_column(JSON) # List of {name: str, allergies: [], dietary: str, notes: str}

    # Travel Designer — guide & logistics rules (S'TOURS parity)
    guide_rules: Mapped[Optional[dict]] = mapped_column(JSON)
    # {main_language: "EN", local_guide_threshold_pax: 20,
    #  local_guide_cities: ["Fes","Chefchaouen","Midelt"], daily_rate: 1000, currency: "MAD"}
    water_policy: Mapped[Optional[dict]] = mapped_column(JSON)
    # {bottles_per_pax_per_day: 1, cost_per_bottle: 5, currency: "MAD"}
    competitor_name: Mapped[Optional[str]] = mapped_column(String(200))
    km_total: Mapped[Optional[int]] = mapped_column(Integer)
    bus_rate_per_km: Mapped[Optional[float]] = mapped_column(Numeric(8, 2))

    # ── Multi-tenant isolation ───────────────────────────────────────
    # Every project belongs to exactly one Company (tenant).
    # Nullable during migration so existing rows aren't broken;
    # set NOT NULL once all rows are backfilled via seed/migration.
    company_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        comment="Tenant identifier — all queries must filter on this",
    )

    # Sub-agent (B2B reseller) attribution; nullable for direct sales.
    sub_agent_partner_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("partners.id", ondelete="SET NULL"), nullable=True, index=True,
    )

    # Relationships
    quotations: Mapped[list["Quotation"]] = relationship(
        "Quotation", back_populates="project", cascade="all, delete-orphan"
    )
    itineraries: Mapped[list["Itinerary"]] = relationship(
        "Itinerary", back_populates="project", cascade="all, delete-orphan"
    )

    @property
    def email_draft(self) -> Optional[str]:
        """Extract the email draft stored inside the notes field (after marker line)."""
        _MARKER = "---EMAIL_DRAFT---"
        if not self.notes or _MARKER not in self.notes:
            return None
        parts = self.notes.split(f"\n\n{_MARKER}\n", 1)
        if len(parts) < 2:
            # Fallback: split on the marker without surrounding newlines
            parts = self.notes.split(_MARKER, 1)
        return parts[1].strip() if len(parts) > 1 else None

    __table_args__ = (
        Index("idx_project_status", "status"),
        Index("idx_project_client", "client_name"),
        # Composite index for the most common query: WHERE company_id=X AND active=true
        Index("idx_project_company_active", "company_id", "active"),
        # Composite index for filtered list: company + status + active
        Index("idx_project_company_status", "company_id", "status", "active"),
    )
