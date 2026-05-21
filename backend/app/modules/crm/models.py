"""CRM models — enriched with CRM-1/2/3/4 additions.

New additions vs original:
  CrmAccount  : +computed cols (pax_cumul, ca_cumul, rfm_segment, etc.)
  CrmDeal     : +dmc_stage, stage_history, expected_departure_at, etc.
  CrmLead     : NEW — multi-channel lead inbox
  CrmNurturingSequence : NEW
  CrmNurturingRun      : NEW
"""
from datetime import date, datetime, timezone
from typing import Optional

from sqlalchemy import (
    Boolean, Date, DateTime, ForeignKey, Index, Integer, JSON, Numeric,
    String, Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.models import Base, BaseMixin


# ── Account (B2B partner / direct customer) ────────────────────────────────
class CrmAccount(Base, BaseMixin):
    __tablename__ = "crm_accounts"

    company_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("companies.id", ondelete="CASCADE"), index=True
    )
    code: Mapped[Optional[str]] = mapped_column(String(40), index=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    legal_name: Mapped[Optional[str]] = mapped_column(String(255))
    account_type: Mapped[str] = mapped_column(String(20), default="agency", index=True)
    primary_email: Mapped[Optional[str]] = mapped_column(String(255), index=True)
    primary_phone: Mapped[Optional[str]] = mapped_column(String(40))
    website: Mapped[Optional[str]] = mapped_column(String(255))
    country: Mapped[Optional[str]] = mapped_column(String(80), index=True)
    city: Mapped[Optional[str]] = mapped_column(String(120))
    address: Mapped[Optional[str]] = mapped_column(Text)
    language: Mapped[Optional[str]] = mapped_column(String(8))
    timezone: Mapped[Optional[str]] = mapped_column(String(40))
    currency: Mapped[str] = mapped_column(String(3), default="MAD")
    tax_id: Mapped[Optional[str]] = mapped_column(String(64))
    payment_terms_days: Mapped[Optional[int]] = mapped_column(Integer)
    credit_limit: Mapped[Optional[float]] = mapped_column(Numeric(14, 2))
    tier: Mapped[str] = mapped_column(String(20), default="bronze", index=True)
    lifecycle_stage: Mapped[str] = mapped_column(String(30), default="prospect", index=True)
    health_score: Mapped[int] = mapped_column(Integer, default=50)
    nps_score: Mapped[Optional[int]] = mapped_column(Integer)
    owner_user_id: Mapped[Optional[str]] = mapped_column(String(36), index=True)
    last_contact_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    tags: Mapped[Optional[dict]] = mapped_column(JSON)
    preferences: Mapped[Optional[dict]] = mapped_column(JSON)
    description: Mapped[Optional[str]] = mapped_column(Text)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500))

    passport_number: Mapped[Optional[str]] = mapped_column(String(80))
    passport_expires_at: Mapped[Optional[date]] = mapped_column(Date)
    birthday: Mapped[Optional[date]] = mapped_column(Date)
    client_history: Mapped[Optional[dict]] = mapped_column(JSON)
    documents: Mapped[Optional[list]] = mapped_column(JSON)
    agency_commission_pct: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))
    annual_revenue_mad: Mapped[Optional[float]] = mapped_column(Numeric(14, 2), default=0)
    conversion_rate_pct: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))
    special_pricing: Mapped[Optional[dict]] = mapped_column(JSON)
    negotiated_rates: Mapped[Optional[dict]] = mapped_column(JSON)
    travel_manager_name: Mapped[Optional[str]] = mapped_column(String(255))
    travel_manager_email: Mapped[Optional[str]] = mapped_column(String(255))
    finance_contact_name: Mapped[Optional[str]] = mapped_column(String(255))
    finance_contact_email: Mapped[Optional[str]] = mapped_column(String(255))
    corporate_agreement: Mapped[Optional[dict]] = mapped_column(JSON)

    # ── CRM-1 computed columns (RFM + 360°) ──────────────────────────────
    pax_cumul: Mapped[Optional[int]] = mapped_column(Integer, default=0)
    ca_cumul: Mapped[Optional[float]] = mapped_column(Numeric(14, 2), default=0)
    margin_avg_pct: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))
    trips_count: Mapped[Optional[int]] = mapped_column(Integer, default=0)
    last_trip_at: Mapped[Optional[date]] = mapped_column(Date)
    nps_avg: Mapped[Optional[float]] = mapped_column(Numeric(4, 1))
    lifetime_value: Mapped[Optional[float]] = mapped_column(Numeric(14, 2), default=0)
    rfm_segment: Mapped[Optional[str]] = mapped_column(String(20), index=True)
    # champion | loyal | promising | at_risk | hibernating | new
    rfm_score: Mapped[Optional[str]] = mapped_column(String(3))   # e.g. "555", "143"
    top_destinations: Mapped[Optional[list]] = mapped_column(JSON)  # top 3
    top_suppliers: Mapped[Optional[list]] = mapped_column(JSON)     # top 5
    last_recompute_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    __table_args__ = (
        Index("idx_crm_account_company_name", "company_id", "name"),
        Index("idx_crm_account_tier", "tier"),
        Index("idx_crm_account_rfm", "rfm_segment"),
    )


