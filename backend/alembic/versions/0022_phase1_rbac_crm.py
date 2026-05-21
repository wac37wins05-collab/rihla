"""Phase 1 RBAC roles and CRM profile fields.

Revision ID: 0022
Revises: 84f1bafd0b70
"""

from alembic import op
import sqlalchemy as sa

revision = "0022"
down_revision = "84f1bafd0b70"
branch_labels = None
depends_on = None


ACCOUNT_COLUMNS = (
    sa.Column("passport_number", sa.String(80)),
    sa.Column("passport_expires_at", sa.Date()),
    sa.Column("birthday", sa.Date()),
    sa.Column("client_history", sa.JSON()),
    sa.Column("documents", sa.JSON()),
    sa.Column("agency_commission_pct", sa.Numeric(5, 2)),
    sa.Column("annual_revenue_mad", sa.Numeric(14, 2), server_default="0"),
    sa.Column("conversion_rate_pct", sa.Numeric(5, 2)),
    sa.Column("special_pricing", sa.JSON()),
    sa.Column("negotiated_rates", sa.JSON()),
    sa.Column("travel_manager_name", sa.String(255)),
    sa.Column("travel_manager_email", sa.String(255)),
    sa.Column("finance_contact_name", sa.String(255)),
    sa.Column("finance_contact_email", sa.String(255)),
    sa.Column("corporate_agreement", sa.JSON()),
)


def upgrade() -> None:
    with op.batch_alter_table("crm_accounts") as batch_op:
        for column in ACCOUNT_COLUMNS:
            batch_op.add_column(column.copy())
    with op.batch_alter_table("crm_contacts") as batch_op:
        batch_op.add_column(sa.Column("job_title", sa.String(120)))

    roles = (
        ("8d0d82e7-2da6-4d1c-9b87-8e6dba34f001", "ceo", "CEO — full platform access"),
        (
            "8d0d82e7-2da6-4d1c-9b87-8e6dba34f002",
            "contracting_manager",
            "Contracting Manager — suppliers, rates and contracts",
        ),
        (
            "8d0d82e7-2da6-4d1c-9b87-8e6dba34f003",
            "horizon_transport",
            "Horizon Transport — fleet, drivers and dispatch",
        ),
        (
            "8d0d82e7-2da6-4d1c-9b87-8e6dba34f004",
            "accounting_manager",
            "Accounting Manager — invoices, payments and reports",
        ),
    )
    for role_id, name, description in roles:
        op.execute(
            sa.text(
                "INSERT INTO roles (id, name, description, permissions_json, created_at, updated_at, active) "
                "SELECT :id, :name, :description, '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, true "
                "WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = :name)"
            ).bindparams(id=role_id, name=name, description=description)
        )


def downgrade() -> None:
    op.execute(
        "DELETE FROM roles WHERE name IN "
        "('ceo', 'contracting_manager', 'horizon_transport', 'accounting_manager')"
    )
    with op.batch_alter_table("crm_accounts") as batch_op:
        for column in reversed(ACCOUNT_COLUMNS):
            batch_op.drop_column(column.name)
    with op.batch_alter_table("crm_contacts") as batch_op:
        batch_op.drop_column("job_title")
