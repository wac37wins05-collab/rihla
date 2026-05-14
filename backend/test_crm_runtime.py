from app.core.database import SessionLocal
from app.modules.crm.models import CrmAccount, CrmLead
from sqlalchemy import select

def test_crm():
    db = SessionLocal()
    try:
        # Try to query crm_accounts
        print("Querying CrmAccount...")
        accounts = db.execute(select(CrmAccount).limit(1)).scalars().all()
        print(f"Found {len(accounts)} accounts.")
        
        # Try to query crm_leads
        print("Querying CrmLead...")
        leads = db.execute(select(CrmLead).limit(1)).scalars().all()
        print(f"Found {len(leads)} leads.")
        
        print("CRM Test Passed!")
    except Exception as e:
        print(f"CRM Test Failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_crm()
