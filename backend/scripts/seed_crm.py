"""Seed CRM with demo accounts, contacts, activities, deals, tasks, leads, nurturing.

⚠️  DEMO DATA — development only. Blocked in production.
"""
from datetime import datetime, timedelta, timezone, date
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts._dev_guard import require_dev_env
require_dev_env("seed_crm")

import app.main  # noqa: F401  -- ensures all models are loaded
from app.core.database import SessionLocal, engine
from app.shared.models import Base
from app.modules.companies.models import Company
from app.modules.crm.models import (
    CrmAccount, CrmContact, CrmActivity, CrmDeal, CrmTask,
    CrmLead, CrmNurturingSequence, CrmNurturingRun,
)

# Make sure CRM tables exist
Base.metadata.create_all(bind=engine)


def now() -> datetime:
    return datetime.now(timezone.utc)


def main():
    db = SessionLocal()
    try:
        c = db.query(Company).first()
        if not c:
            print("No company found. Run seed_companies first.")
            return
        cid = c.id

        # Reset (order matters — foreign keys)
        db.query(CrmNurturingRun).filter(
            CrmNurturingRun.sequence_id.in_(
                db.query(CrmNurturingSequence.id).filter(CrmNurturingSequence.company_id == cid)
            )
        ).delete(synchronize_session="fetch")
        db.query(CrmNurturingSequence).filter(CrmNurturingSequence.company_id == cid).delete()
        db.query(CrmLead).filter(CrmLead.company_id == cid).delete()
        db.query(CrmTask).filter(CrmTask.company_id == cid).delete()
        db.query(CrmActivity).filter(CrmActivity.company_id == cid).delete()
        db.query(CrmDeal).filter(CrmDeal.company_id == cid).delete()
        db.query(CrmContact).filter(CrmContact.company_id == cid).delete()
        db.query(CrmAccount).filter(CrmAccount.company_id == cid).delete()
        db.commit()

        # Accounts
        accounts_data = [
            dict(code="AG-001", name="Luxe Voyages International", legal_name="Luxe Voyages SAS",
                 account_type="agency", primary_email="s.martin@luxevoyages.fr", primary_phone="+33145678900",
                 country="France", city="Paris", language="fr", timezone="Europe/Paris",
                 tier="platinum", lifecycle_stage="champion", health_score=92, nps_score=68,
                 currency="EUR", payment_terms_days=30, credit_limit=200000,
                 tags=["luxury","fr","b2b","top-10"], preferences={"hotels":"5*","guides":"fr","transfer":"vip-mercedes"},
                 description="Tour-opérateur premium français. Volume annuel ~45 dossiers."),
            dict(code="AG-002", name="Atlas Tours UK", legal_name="Atlas Tours Ltd",
                 account_type="tour_operator", primary_email="jsmith@atlastours.co.uk", primary_phone="+442075550100",
                 country="United Kingdom", city="London", language="en", timezone="Europe/London",
                 tier="gold", lifecycle_stage="customer", health_score=72, nps_score=45,
                 currency="GBP", payment_terms_days=45,
                 tags=["outdoor","en","b2b"], preferences={"diet":"vegetarian-friendly","activities":"outdoor"},
                 description="Spécialiste outdoor & trekking depuis Londres."),
            dict(code="AG-003", name="Iberia Travel Group", legal_name="Iberia Travel SL",
                 account_type="agency", primary_email="cruiz@iberiatravel.es", primary_phone="+34915550100",
                 country="Spain", city="Madrid", language="es",
                 tier="silver", lifecycle_stage="at_risk", health_score=55,
                 currency="EUR", payment_terms_days=30,
                 tags=["budget","es"], preferences={"groups":"20+","budget":"optimized"},
                 description="Volumes importants en groupes (20+ pax). Marges serrées."),
            dict(code="AG-004", name="Elite Destinations NY", legal_name="Elite Destinations LLC",
                 account_type="agency", primary_email="sarah@elitedest.com", primary_phone="+12125550100",
                 country="USA", city="New York", language="en",
                 tier="platinum", lifecycle_stage="champion", health_score=95, nps_score=72,
                 currency="USD", payment_terms_days=15, credit_limit=500000,
                 tags=["ultra-lux","us","b2b","top-5"], preferences={"hotels":"private-riad","transport":"helicopter"},
                 description="Ultra-luxury concierge. Conversion 93%."),
            dict(code="DR-001", name="Hewett Group", legal_name="Hewett Family",
                 account_type="direct", primary_email="contact@hewett.com",
                 country="USA", city="Boston", language="en",
                 tier="gold", lifecycle_stage="opportunity", health_score=68,
                 description="Famille Hewett — Cités Impériales 11j en cours."),
            dict(code="MC-001", name="TotalEnergies MICE", legal_name="TotalEnergies SE",
                 account_type="mice", primary_email="incentive@totalenergies.com",
                 country="France", city="Paris", language="fr",
                 tier="platinum", lifecycle_stage="customer", health_score=85, nps_score=55,
                 currency="EUR",
                 tags=["mice","corporate","fr"],
                 description="Incentive corporate récurrent. 80 pax annuel."),
            dict(code="AG-005", name="Schmidt KG Reisen", legal_name="Schmidt KG",
                 account_type="agency", primary_email="info@schmidt-reisen.de",
                 country="Germany", city="Munich", language="de",
                 tier="gold", lifecycle_stage="customer", health_score=80,
                 currency="EUR",
                 description="DE outbound. Spécialiste désert."),
            dict(code="LD-001", name="Boston University Travel", legal_name="Boston University",
                 account_type="corporate", primary_email="travel@bu.edu",
                 country="USA", city="Boston", language="en",
                 tier="silver", lifecycle_stage="hibernating", health_score=40,
                 description="Lead universitaire inactif depuis 8 mois. Voyages d'étude étudiants."),
        ]
        accounts: list[CrmAccount] = []
        for d in accounts_data:
            a = CrmAccount(company_id=cid, **d)
            db.add(a); accounts.append(a)
        db.flush()

        # Contacts (1-2 per account)
        contact_seed = {
            "AG-001": [("Sophie", "Martin", "Directrice DMC", "s.martin@luxevoyages.fr", "+33614200100", True, True),
                       ("Pierre", "Dubois", "Acheteur", "p.dubois@luxevoyages.fr", "+33614200101", False, False)],
            "AG-002": [("James", "Smith", "Founder", "jsmith@atlastours.co.uk", "+447700900100", True, True)],
            "AG-003": [("Carlos", "Ruiz", "Director Comercial", "cruiz@iberiatravel.es", "+34666700100", True, True),
                       ("Lucia", "Gomez", "Junior Producer", "lgomez@iberiatravel.es", None, False, False)],
            "AG-004": [("Sarah", "Jenkins", "VP Travel", "sarah@elitedest.com", "+12125550100", True, True)],
            "DR-001": [("Mark", "Hewett", "Owner", "mark@hewett.com", None, True, True)],
            "MC-001": [("Marc", "Lemaire", "Event Manager", "incentive@totalenergies.com", None, True, True)],
            "AG-005": [("Klaus", "Schmidt", "GM", "klaus@schmidt-reisen.de", "+498912345", True, True)],
            "LD-001": [("Dr. Anna", "Reyes", "Travel Director", "areyes@bu.edu", None, True, True)],
        }
        for a in accounts:
            for fn, ln, title, email, phone, prim, dm in contact_seed.get(a.code, []):
                db.add(CrmContact(
                    company_id=cid, account_id=a.id,
                    first_name=fn, last_name=ln, title=title, email=email, phone=phone,
                    is_primary=prim, is_decision_maker=dm,
                ))
        db.flush()

        # Deals (open + won + lost)
        deals_seed = [
            ("AG-001", "Cités Impériales 11j · Hewett",        "won",          245000,  100, -45, "Maroc"),
            ("AG-001", "Sahara Premium 9j · oct 2026",          "negotiation",  380000,  70,    35, "Sahara"),
            ("AG-001", "Atlas Trek 7j · printemps",             "proposal",     185000,  50,    60, "Atlas"),
            ("AG-002", "Outdoor Adventure 8j",                  "qualification", 95000,  20,    90, "Atlas"),
            ("AG-003", "Group MICE 20pax",                      "lost",          78000,    0,  -30, "Marrakech"),
            ("AG-003", "Andalusia + Maroc combo 12j",           "qualification", 110000,  25,   100, "Combo"),
            ("AG-004", "Honeymoon Riad Luxe 5j",                "won",          165000, 100,   -20, "Marrakech"),
            ("AG-004", "Helicopter Tour Marrakech 3j",          "negotiation",  220000,  80,    20, "Marrakech"),
            ("AG-004", "Imperial Discovery 10j · Boston Univ",  "proposal",     320000,  60,    45, "Cités"),
            ("DR-001", "Imperial 11j · 22 pax",                 "negotiation",  185000,  75,    20, "Cités"),
            ("MC-001", "Incentive Casa-Marrakech 4j 80pax",     "won",          425000, 100,   -15, "Casa+Marra"),
            ("MC-001", "Workshop Sahara 5j",                    "qualification",230000,  20,   120, "Sahara"),
            ("AG-005", "Erg Chebbi Lux 6j",                     "won",          135000, 100,   -60, "Sahara"),
            ("AG-005", "Coast & Atlas 9j printemps",            "proposal",     162000,  55,    70, "Atlas"),
            ("LD-001", "Educational Trip 8j 30 students",       "qualification",  62000, 15,   150, "Cités"),
        ]
        accounts_by_code = {a.code: a for a in accounts}
        for code, title, stage, amount, prob, day_offset, dest in deals_seed:
            a = accounts_by_code.get(code)
            if not a: continue
            close_dt = (now() + timedelta(days=day_offset)).date()
            d = CrmDeal(
                company_id=cid, account_id=a.id, title=title, stage=stage,
                amount_mad=amount, probability=prob, expected_close_date=close_dt,
                destination=dest, pax=20, description=f"Deal {title} pour {a.name}",
            )
            if stage in ("won", "lost"):
                d.closed_at = now() - timedelta(days=abs(day_offset))
                if stage == "lost":
                    d.lost_reason = "Prix supérieur à concurrent"
            db.add(d)
        db.flush()

        # Activities (a few per account)
        for a in accounts:
            db.add(CrmActivity(
                company_id=cid, account_id=a.id, type="note",
                title=f"Compte créé: {a.name}",
                occurred_at=now() - timedelta(days=120),
            ))
            db.add(CrmActivity(
                company_id=cid, account_id=a.id, type="email",
                title="Email envoyé: présentation services DMC",
                description="Mail de bienvenue + brochure 2026",
                occurred_at=now() - timedelta(days=30),
            ))
            db.add(CrmActivity(
                company_id=cid, account_id=a.id, type="call",
                title="Appel: discussion budget 2026",
                description="15 min — intéressé par circuits luxe & MICE",
                occurred_at=now() - timedelta(days=12),
            ))
            db.add(CrmActivity(
                company_id=cid, account_id=a.id, type="meeting",
                title="Visio: démo plateforme",
                occurred_at=now() - timedelta(days=5),
            ))
            a.last_contact_at = now() - timedelta(days=5)

        # Tasks
        tasks_seed = [
            ("AG-001", "Envoyer proposal Sahara Premium",       "high",   2),
            ("AG-001", "Relancer Sophie sur signature contrat", "urgent", -1),  # overdue
            ("AG-002", "Préparer cotation outdoor 8j",          "normal", 5),
            ("AG-003", "Appel suivi après devis Andalusia",     "normal", 3),
            ("AG-004", "Visio Sarah pour helicopter tour",      "high",   1),
            ("DR-001", "Confirmer dates Imperial 11j",          "high",   4),
            ("MC-001", "Réserver Auberge Atlas 80 pax",         "urgent", 6),
            ("AG-005", "Envoyer photos circuit Atlas",          "low",    14),
        ]
        for code, title, prio, day_offset in tasks_seed:
            a = accounts_by_code.get(code)
            if not a: continue
            db.add(CrmTask(
                company_id=cid, account_id=a.id,
                title=title, priority=prio,
                due_date=now() + timedelta(days=day_offset),
            ))

        # ── Leads (multi-channel inbox demo) ─────────────────────────────
        leads_data = [
            # (source, subject, body, email, phone, country, pax, budget, dests, niche, lang, score, status, days_ago)
            ("email",
             "Demande de devis — Circuit Imperial 10j pour groupe 35 pax",
             "Bonjour, nous cherchons un circuit complet sur les villes impériales pour "
             "un groupe de 35 personnes du 12 au 22 octobre 2026. Budget estimé 1800€/pers. "
             "Merci de nous faire parvenir une proposition.",
             "booking@premiertravel.de", "+4930123456", "DE", 35, 63000,
             ["Marrakech","Fès","Meknès","Rabat"], "leisure", "fr", 82, "new", 1),

            ("webform",
             "Demande formulaire web — Trek Atlas 7j",
             "Intéressés par un trek dans le Haut Atlas, 12 personnes, niveau intermédiaire. "
             "Départ prévu mars 2027. Pas de budget défini mais qualité première.",
             "info@adventureworld.co.uk", "+441632960888", "GB", 12, 15000,
             ["Marrakech","Toubkal","Ouarzazate"], "adventure", "en", 71, "qualified", 4),

            ("whatsapp",
             "WhatsApp — MICE incentive 80 pax Casablanca + Marrakech",
             "Bonjour STOURS, on cherche pour incentive groupe 80 personnes entreprise "
             "tech Paris. 4 nuits Casa + 3 nuits Marrakech, galas, activités team-building. "
             "Budget global ~200k€. Disponible pour appel ?",
             "m.dubois@techcorp.fr", "+33612345678", "FR", 80, 200000,
             ["Casablanca","Marrakech"], "mice", "fr", 95, "qualified", 2),

            ("instagram",
             "DM Instagram — Désert Sahara couple lune de miel",
             "Salut ! On voit vos photos du Sahara, c'est magnifique 😍 On voudrait un "
             "séjour romantique pour notre lune de miel en février, 10 jours. "
             "C'est possible d'avoir des infos ?",
             "luna.rodriguez@gmail.com", "+34612987654", "ES", 2, 4000,
             ["Merzouga","Marrakech","Essaouira"], "luxury", "es", 68, "new", 3),

            ("portal_b2b",
             "B2B Portal — Demande circuit scolaire 45 élèves",
             "Nous représentons un lycée franco-marocain à Lyon. Nous souhaitons organiser "
             "un voyage scolaire au Maroc pour 45 élèves + 5 accompagnateurs, 8 jours. "
             "Période : avril 2027.",
             "voyages@lyceefm.fr", "+33456789012", "FR", 50, 35000,
             ["Casablanca","Fès","Chefchaouen"], "leisure", "fr", 74, "new", 1),

            ("email",
             "RFQ — Desert & Kasbahs private tour 6 pax",
             "Hello, I'm looking for a private tour for 6 people covering the southern route: "
             "Ouarzazate, Draa Valley, Merzouga, Tinghir. 10 nights, 5-star riad style. "
             "Budget around $3500 per person. Can you send a detailed proposal?",
             "j.hartmann@luxeadventures.us", "+12125551234", "US", 6, 21000,
             ["Ouarzazate","Merzouga","Tinghir"], "luxury", "en", 88, "qualified", 5),

            ("whatsapp",
             "WA — Groupe mariage destination 120 invités",
             "Salam, on organise un mariage destination au Maroc pour 120 personnes "
             "dont 80% français. 4 nuits minimum, tout inclus. Budget 150-200k€. "
             "Vous faites ça ?",
             "karim.benali@gmail.com", "+33698765432", "FR", 120, 180000,
             ["Marrakech","Agadir"], "mice", "fr", 91, "qualified", 6),

            ("email",
             "Spam — Free trip offer",
             "Congratulations! You've won a free vacation. Click here...",
             "noreply@spam123.xyz", None, "XX", None, None,
             [], None, "en", 5, "spam", 10),

            ("webform",
             "Contact — Circuit nord Maroc 5j semaine",
             "Bonjour, je voyage seul, je cherche quelque chose de sympa dans le nord "
             "(Tanger, Chefchaouen, Tetouan) sur 5 jours en juillet. Budget limité 600€.",
             "paul.leclerc@hotmail.fr", None, "FR", 1, 600,
             ["Tanger","Chefchaouen","Tétouan"], "leisure", "fr", 42, "new", 2),

            ("portal_b2b",
             "B2B — Série de voyages COMEX 2027 (4 groupes)",
             "Bonjour, je suis chef de projet voyages chez Schneider Electric France. "
             "Nous planifions 4 voyages incentive au Maroc en 2027 (Q1→Q4), groupes de "
             "25-40 pers chacun. Je cherche un partenaire DMC unique pour toute la série.",
             "claire.fontaine@schneider.com", "+33145678901", "FR", 35, 320000,
             ["Marrakech","Fès","Agadir","Casablanca"], "mice", "fr", 97, "converted", 15),

            ("instagram",
             "DM — Circuit famille avec enfants 14j",
             "Bonjour, famille de 5 avec 3 enfants (5-12 ans). On adore le Maroc et on "
             "veut faire un grand tour cet été. 14 jours, peut-être 4500€ pour nous tous ?",
             "sophie.bernard@orange.fr", "+33712345678", "FR", 5, 4500,
             ["Marrakech","Fès","Merzouga","Agadir"], "leisure", "fr", 65, "new", 1),

            ("email",
             "Enquiry — Morocco Cycling Tour 8 days 20 cyclists",
             "Hi, I represent a cycling club from Netherlands. We want to organize a "
             "self-supported cycling tour in Atlas Mountains for 20 riders, 8 days. "
             "We need logistics, hotels on route, support vehicle. Budget €1200/person.",
             "tours@cyclingclub.nl", "+31612345678", "NL", 20, 24000,
             ["Marrakech","Ourika","Toubkal","Ouarzazate"], "adventure", "en", 79, "qualified", 7),
        ]

        leads_objs = []
        for (source, subject, body, email, phone, country, pax, budget,
             dests, niche, lang, score, status, days_ago) in leads_data:

            score_breakdown = None
            if score > 0:
                score_breakdown = {
                    "budget": min(30, int(score * 0.35)),
                    "pax": min(25, int(score * 0.30)),
                    "urgency": min(20, int(score * 0.20)),
                    "completeness": min(15, int(score * 0.15)),
                }

            qualified_at = None
            converted_at = None
            if status in ("qualified", "converted"):
                qualified_at = now() - timedelta(days=days_ago - 1)
            if status == "converted":
                converted_at = now() - timedelta(days=max(1, days_ago - 2))

            lead = CrmLead(
                company_id=cid,
                source=source,
                subject=subject,
                body=body,
                extracted_email=email,
                extracted_phone=phone,
                extracted_country=country,
                extracted_pax=pax,
                extracted_budget=budget,
                extracted_destinations=dests if dests else None,
                extracted_niche=niche,
                extracted_language=lang,
                score=score,
                score_breakdown=score_breakdown,
                status=status,
                received_at=now() - timedelta(days=days_ago),
                qualified_at=qualified_at,
                converted_at=converted_at,
                raw_payload={"channel": source, "seeded": True},
            )
            db.add(lead)
            leads_objs.append(lead)

        db.flush()

        # ── Nurturing Sequences ───────────────────────────────────────────
        seq_data = [
            (
                "Bienvenue nouveau compte B2B",
                "account_created",
                "Séquence de bienvenue envoyée automatiquement à chaque nouveau compte B2B.",
                True,
                [
                    {"day": 0,  "type": "email", "subject": "Bienvenue chez S'TOURS DMC Maroc",
                     "body": "Bonjour {contact_name},\n\nNous sommes ravis de vous compter parmi "
                             "nos partenaires. Découvrez notre catalogue 2026 en pièce jointe.\n\n"
                             "À très bientôt,\nL'équipe S'TOURS"},
                    {"day": 3,  "type": "email", "subject": "Nos destinations phares 2026",
                     "body": "Circuits Sahara, Impérial, Atlas Aventure — voici nos best-sellers."},
                    {"day": 7,  "type": "task",  "subject": "Appel de bienvenue J+7",
                     "body": "Appeler le contact pour présenter l'équipe et comprendre les besoins."},
                    {"day": 14, "type": "email", "subject": "Témoignages clients & NPS",
                     "body": "Découvrez ce que nos partenaires disent de nous..."},
                ],
            ),
            (
                "Réactivation comptes inactifs (hibernating)",
                "rfm_segment_hibernating",
                "Envoyée quand un compte passe en segment RFM 'hibernating' (inactif > 180j).",
                True,
                [
                    {"day": 0,  "type": "email", "subject": "Cela fait longtemps… On pense à vous !",
                     "body": "Bonjour {contact_name},\n\nNous n'avons pas eu de vos nouvelles "
                             "depuis un moment. Voici nos nouveautés 2026 et une offre spéciale "
                             "partenaire fidèle : -5% sur votre prochain devis."},
                    {"day": 5,  "type": "email", "subject": "Nouveaux circuits exclusifs S'TOURS",
                     "body": "Circuit Sahara by Night, Escapade Chefchaouen, Atlas Trek Premium..."},
                    {"day": 10, "type": "task",  "subject": "Appel de ré-activation",
                     "body": "Appeler pour comprendre pourquoi le compte est inactif + offrir un devis gratuit."},
                    {"day": 20, "type": "email", "subject": "Dernière chance — offre partenaire expirante",
                     "body": "Votre remise partenaire de 5% expire dans 10 jours. Profitez-en !"},
                ],
            ),
            (
                "Post-voyage — NPS & fidélisation",
                "trip_completed",
                "Envoyée automatiquement 2 jours après la fin d'un voyage (deal 'completed').",
                True,
                [
                    {"day": 2,  "type": "email", "subject": "Votre retour compte pour nous !",
                     "body": "Bonjour {contact_name},\n\nNous espérons que votre groupe a vécu "
                             "une expérience inoubliable au Maroc. Pourriez-vous partager votre "
                             "avis en 2 minutes ? {nps_link}"},
                    {"day": 5,  "type": "email", "subject": "Merci pour votre confiance",
                     "body": "Votre note nous a été transmise. Voici nos nouvelles dates pour 2027."},
                    {"day": 30, "type": "task",  "subject": "Appel early-bird 2027",
                     "body": "Proposer les dates de la saison suivante avec early-bird -8%."},
                    {"day": 60, "type": "email", "subject": "Préparez votre prochain voyage Maroc",
                     "body": "La saison 2027 se remplit vite — réservez vos dates dès maintenant."},
                ],
            ),
            (
                "Acompte reçu — Onboarding opérationnel",
                "deposit_received",
                "Envoyée dès réception de l'acompte pour rassurer le client et préparer l'opérationnel.",
                True,
                [
                    {"day": 0,  "type": "email", "subject": "✅ Acompte reçu — votre voyage est confirmé !",
                     "body": "Bonjour {contact_name},\n\nNous confirmons la réception de votre acompte. "
                             "Votre voyage est officiellement réservé. Un chef de projet ops vous "
                             "contactera sous 48h avec le planning détaillé."},
                    {"day": 1,  "type": "task",  "subject": "Assigner chef de projet ops",
                     "body": "Affecter un chef de projet opérationnel et créer le dossier de voyage."},
                    {"day": 3,  "type": "email", "subject": "Planning préliminaire de votre voyage",
                     "body": "Voici le planning J-1 à J+N avec hôtels, transferts et activités confirmés."},
                    {"day": 7,  "type": "email", "subject": "Check-list documents participants",
                     "body": "Merci de nous envoyer la liste des participants avec passeports avant J-30."},
                ],
            ),
        ]

        seqs = []
        for (name, trigger, desc, is_active, steps) in seq_data:
            seq = CrmNurturingSequence(
                company_id=cid,
                name=name,
                trigger=trigger,
                description=desc,
                is_active=is_active,
                steps=steps,
            )
            db.add(seq)
            seqs.append(seq)
        db.flush()

        # ── Nurturing Runs (attach active runs to some accounts) ──────────
        # Bienvenue sequence → 3 newer accounts
        bienvenue_seq = seqs[0]
        hibernating_seq = seqs[1]

        for a in accounts[:3]:
            db.add(CrmNurturingRun(
                sequence_id=bienvenue_seq.id,
                account_id=a.id,
                current_step=2,
                status="running",
                started_at=now() - timedelta(days=7),
                next_step_at=now() + timedelta(days=7),
            ))

        # Hibernating sequence → 2 at-risk accounts
        at_risk = [a for a in accounts if a.lifecycle_stage in ("at_risk", "hibernating")]
        for a in at_risk[:2]:
            db.add(CrmNurturingRun(
                sequence_id=hibernating_seq.id,
                account_id=a.id,
                current_step=1,
                status="running",
                started_at=now() - timedelta(days=5),
                next_step_at=now() + timedelta(days=5),
            ))

        # Post-voyage completed run for champion accounts
        post_voyage_seq = seqs[2]
        champions = [a for a in accounts if a.lifecycle_stage == "champion"]
        for a in champions[:2]:
            db.add(CrmNurturingRun(
                sequence_id=post_voyage_seq.id,
                account_id=a.id,
                current_step=4,
                status="completed",
                started_at=now() - timedelta(days=62),
                completed_at=now() - timedelta(days=2),
                next_step_at=None,
            ))

        db.commit()
        print(f"✅ Seed CRM OK:")
        print(f"   {len(accounts)} comptes")
        print(f"   {db.query(CrmContact).filter(CrmContact.company_id==cid).count()} contacts")
        print(f"   {db.query(CrmDeal).filter(CrmDeal.company_id==cid).count()} deals")
        print(f"   {db.query(CrmActivity).filter(CrmActivity.company_id==cid).count()} activités")
        print(f"   {db.query(CrmTask).filter(CrmTask.company_id==cid).count()} tâches")
        print(f"   {db.query(CrmLead).filter(CrmLead.company_id==cid).count()} leads")
        print(f"   {db.query(CrmNurturingSequence).filter(CrmNurturingSequence.company_id==cid).count()} séquences nurturing")
        print(f"   {db.query(CrmNurturingRun).filter(CrmNurturingRun.sequence_id.in_([s.id for s in seqs])).count()} runs nurturing")
    finally:
        db.close()


if __name__ == "__main__":
    main()
