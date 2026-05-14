from app.shared.models import Base
# Import everything to populate metadata
from app.modules.auth.models import User, Role, Permission, UserPreference
from app.modules.companies.models import Company, UserCompany
from app.modules.projects.models import Project
from app.modules.quotations.models import Quotation, QuotationLine
from app.modules.itineraries.models import Itinerary, ItineraryDay
from app.modules.transports.models import Transport
from app.modules.menus.models import Menu
from app.modules.references.models import ReferenceCounter, GeneratedReference
from app.modules.master_data.models import Partner, Article
from app.modules.contracting.models import Contract, ContractSeason, ContractRate, Allotment
from app.modules.approvals.models import ApprovalRule, ApprovalRequest, ApprovalStep
from app.modules.travel_companion.models import TravelLink, TravelMessage
from app.modules.supplier_score.models import SupplierIncident, SupplierScoreSnapshot
from app.modules.crm.models import CrmAccount, CrmContact, CrmActivity, CrmDeal, CrmTask, CrmLead, CrmNurturingSequence, CrmNurturingRun
from app.modules.notifications.models import Notification
from app.modules.proposals.models import ProposalShare, ProposalComment
from app.modules.admin.models import AuditLog
from app.modules.ai.models import AIRequest
from app.modules.reports.models import DataSource, DataRecord, Report, ExportLog
from app.modules.reviews.models import Review
from app.modules.guide_portal.models import GuideAvailability, CircuitRemark
from app.modules.automations.models import AutomationRule, AutomationRun
from app.modules.travel_designer.models import TravelDraft
from app.modules.dmc_quote.models import DmcQuote, DmcQuoteDay
from app.modules.catalogue.models import CatalogueItem
from app.modules.b2b_portal.models import B2BAgency, B2BSession, B2BQuotation, B2BTrackingEvent
from app.modules.p2p.models import PurchaseRequisition, PurchaseOrder, GoodsReceipt, SupplierInvoice
from app.modules.document_flow.models import DocumentTemplate

print("Tables in Metadata:")
for t in Base.metadata.tables.keys():
    print(f" - {t}")
