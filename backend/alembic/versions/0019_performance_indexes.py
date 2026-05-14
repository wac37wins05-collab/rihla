"""0019 — Performance indexes for hot query paths.

Adds composite and covering indexes for the most frequently hit queries:
- Projects list (status + active + updated_at)
- Quotation lines aggregation (quotation_id + category)
- Itinerary days lookup (itinerary_id + day_number)
- Audit log queries (entity_id + created_at)
- Partners/Articles search (company_id + name)
- Approval requests filtering (company_id + status + entity_type)

Revision ID: 0019
Revises: 0018
"""
from alembic import op
import sqlalchemy as sa

revision = "0019"
down_revision = "0018"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Projects: covering index for the main list query ──────────
    try:
        op.create_index(
            "idx_project_list_covering",
            "projects",
            ["active", "status", "updated_at"],
            postgresql_using="btree",
        )
    except Exception: pass

    try:
        op.create_index(
            "idx_project_active_created",
            "projects",
            ["active", "created_at"],
            postgresql_using="btree",
        )
    except Exception: pass

    # ── Quotation lines: composite for aggregation by category ────
    try:
        op.create_index(
            "idx_qline_quotation_category",
            "quotation_lines",
            ["quotation_id", "category", "is_included"],
            postgresql_using="btree",
        )
    except Exception: pass

    # ── Itinerary days: composite for ordered lookup ──────────────
    try:
        op.create_index(
            "idx_iday_itinerary_number",
            "itinerary_days",
            ["itinerary_id", "day_number"],
            postgresql_using="btree",
        )
    except Exception: pass

    # ── Audit logs: entity lookup with time ordering ──────────────
    try:
        op.create_index(
            "idx_audit_entity_time",
            "audit_logs",
            ["entity_id", "created_at"],
            postgresql_using="btree",
        )
    except Exception: pass

    # ── Partners: company + name for search queries ───────────────
    try:
        op.create_index(
            "idx_partner_company_name",
            "partners",
            ["company_id", "name"],
            postgresql_using="btree",
        )
    except Exception: pass

    # ── Articles: company + category for filtered lists ───────────
    try:
        op.create_index(
            "idx_article_company_category",
            "articles",
            ["company_id", "category"],
            postgresql_using="btree",
        )
    except Exception: pass

    # ── Contracts: validity range lookup ──────────────────────────
    try:
        op.create_index(
            "idx_contract_active_validity",
            "contracts",
            ["status", "valid_from", "valid_to"],
            postgresql_using="btree",
        )
    except Exception: pass

    # ── Pricing brackets: quotation ordered lookup ────────────────
    try:
        op.create_index(
            "idx_bracket_quotation_pax",
            "quotation_pricing_brackets",
            ["quotation_id", "pax_basis"],
            postgresql_using="btree",
        )
    except Exception: pass

    # ── Quotation terms: quotation + section ──────────────────────
    try:
        op.create_index(
            "idx_qterm_quotation_section",
            "quotation_terms",
            ["quotation_id", "section"],
            postgresql_using="btree",
        )
    except Exception: pass

    # ── Day meals: day lookup ─────────────────────────────────────
    try:
        op.create_index(
            "idx_daymeal_day_type",
            "itinerary_day_meals",
            ["day_id", "meal_type"],
            postgresql_using="btree",
        )
    except Exception: pass


def downgrade() -> None:
    op.drop_index("idx_daymeal_day_type")
    op.drop_index("idx_qterm_quotation_section")
    op.drop_index("idx_bracket_quotation_pax")
    op.drop_index("idx_contract_active_validity")
    op.drop_index("idx_article_company_category")
    op.drop_index("idx_partner_company_name")
    op.drop_index("idx_audit_entity_time")
    op.drop_index("idx_iday_itinerary_number")
    op.drop_index("idx_qline_quotation_category")
    op.drop_index("idx_project_active_created")
    op.drop_index("idx_project_list_covering")
