"""Alembic migration 0021 — CRM Phase 1/2/3/4 schema initialization.

Creates crm_accounts, crm_contacts, crm_deals, crm_activities, crm_tasks,
crm_leads, and nurturing tables.
"""
from alembic import op
import sqlalchemy as sa

revision = "0021"
down_revision = "0020"
branch_labels = None
depends_on = None

def upgrade() -> None:
    # ── crm_accounts ─────────────────────────────────────────────────────────
    op.create_table(
        "crm_accounts",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("company_id", sa.String(36), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("code", sa.String(40)),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("legal_name", sa.String(255)),
        sa.Column("account_type", sa.String(20), server_default="agency"),
        sa.Column("primary_email", sa.String(255)),
        sa.Column("primary_phone", sa.String(40)),
        sa.Column("website", sa.String(255)),
        sa.Column("country", sa.String(80)),
        sa.Column("city", sa.String(120)),
        sa.Column("address", sa.Text()),
        sa.Column("language", sa.String(8)),
        sa.Column("timezone", sa.String(40)),
        sa.Column("currency", sa.String(3), server_default="MAD"),
        sa.Column("tax_id", sa.String(64)),
        sa.Column("payment_terms_days", sa.Integer()),
        sa.Column("credit_limit", sa.Numeric(14, 2)),
        sa.Column("tier", sa.String(20), server_default="bronze"),
        sa.Column("lifecycle_stage", sa.String(30), server_default="prospect"),
        sa.Column("health_score", sa.Integer(), server_default="50"),
        sa.Column("nps_score", sa.Integer()),
        sa.Column("owner_user_id", sa.String(36)),
        sa.Column("last_contact_at", sa.DateTime()),
        sa.Column("tags", sa.JSON()),
        sa.Column("preferences", sa.JSON()),
        sa.Column("description", sa.Text()),
        sa.Column("avatar_url", sa.String(500)),
        # Computed columns (CRM-1)
        sa.Column("pax_cumul", sa.Integer(), server_default="0"),
        sa.Column("ca_cumul", sa.Numeric(14, 2), server_default="0"),
        sa.Column("margin_avg_pct", sa.Numeric(5, 2)),
        sa.Column("trips_count", sa.Integer(), server_default="0"),
        sa.Column("last_trip_at", sa.Date()),
        sa.Column("nps_avg", sa.Numeric(4, 1)),
        sa.Column("lifetime_value", sa.Numeric(14, 2), server_default="0"),
        sa.Column("rfm_segment", sa.String(20)),
        sa.Column("rfm_score", sa.String(3)),
        sa.Column("top_destinations", sa.JSON()),
        sa.Column("top_suppliers", sa.JSON()),
        sa.Column("last_recompute_at", sa.DateTime()),
        # Mixin
        sa.Column("active", sa.Boolean(), server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime()),
        sa.Column("updated_at", sa.DateTime()),
        sa.Column("created_by", sa.String(36)),
    )
    op.create_index("ix_crm_accounts_company_id", "crm_accounts", ["company_id"])
    op.create_index("idx_crm_account_rfm", "crm_accounts", ["rfm_segment"])

    # ── crm_contacts ─────────────────────────────────────────────────────────
    op.create_table(
        "crm_contacts",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("company_id", sa.String(36), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("account_id", sa.String(36), sa.ForeignKey("crm_accounts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("first_name", sa.String(120), nullable=False),
        sa.Column("last_name", sa.String(120)),
        sa.Column("title", sa.String(120)),
        sa.Column("email", sa.String(255)),
        sa.Column("phone", sa.String(40)),
        sa.Column("mobile", sa.String(40)),
        sa.Column("whatsapp", sa.String(40)),
        sa.Column("linkedin", sa.String(255)),
        sa.Column("is_primary", sa.Boolean(), server_default=sa.text("0")),
        sa.Column("is_decision_maker", sa.Boolean(), server_default=sa.text("0")),
        sa.Column("notes", sa.Text()),
        # Mixin
        sa.Column("active", sa.Boolean(), server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime()),
        sa.Column("updated_at", sa.DateTime()),
        sa.Column("created_by", sa.String(36)),
    )
    op.create_index("ix_crm_contacts_account_id", "crm_contacts", ["account_id"])

    # ── crm_deals ───────────────────────────────────────────────────────────
    op.create_table(
        "crm_deals",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("company_id", sa.String(36), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("account_id", sa.String(36), sa.ForeignKey("crm_accounts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("project_id", sa.String(36), sa.ForeignKey("projects.id", ondelete="SET NULL")),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("stage", sa.String(30), server_default="qualification"),
        sa.Column("amount_mad", sa.Numeric(14, 2), server_default="0"),
        sa.Column("probability", sa.Integer(), server_default="20"),
        sa.Column("expected_close_date", sa.Date()),
        sa.Column("closed_at", sa.DateTime()),
        sa.Column("lost_reason", sa.String(120)),
        sa.Column("owner_user_id", sa.String(36)),
        sa.Column("description", sa.Text()),
        sa.Column("pax", sa.Integer()),
        sa.Column("destination", sa.String(120)),
        # DMC stages (CRM-3)
        sa.Column("dmc_stage", sa.String(30)),
        sa.Column("entered_stage_at", sa.DateTime()),
        sa.Column("stage_history", sa.JSON()),
        sa.Column("lost_competitor", sa.String(120)),
        sa.Column("expected_departure_at", sa.Date()),
        # Mixin
        sa.Column("active", sa.Boolean(), server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime()),
        sa.Column("updated_at", sa.DateTime()),
        sa.Column("created_by", sa.String(36)),
    )
    op.create_index("ix_crm_deals_account_id", "crm_deals", ["account_id"])
    op.create_index("idx_crm_deal_dmc_stage", "crm_deals", ["dmc_stage"])

    # ── crm_activities ───────────────────────────────────────────────────────
    op.create_table(
        "crm_activities",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("company_id", sa.String(36), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("account_id", sa.String(36), sa.ForeignKey("crm_accounts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("contact_id", sa.String(36), sa.ForeignKey("crm_contacts.id", ondelete="SET NULL")),
        sa.Column("deal_id", sa.String(36), sa.ForeignKey("crm_deals.id", ondelete="SET NULL")),
        sa.Column("type", sa.String(30), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("occurred_at", sa.DateTime(), nullable=False),
        sa.Column("owner_user_id", sa.String(36)),
        sa.Column("extra", sa.JSON()),
        # Mixin
        sa.Column("active", sa.Boolean(), server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime()),
        sa.Column("updated_at", sa.DateTime()),
        sa.Column("created_by", sa.String(36)),
    )

    # ── crm_tasks ────────────────────────────────────────────────────────────
    op.create_table(
        "crm_tasks",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("company_id", sa.String(36), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("account_id", sa.String(36), sa.ForeignKey("crm_accounts.id", ondelete="CASCADE")),
        sa.Column("deal_id", sa.String(36), sa.ForeignKey("crm_deals.id", ondelete="SET NULL")),
        sa.Column("contact_id", sa.String(36), sa.ForeignKey("crm_contacts.id", ondelete="SET NULL")),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("due_date", sa.DateTime()),
        sa.Column("priority", sa.String(10), server_default="normal"),
        sa.Column("completed_at", sa.DateTime()),
        sa.Column("owner_user_id", sa.String(36)),
        # Mixin
        sa.Column("active", sa.Boolean(), server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime()),
        sa.Column("updated_at", sa.DateTime()),
        sa.Column("created_by", sa.String(36)),
    )

    # ── crm_leads ────────────────────────────────────────────────────────────
    op.create_table(
        "crm_leads",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("company_id", sa.String(36), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("source", sa.String(30), nullable=False),
        sa.Column("subject", sa.String(255)),
        sa.Column("body", sa.Text()),
        sa.Column("raw_payload", sa.JSON()),
        sa.Column("extracted_email", sa.String(255)),
        sa.Column("extracted_phone", sa.String(40)),
        sa.Column("extracted_country", sa.String(10)),
        sa.Column("extracted_pax", sa.Integer()),
        sa.Column("extracted_budget", sa.Numeric(12, 2)),
        sa.Column("extracted_dates", sa.JSON()),
        sa.Column("extracted_destinations", sa.JSON()),
        sa.Column("extracted_niche", sa.String(30)),
        sa.Column("extracted_language", sa.String(5)),
        sa.Column("score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("score_breakdown", sa.JSON()),
        sa.Column("status", sa.String(20), nullable=False, server_default="new"),
        sa.Column("assigned_to_user_id", sa.String(36)),
        sa.Column("reject_reason", sa.String(120)),
        sa.Column("converted_account_id", sa.String(36), sa.ForeignKey("crm_accounts.id", ondelete="SET NULL")),
        sa.Column("converted_deal_id", sa.String(36), sa.ForeignKey("crm_deals.id", ondelete="SET NULL")),
        sa.Column("received_at", sa.DateTime()),
        sa.Column("qualified_at", sa.DateTime()),
        sa.Column("converted_at", sa.DateTime()),
        # Mixin
        sa.Column("active", sa.Boolean(), server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime()),
        sa.Column("updated_at", sa.DateTime()),
        sa.Column("created_by", sa.String(36)),
    )
    op.create_index("idx_crm_lead_company_status", "crm_leads", ["company_id", "status"])

    # ── crm_nurturing_sequences ──────────────────────────────────────────────
    op.create_table(
        "crm_nurturing_sequences",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("company_id", sa.String(36), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("trigger", sa.String(60), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("1")),
        sa.Column("steps", sa.JSON()),
        # Mixin
        sa.Column("active", sa.Boolean(), server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime()),
        sa.Column("updated_at", sa.DateTime()),
        sa.Column("created_by", sa.String(36)),
    )

    # ── crm_nurturing_runs ───────────────────────────────────────────────────
    op.create_table(
        "crm_nurturing_runs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("sequence_id", sa.String(36), sa.ForeignKey("crm_nurturing_sequences.id", ondelete="CASCADE"), nullable=False),
        sa.Column("account_id", sa.String(36), sa.ForeignKey("crm_accounts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("current_step", sa.Integer(), server_default="0"),
        sa.Column("next_step_at", sa.DateTime()),
        sa.Column("status", sa.String(20), server_default="running"),
        sa.Column("started_at", sa.DateTime()),
        sa.Column("completed_at", sa.DateTime()),
        # Mixin
        sa.Column("active", sa.Boolean(), server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime()),
        sa.Column("updated_at", sa.DateTime()),
        sa.Column("created_by", sa.String(36)),
    )
    op.create_index("idx_nurturing_run_sequence_account", "crm_nurturing_runs", ["sequence_id", "account_id"])

def downgrade() -> None:
    op.drop_table("crm_nurturing_runs")
    op.drop_table("crm_nurturing_sequences")
    op.drop_table("crm_leads")
    op.drop_table("crm_tasks")
    op.drop_table("crm_activities")
    op.drop_table("crm_deals")
    op.drop_table("crm_contacts")
    op.drop_table("crm_accounts")
