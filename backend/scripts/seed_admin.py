"""
Seed the admin user and all roles for RIHLA.

Usage (from backend/ folder):
    python -m scripts.seed_admin

Creates:
  - All roles (super_admin, travel_designer, etc.)
  - Admin user from ADMIN_EMAIL / ADMIN_PASSWORD
  - STOURS VOYAGES company
"""
from __future__ import annotations

import os
import sys

# ── Safety guard ──────────────────────────────────────────────────────────────
from scripts._dev_guard import require_dev_env
require_dev_env('seed_admin.py')
# ─────────────────────────────────────────────────────────────────────────────
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import uuid
from datetime import datetime, timezone

from sqlalchemy import text
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from app.core.database import SessionLocal, engine
from app.shared.models import Base

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


ROLES = [
    {"name": "super_admin",       "description": "Accès complet à toute la plateforme"},
    {"name": "sales_director",    "description": "Directeur commercial"},
    {"name": "travel_designer",   "description": "Concepteur de voyages"},
    {"name": "quotation_officer", "description": "Chargé de cotation"},
    {"name": "data_operator",     "description": "Opérateur de données"},
    {"name": "sales_agent",       "description": "Agent commercial"},
    {"name": "guide",             "description": "Guide touristique"},
    {"name": "client",            "description": "Client voyageur"},
    {"name": "driver",            "description": "Chauffeur"},
    {"name": "transport_manager", "description": "Responsable transport"},
    {"name": "director",          "description": "Directeur général"},
    {"name": "sub_agent",         "description": "Sous-agent B2B"},
]

ADMIN_USER = {
    "email":     os.getenv("ADMIN_EMAIL", "admin@stours.local"),
    "password":  os.getenv("ADMIN_PASSWORD", "change-me-local-admin"),
    "full_name": os.getenv("ADMIN_FULL_NAME", "RIHLA Admin"),
    "role":      "super_admin",
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def seed(db: Session) -> None:
    print("🔧 Initialisation de la base RIHLA...")

    # ── 1. Create all tables ─────────────────────────────────────────
    # Import all models to register them with Base.metadata
    try:
        from app.modules.auth.models import User, Role, Permission, UserPreference
        from app.modules.projects.models import Project
        from app.modules.quotations.models import Quotation
        from app.modules.itineraries.models import Itinerary
        from app.modules.companies.models import Company, UserCompany
        from app.modules.hotels.models import Hotel
        from app.modules.guides.models import Guide
        from app.modules.transports.models import Transport
        from app.modules.menus.models import Menu
        from app.modules.invoices.models import Invoice
        from app.modules.notifications.models import Notification
        from app.modules.reviews.models import Review
        from app.modules.field_ops.models import FieldTask
        from app.modules.proposals.models import ProposalShare
        from app.modules.itinerary_templates.models import ItineraryTemplate
        from app.modules.media_library.models import MediaAsset
    except ImportError as e:
        print(f"  ⚠️  Some models not imported: {e}")

    Base.metadata.create_all(bind=engine)
    print("  ✅ Tables créées (SQLite)")

    # ── 2. Seed Roles ────────────────────────────────────────────────
    for role_data in ROLES:
        existing = db.execute(
            text("SELECT id FROM roles WHERE name = :n"),
            {"n": role_data["name"]},
        ).first()
        if not existing:
            rid = str(uuid.uuid4())
            db.execute(
                text("""
                    INSERT INTO roles (id, name, description, created_at, updated_at, active)
                    VALUES (:id, :name, :desc, :now, :now, 1)
                """),
                {"id": rid, "name": role_data["name"], "desc": role_data["description"], "now": _now()},
            )
            print(f"  ✅ Rôle créé : {role_data['name']}")
        else:
            print(f"  ℹ️  Rôle déjà existant : {role_data['name']}")

    db.commit()

    # ── 3. Seed Admin User ───────────────────────────────────────────
    existing_user = db.execute(
        text("SELECT id FROM users WHERE email = :e"),
        {"e": ADMIN_USER["email"]},
    ).first()

    if not existing_user:
        role_row = db.execute(
            text("SELECT id FROM roles WHERE name = :n"),
            {"n": ADMIN_USER["role"]},
        ).first()

        if not role_row:
            print("  ❌ Rôle super_admin introuvable !")
            return

        uid = str(uuid.uuid4())
        pw_hash = pwd_context.hash(ADMIN_USER["password"])

        db.execute(
            text("""
                INSERT INTO users (id, email, full_name, password_hash, role_id,
                                   is_active, created_at, updated_at, active)
                VALUES (:id, :email, :name, :pw, :role_id, 1, :now, :now, 1)
            """),
            {
                "id": uid,
                "email": ADMIN_USER["email"],
                "name": ADMIN_USER["full_name"],
                "pw": pw_hash,
                "role_id": role_row[0],
                "now": _now(),
            },
        )
        db.commit()
        print(f"  ✅ Utilisateur admin créé : {ADMIN_USER['email']}")
    else:
        print(f"  ℹ️  Utilisateur déjà existant : {ADMIN_USER['email']}")

    # ── 4. Seed STOURS Company ───────────────────────────────────────
    try:
        existing_co = db.execute(
            text("SELECT id FROM companies WHERE code = 'STOURS'"),
        ).first()

        if not existing_co:
            cid = str(uuid.uuid4())
            db.execute(
                text("""
                    INSERT INTO companies (id, code, name, legal_name, currency,
                                          is_active, created_at, updated_at, active)
                    VALUES (:id, 'STOURS', 'STOURS VOYAGES', 'STOURS VOYAGES SARL',
                            'MAD', 1, :now, :now, 1)
                """),
                {"id": cid, "now": _now()},
            )
            db.commit()
            print("  ✅ Société STOURS VOYAGES créée")
        else:
            cid = existing_co[0]
            print("  ℹ️  Société STOURS VOYAGES déjà existante")

        # Enroll admin user in company
        admin_row = db.execute(
            text("SELECT id FROM users WHERE email = :e"),
            {"e": ADMIN_USER["email"]},
        ).first()
        if admin_row:
            uc_exists = db.execute(
                text("SELECT 1 FROM user_companies WHERE user_id = :u AND company_id = :c"),
                {"u": admin_row[0], "c": cid},
            ).first()
            if not uc_exists:
                db.execute(
                    text("""
                        INSERT INTO user_companies (id, user_id, company_id, role, is_default,
                                                    created_at, updated_at, active)
                        VALUES (:id, :uid, :cid, 'super_admin', 1, :now, :now, 1)
                    """),
                    {"id": str(uuid.uuid4()), "uid": admin_row[0], "cid": cid, "now": _now()},
                )
                db.commit()
                print("  ✅ Admin enrôlé dans STOURS VOYAGES")
    except Exception as e:
        print(f"  ⚠️  Erreur société (non critique) : {e}")
        db.rollback()

    print()
    print("🎉 Seed terminé ! Tu peux te connecter avec :")
    print(f"   📧 Email    : {ADMIN_USER['email']}")
    print(f"   🔑 Password : {ADMIN_USER['password']}")
    print()
    print("🚀 Lance maintenant :")
    print("   cd backend && python -m uvicorn app.main:app --reload --port 8000")
    print("   cd frontend && npm run dev")


if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()
