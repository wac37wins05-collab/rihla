"""CRM Nurturing — email sequences (Welcome, Pre-trip, Post-trip, etc.)"""
from __future__ import annotations
from datetime import datetime, timezone
from typing import Any
from sqlalchemy.orm import Session

from app.modules.crm.models import CrmNurturingSequence, CrmNurturingRun, CrmAccount


PRE_SEEDED_SEQUENCES = [
    {
        "name": "Welcome Series",
        "trigger": "account_created",
        "description": "4 emails over 7 days to welcome new accounts and introduce S'TOURS.",
        "is_active": True,
        "steps": [
            {"day": 0, "type": "email", "subject": "Bienvenue chez S'TOURS DMC Morocco 🇲🇦",
             "body": "Bonjour {name}, bienvenue dans la famille S'TOURS ! Découvrez notre collection de circuits premium au Maroc.",
             "template": "welcome_1"},
            {"day": 2, "type": "email", "subject": "Nos meilleures destinations au Maroc",
             "body": "Marrakech, Fès, le Sahara... Découvrez nos circuits signature.",
             "template": "welcome_2"},
            {"day": 4, "type": "email", "subject": "Votre brochure S'TOURS 2026 en exclusivité",
             "body": "Téléchargez notre brochure complète 2026 avec tous nos circuits.",
             "template": "welcome_3_brochure"},
            {"day": 7, "type": "email", "subject": "Prêt à planifier votre voyage ?",
             "body": "Notre équipe est disponible pour créer votre itinéraire sur mesure.",
             "template": "welcome_4_cta"},
        ],
    },
    {
        "name": "Pre-trip Checklist",
        "trigger": "deposit_received",
        "description": "3 prep emails at J-30 / J-14 / J-7 before departure.",
        "is_active": True,
        "steps": [
            {"day": -30, "type": "email", "subject": "J-30 : Préparez votre voyage au Maroc 🧳",
             "body": "Votre voyage approche ! Vérifiez visa, passeport et vaccins recommandés.",
             "template": "pretrip_j30"},
            {"day": -14, "type": "email", "subject": "J-14 : Derniers préparatifs voyage",
             "body": "Check-list complète : vols, assurance, tenue vestimentaire, monnaie.",
             "template": "pretrip_j14"},
            {"day": -7, "type": "email", "subject": "J-7 : Votre guide pratique Maroc est prêt !",
             "body": "Contacts d'urgence, météo, conseils culturels. On vous attend !",
             "template": "pretrip_j7"},
        ],
    },
    {
        "name": "Post-trip Thank You",
        "trigger": "trip_completed",
        "description": "Warm thank-you email J+1 after trip completion.",
        "is_active": True,
        "steps": [
            {"day": 1, "type": "email", "subject": "Merci pour votre confiance ! 🌟",
             "body": "Nous espérons que votre voyage au Maroc vous a enchanté. Partagez vos photos #SToursMorocco !",
             "template": "posttrip_thankyou"},
        ],
    },
    {
        "name": "Cross-sell J+90",
        "trigger": "trip_completed",
        "description": "Offer another Moroccan destination 90 days after trip.",
        "is_active": True,
        "steps": [
            {"day": 90, "type": "email", "subject": "Et si vous (re)découvriez le Maroc ? ✨",
             "body": "Vous avez adoré {last_destination}. Découvrez maintenant nos circuits {next_destination}.",
             "template": "crosssell_j90"},
        ],
    },
    {
        "name": "Anniversary J+365",
        "trigger": "trip_completed",
        "description": "Re-engagement email on the 1-year anniversary of the trip.",
        "is_active": True,
        "steps": [
            {"day": 365, "type": "email", "subject": "Il y a 1 an, vous étiez au Maroc… 🌙",
             "body": "Déjà un an ! Revenez découvrir une nouvelle facette du Maroc. Offre spéciale fidélité.",
             "template": "anniversary_j365"},
        ],
    },
    {
        "name": "Re-engagement Hibernating",
        "trigger": "rfm_segment_hibernating",
        "description": "Quarterly re-engagement offer for hibernating accounts.",
        "is_active": True,
        "steps": [
            {"day": 0, "type": "email", "subject": "Vous nous manquez ! Une offre exclusive vous attend 💫",
             "body": "Cela fait longtemps ! Profitez de notre offre exclusive de retour : -10% sur votre prochain circuit.",
             "template": "reengagement_hibernating"},
        ],
    },
]


def seed_sequences(db: Session, company_id: str) -> int:
    """Insert pre-seeded sequences if they don't exist yet."""
    existing = db.query(CrmNurturingSequence).filter(
        CrmNurturingSequence.company_id == company_id
    ).count()
    if existing > 0:
        return 0

    count = 0
    for seq_data in PRE_SEEDED_SEQUENCES:
        seq = CrmNurturingSequence(
            company_id=company_id,
            name=seq_data["name"],
            trigger=seq_data["trigger"],
            description=seq_data["description"],
            is_active=seq_data["is_active"],
            steps=seq_data["steps"],
        )
        db.add(seq)
        count += 1
    db.commit()
    return count


def start_sequence(sequence_id: str, account_id: str, db: Session) -> CrmNurturingRun:
    """Start a nurturing sequence run for an account."""
    seq = db.query(CrmNurturingSequence).filter(
        CrmNurturingSequence.id == sequence_id
    ).first()
    if not seq:
        raise ValueError(f"Sequence {sequence_id} not found")

    # Check if already running
    existing = db.query(CrmNurturingRun).filter(
        CrmNurturingRun.sequence_id == sequence_id,
        CrmNurturingRun.account_id == account_id,
        CrmNurturingRun.status == "running",
    ).first()
    if existing:
        return existing

    run = CrmNurturingRun(
        sequence_id=sequence_id,
        account_id=account_id,
        current_step=0,
        status="running",
        started_at=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


def get_sequence_stats(sequence_id: str, db: Session) -> dict[str, Any]:
    """Return run statistics for a sequence."""
    runs = db.query(CrmNurturingRun).filter(
        CrmNurturingRun.sequence_id == sequence_id
    ).all()
    total = len(runs)
    running = sum(1 for r in runs if r.status == "running")
    completed = sum(1 for r in runs if r.status == "completed")
    return {
        "sequence_id": sequence_id,
        "total_runs": total,
        "running": running,
        "completed": completed,
        "open_rate_pct": 68.0,   # mock - real would come from email provider
        "click_rate_pct": 24.0,  # mock
    }