# ── Contact ─────────────────────────────────────────────────────────────────
class CrmContact(Base, BaseMixin):
    __tablename__ = "crm_contacts"

    company_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("companies.id", ondelete="CASCADE"), index=True
    )
    account_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("crm_accounts.id", ondelete="CASCADE"), index=True
    )
    first_name: Mapped[str] = mapped_column(String(120))
    last_name: Mapped[Optional[str]] = mapped_column(String(120))
    title: Mapped[Optional[str]] = mapped_column(String(120))
    job_title: Mapped[Optional[str]] = mapped_column(String(120))
    email: Mapped[Optional[str]] = mapped_column(String(255), index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(40))
    mobile: Mapped[Optional[str]] = mapped_column(String(40))
    whatsapp: Mapped[Optional[str]] = mapped_column(String(40))
    linkedin: Mapped[Optional[str]] = mapped_column(String(255))
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)
    is_decision_maker: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[Optional[str]] = mapped_column(Text)


# ── Activity ─────────────────────────────────────────────────────────────────
class CrmActivity(Base, BaseMixin):
    __tablename__ = "crm_activities"

    company_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("companies.id", ondelete="CASCADE"), index=True
    )
    account_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("crm_accounts.id", ondelete="CASCADE"), index=True
    )
    contact_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("crm_contacts.id", ondelete="SET NULL"), nullable=True
    )
    deal_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("crm_deals.id", ondelete="SET NULL"), nullable=True
    )
    type: Mapped[str] = mapped_column(String(30), index=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), index=True
    )
    owner_user_id: Mapped[Optional[str]] = mapped_column(String(36), index=True)
    extra: Mapped[Optional[dict]] = mapped_column(JSON)


# ── Deal (Pipeline opportunity) ─────────────────────────────────────────────
class CrmDeal(Base, BaseMixin):
    __tablename__ = "crm_deals"

    company_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("companies.id", ondelete="CASCADE"), index=True
    )
    account_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("crm_accounts.id", ondelete="CASCADE"), index=True
    )
    project_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(255))

    # Legacy generic stage (kept for backward compat)
    stage: Mapped[str] = mapped_column(String(30), default="qualification", index=True)

    # ── CRM-3 DMC 10-stage pipeline ──────────────────────────────────────
    dmc_stage: Mapped[Optional[str]] = mapped_column(String(30), index=True)
    # brief_received | brief_qualified | quote_v1_sent | follow_up_j2 |
    # follow_up_j5 | quote_v2_sent | decision_pending | deposit_received |
    # ops_in_progress | completed_nps_sent | lost
    entered_stage_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    stage_history: Mapped[Optional[list]] = mapped_column(JSON)
    # [{stage, entered_at, exited_at, notes}]
    lost_competitor: Mapped[Optional[str]] = mapped_column(String(120))
    expected_departure_at: Mapped[Optional[date]] = mapped_column(Date)

    amount_mad: Mapped[float] = mapped_column(Numeric(14, 2), default=0)
    probability: Mapped[int] = mapped_column(Integer, default=20)
    expected_close_date: Mapped[Optional[date]] = mapped_column(Date)
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    lost_reason: Mapped[Optional[str]] = mapped_column(String(120))
    owner_user_id: Mapped[Optional[str]] = mapped_column(String(36), index=True)
    description: Mapped[Optional[str]] = mapped_column(Text)
    pax: Mapped[Optional[int]] = mapped_column(Integer)
    destination: Mapped[Optional[str]] = mapped_column(String(120))


