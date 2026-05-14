import os
import uuid
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# ── Safety guard ─────────────────────────────────────────────────────────────
from scripts._dev_guard import require_dev_env
require_dev_env('seed_all.py')
# ─────────────────────────────────────────────────────────────────────────────

from app.core.config import settings
from app.shared.models import Base
from app.modules.auth.models import User, Role, RoleEnum, UserPreference
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
from app.modules.crm.models import (
    CrmAccount, CrmContact, CrmActivity, CrmDeal, CrmTask, CrmLead,
    CrmNurturingSequence, CrmNurturingRun
)
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
from app.modules.crm.lead_scoring import seed_demo_leads
from app.modules.crm.nurturing import PRE_SEEDED_SEQUENCES

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

def seed():
    try:
        # 1. Create Default Role if not exists
        admin_role = db.query(Role).filter(Role.name == RoleEnum.SUPER_ADMIN).first()
        if not admin_role:
            admin_role = Role(
                id=str(uuid.uuid4()),
                name=RoleEnum.SUPER_ADMIN,
                description="Super Administrator with full access",
                active=True
            )
            db.add(admin_role)
            db.flush()
            print(f"Created role: {admin_role.name}")

        # 2. Create Default Company
        company = db.query(Company).first()
        if not company:
            company = Company(
                id=str(uuid.uuid4()),
                code="STOURS",
                name="S'TOURS DMC",
                legal_name="S'TOURS VOYAGES SARL",
                currency="MAD",
                is_active=True,
                active=True
            )
            db.add(company)
            db.flush()
            print(f"Created company: {company.name} ({company.id})")
        
        company_id = company.id

        # 3. Create Default User
        user = db.query(User).first()
        if not user:
            user = User(
                id=str(uuid.uuid4()),
                email="admin@stours.ma",
                full_name="Admin RIHLA",
                password_hash="pbkdf2:sha256:260000$pWlE6v8v$8495c378e9b0b4b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b", # dummy
                role_id=admin_role.id,
                active=True
            )
            db.add(user)
            db.flush()
            print(f"Created user: {user.email}")

            # Link user to company
            user_company = UserCompany(
                id=str(uuid.uuid4()),
                user_id=user.id,
                company_id=company_id,
                role=RoleEnum.SUPER_ADMIN,
                is_default=True,
                active=True
            )
            db.add(user_company)
            print(f"Linked user to company")

        # 4. Seed CRM Leads
        lead_count = db.query(CrmLead).filter(CrmLead.company_id == company_id).count()
        if lead_count == 0:
            count = seed_demo_leads(db, company_id)
            print(f"Seeded {count} demo leads")
        else:
            print(f"CRM Leads already seeded ({lead_count} found)")

        # 5. Seed Nurturing Sequences
        seq_count = db.query(CrmNurturingSequence).filter(CrmNurturingSequence.company_id == company_id).count()
        if seq_count == 0:
            for seq_data in PRE_SEEDED_SEQUENCES:
                row = CrmNurturingSequence(
                    id=str(uuid.uuid4()),
                    company_id=company_id,
                    **seq_data,
                    active=True
                )
                db.add(row)
            print(f"Seeded {len(PRE_SEEDED_SEQUENCES)} nurturing sequences")
        else:
            print(f"Nurturing sequences already seeded ({seq_count} found)")

        db.commit()
        print("Seeding completed successfully!")

    except Exception as e:
        db.rollback()
        print(f"Seeding failed: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed()
