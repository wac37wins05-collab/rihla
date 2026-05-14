"""Alembic environment configuration for STOURS Studio."""

from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
import sys
from pathlib import Path

# Add parent directory to path so we can import app
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.config import settings
from app.shared.models import Base

# Import all models so Alembic's autogenerate detects every table
from app.modules.auth.models import User, Role, Permission, UserPreference  # noqa: F401
from app.modules.companies.models import Company, UserCompany       # noqa: F401
from app.modules.projects.models import Project                     # noqa: F401
from app.modules.quotations.models import Quotation, QuotationLine  # noqa: F401
from app.modules.itineraries.models import Itinerary, ItineraryDay  # noqa: F401
from app.modules.transports.models import Transport                  # noqa: F401
from app.modules.menus.models import Menu                            # noqa: F401
from app.modules.references.models import (                          # noqa: F401
    ReferenceCounter, GeneratedReference
)
from app.modules.master_data.models import Partner, Article         # noqa: F401
from app.modules.contracting.models import (                        # noqa: F401
    Contract, ContractSeason, ContractRate, Allotment
)
from app.modules.approvals.models import (                          # noqa: F401
    ApprovalRule, ApprovalRequest, ApprovalStep
)
from app.modules.travel_companion.models import (                   # noqa: F401
    TravelLink, TravelMessage
)
from app.modules.supplier_score.models import (                     # noqa: F401
    SupplierIncident, SupplierScoreSnapshot
)
from app.modules.crm.models import (                                # noqa: F401
    CrmAccount, CrmContact, CrmActivity, CrmDeal, CrmTask, CrmLead,
    CrmNurturingSequence, CrmNurturingRun
)
from app.modules.notifications.models import Notification           # noqa: F401
from app.modules.proposals.models import (                          # noqa: F401
    ProposalShare, ProposalComment
)
from app.modules.admin.models import AuditLog                       # noqa: F401
from app.modules.ai.models import AIRequest                         # noqa: F401
from app.modules.reports.models import (                            # noqa: F401
    DataSource, DataRecord, Report, ExportLog
)
from app.modules.reviews.models import Review                       # noqa: F401
from app.modules.guide_portal.models import (                       # noqa: F401
    GuideAvailability, CircuitRemark
)
from app.modules.automations.models import (                        # noqa: F401
    AutomationRule, AutomationRun
)
from app.modules.travel_designer.models import TravelDraft         # noqa: F401
from app.modules.dmc_quote.models import DmcQuote, DmcQuoteDay    # noqa: F401
from app.modules.catalogue.models import CatalogueItem            # noqa: F401
from app.modules.b2b_portal.models import (                       # noqa: F401
    B2BAgency, B2BSession, B2BQuotation, B2BTrackingEvent
)
from app.modules.p2p.models import (                              # noqa: F401
    PurchaseRequisition, PurchaseOrder, GoodsReceipt, SupplierInvoice
)

from app.modules.document_flow.models import DocumentTemplate    # noqa: F401

try:
    from app.modules.invoices.models import Invoice                  # noqa: F401
except ImportError:
    pass
try:
    from app.modules.guides.models import Guide                      # noqa: F401
except ImportError:
    pass
try:
    from app.modules.itinerary_templates.models import (            # noqa: F401
        ItineraryTemplate, ItineraryTemplateDay
    )
except ImportError:
    pass
try:
    from app.modules.media_library.models import MediaAsset          # noqa: F401
except ImportError:
    pass
try:
    from app.modules.payment_reminders.models import PaymentReminder # noqa: F401
except ImportError:
    pass
try:
    from app.modules.m365.models import (                            # noqa: F401
        M365Connection, M365LinkedMessage
    )
except ImportError:
    pass
try:
    from app.modules.erp_integration.models import (                 # noqa: F401
        ClientErpConfig, ErpPushLog
    )
except ImportError:
    pass

# This is the Alembic Config object
config = context.config

# Set SQLAlchemy URL from app settings
if config.get_section_option("alembic", "sqlalchemy.url") == "driver://user:pass@localhost/dbname":
    config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

# Configure logging from ini file
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set target_metadata for auto-generating migrations
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""

    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""

    configuration = config.get_section(config.config_ini_section)
    configuration["sqlalchemy.url"] = settings.DATABASE_URL

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata,
            render_as_batch=True
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