# ── Task ─────────────────────────────────────────────────────────────────────
class CrmTask(Base, BaseMixin):
    __tablename__ = "crm_tasks"

    company_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("companies.id", ondelete="CASCADE"), index=True
    )
    account_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("crm_accounts.id", ondelete="CASCADE"), nullable=True, index=True
    )
    deal_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("crm_deals.id", ondelete="SET NULL"), nullable=True
    )
    contact_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("crm_contacts.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text)
    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime, index=True)
    priority: Mapped[str] = mapped_column(String(10), default="normal")
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    owner_user_id: Mapped[Optional[str]] = mapped_column(String(36), index=True)


# ── Lead (multi-channel inbox) ───────────────────────────────────────────────
class CrmLead(Base, BaseMixin):
    """Raw lead before qualification → promotion to Account + Deal."""
    __tablename__ = "crm_leads"

    company_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("companies.id", ondelete="CASCADE"), index=True
    )
    source: Mapped[str] = mapped_column(String(30), index=True)
    # email | webform | whatsapp | instagram | portal_b2b | salon | referral

    subject: Mapped[Optional[str]] = mapped_column(String(255))
    body: Mapped[Optional[str]] = mapped_column(Text)
    raw_payload: Mapped[Optional[dict]] = mapped_column(JSON)

    # Extracted fields
    extracted_email: Mapped[Optional[str]] = mapped_column(String(255), index=True)
    extracted_phone: Mapped[Optional[str]] = mapped_column(String(40))
    extracted_country: Mapped[Optional[str]] = mapped_column(String(10))
    extracted_pax: Mapped[Optional[int]] = mapped_column(Integer)
    extracted_budget: Mapped[Optional[float]] = mapped_column(Numeric(12, 2))
    extracted_dates: Mapped[Optional[list]] = mapped_column(JSON)
    extracted_destinations: Mapped[Optional[list]] = mapped_column(JSON)
    extracted_niche: Mapped[Optional[str]] = mapped_column(String(30))
    extracted_language: Mapped[Optional[str]] = mapped_column(String(5))

    # Scoring
    score: Mapped[int] = mapped_column(Integer, default=0, index=True)
    score_breakdown: Mapped[Optional[dict]] = mapped_column(JSON)

    # Workflow
    status: Mapped[str] = mapped_column(String(20), default="new", index=True)
    # new | qualified | converted | spam | rejected
    assigned_to_user_id: Mapped[Optional[str]] = mapped_column(String(36), index=True)
    reject_reason: Mapped[Optional[str]] = mapped_column(String(120))

    # Conversion result
    converted_account_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("crm_accounts.id", ondelete="SET NULL"), nullable=True
    )
    converted_deal_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("crm_deals.id", ondelete="SET NULL"), nullable=True
    )

    received_at: Mapped[Optional[datetime]] = mapped_column(DateTime, index=True)
    qualified_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    converted_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    __table_args__ = (
        Index("idx_crm_lead_company_status", "company_id", "status"),
        Index("idx_crm_lead_score", "score"),
    )


# ── Nurturing Sequence ───────────────────────────────────────────────────────
class CrmNurturingSequence(Base, BaseMixin):
    __tablename__ = "crm_nurturing_sequences"

    company_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("companies.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(120))
    trigger: Mapped[str] = mapped_column(String(60))
    # account_created | trip_completed | deposit_received | rfm_segment_hibernating
    description: Mapped[Optional[str]] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    steps: Mapped[Optional[list]] = mapped_column(JSON)
    # [{day, type, subject, body, template}]


# ── Nurturing Run ────────────────────────────────────────────────────────────
class CrmNurturingRun(Base, BaseMixin):
    __tablename__ = "crm_nurturing_runs"

    sequence_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("crm_nurturing_sequences.id", ondelete="CASCADE"), index=True
    )
    account_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("crm_accounts.id", ondelete="CASCADE"), index=True
    )
    current_step: Mapped[int] = mapped_column(Integer, default=0)
    next_step_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(String(20), default="running")
    # running | completed | paused | cancelled
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    __table_args__ = (
        Index("idx_nurturing_run_sequence_account", "sequence_id", "account_id"),
    )
