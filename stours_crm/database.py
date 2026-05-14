"""
STOURS DMC - Base de données SQLite
Gestion des clients, voyages, devis et réservations
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "stours_crm.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    c = conn.cursor()

    c.execute("""
        CREATE TABLE IF NOT EXISTS clients (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            nom         TEXT NOT NULL,
            prenom      TEXT NOT NULL,
            email       TEXT UNIQUE,
            telephone   TEXT,
            nationalite TEXT,
            passeport   TEXT,
            adresse     TEXT,
            notes       TEXT,
            date_creation TEXT DEFAULT (datetime('now')),
            actif       INTEGER DEFAULT 1
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS voyages (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            nom          TEXT NOT NULL,
            destination  TEXT NOT NULL,
            duree_jours  INTEGER,
            description  TEXT,
            prix_base    REAL,
            categorie    TEXT,
            actif        INTEGER DEFAULT 1,
            date_creation TEXT DEFAULT (datetime('now'))
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS devis (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            reference     TEXT UNIQUE,
            client_id     INTEGER REFERENCES clients(id),
            voyage_id     INTEGER REFERENCES voyages(id),
            nb_personnes  INTEGER DEFAULT 1,
            date_depart   TEXT,
            date_retour   TEXT,
            prix_total    REAL,
            statut        TEXT DEFAULT 'En attente',
            notes         TEXT,
            date_creation TEXT DEFAULT (datetime('now'))
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS reservations (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            reference     TEXT UNIQUE,
            devis_id      INTEGER REFERENCES devis(id),
            client_id     INTEGER REFERENCES clients(id),
            voyage_id     INTEGER REFERENCES voyages(id),
            nb_personnes  INTEGER DEFAULT 1,
            date_depart   TEXT,
            date_retour   TEXT,
            prix_total    REAL,
            acompte       REAL DEFAULT 0,
            solde         REAL DEFAULT 0,
            statut        TEXT DEFAULT 'Confirmée',
            notes         TEXT,
            date_creation TEXT DEFAULT (datetime('now'))
        )
    """)

    c.execute("SELECT COUNT(*) FROM clients")
    if c.fetchone()[0] == 0:
        _insert_demo_data(c)

    conn.commit()
    conn.close()


def _insert_demo_data(c):
    clients = [
        ("Dupont", "Jean", "jean.dupont@email.fr", "+33612345678", "Française", "FR123456", "Paris, France", "Client fidèle"),
        ("Müller", "Hans", "hans.muller@email.de", "+49171234567", "Allemande", "DE789012", "Berlin, Allemagne", "Groupe de 4"),
        ("Al-Rashid", "Omar", "omar@email.ae", "+971501234567", "Emiratie", "AE345678", "Dubaï, EAU", "VIP"),
        ("Martin", "Sophie", "sophie.martin@email.fr", "+33698765432", "Française", "FR654321", "Lyon, France", ""),
        ("Smith", "John", "john.smith@email.uk", "+447700123456", "Britannique", "UK901234", "Londres, UK", "Lune de miel"),
    ]
    c.executemany(
        "INSERT INTO clients (nom,prenom,email,telephone,nationalite,passeport,adresse,notes) VALUES (?,?,?,?,?,?,?,?)",
        clients
    )

    voyages = [
        ("Circuit Impérial", "Fès, Meknès, Marrakech", 8, "Les villes impériales du Maroc", 1200.0, "Culture"),
        ("Désert & Dunes", "Merzouga, Zagora", 5, "Bivouac et randonnée dans le désert", 950.0, "Aventure"),
        ("Côte Atlantique", "Essaouira, Agadir, Dakhla", 7, "Surf et détente sur la côte", 1100.0, "Plage"),
        ("Atlas & Tribus", "Marrakech, Ourika, Imlil", 4, "Randonnée et rencontre culturelle", 750.0, "Nature"),
        ("Marrakech Prestige", "Marrakech", 3, "Séjour luxe à Marrakech", 1500.0, "Luxe"),
        ("Grand Tour Maroc", "Casablanca, Fès, Chefchaouen, Marrakech", 12, "Tour complet du Maroc", 2200.0, "Culture"),
    ]
    c.executemany(
        "INSERT INTO voyages (nom,destination,duree_jours,description,prix_base,categorie) VALUES (?,?,?,?,?,?)",
        voyages
    )

    devis_data = [
        ("DEV-2026-001", 1, 1, 2, "2026-06-15", "2026-06-23", 2400.0, "Confirmé", ""),
        ("DEV-2026-002", 2, 2, 4, "2026-07-10", "2026-07-15", 3800.0, "En attente", "Groupe famille"),
        ("DEV-2026-003", 3, 5, 1, "2026-08-01", "2026-08-04", 1500.0, "Envoyé", "Client VIP"),
        ("DEV-2026-004", 4, 3, 2, "2026-06-20", "2026-06-27", 2200.0, "En attente", ""),
        ("DEV-2026-005", 5, 6, 2, "2026-09-05", "2026-09-17", 4400.0, "Confirmé", "Lune de miel"),
    ]
    c.executemany(
        "INSERT INTO devis (reference,client_id,voyage_id,nb_personnes,date_depart,date_retour,prix_total,statut,notes) VALUES (?,?,?,?,?,?,?,?,?)",
        devis_data
    )

    reservations_data = [
        ("RES-2026-001", 1, 1, 1, 2, "2026-06-15", "2026-06-23", 2400.0, 720.0, 1680.0, "Confirmée", ""),
        ("RES-2026-002", 5, 3, 5, 2, "2026-09-05", "2026-09-17", 4400.0, 1320.0, 3080.0, "Confirmée", "Lune de miel"),
    ]
    c.executemany(
        "INSERT INTO reservations (reference,devis_id,client_id,voyage_id,nb_personnes,date_depart,date_retour,prix_total,acompte,solde,statut,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        reservations_data
    )


# ─── CLIENTS ───────────────────────────────────────────────────────────────────

def get_all_clients():
    conn = get_connection()
    rows = conn.execute("SELECT * FROM clients ORDER BY nom, prenom").fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_client(client_id):
    conn = get_connection()
    row = conn.execute("SELECT * FROM clients WHERE id=?", (client_id,)).fetchone()
    conn.close()
    return dict(row) if row else None

def add_client(nom, prenom, email, telephone, nationalite, passeport, adresse, notes):
    conn = get_connection()
    conn.execute(
        "INSERT INTO clients (nom,prenom,email,telephone,nationalite,passeport,adresse,notes) VALUES (?,?,?,?,?,?,?,?)",
        (nom, prenom, email, telephone, nationalite, passeport, adresse, notes)
    )
    conn.commit()
    conn.close()

def update_client(client_id, nom, prenom, email, telephone, nationalite, passeport, adresse, notes):
    conn = get_connection()
    conn.execute(
        "UPDATE clients SET nom=?,prenom=?,email=?,telephone=?,nationalite=?,passeport=?,adresse=?,notes=? WHERE id=?",
        (nom, prenom, email, telephone, nationalite, passeport, adresse, notes, client_id)
    )
    conn.commit()
    conn.close()

def delete_client(client_id):
    conn = get_connection()
    conn.execute("DELETE FROM clients WHERE id=?", (client_id,))
    conn.commit()
    conn.close()


# ─── VOYAGES ───────────────────────────────────────────────────────────────────

def get_all_voyages():
    conn = get_connection()
    rows = conn.execute("SELECT * FROM voyages ORDER BY nom").fetchall()
    conn.close()
    return [dict(r) for r in rows]

def add_voyage(nom, destination, duree, description, prix, categorie):
    conn = get_connection()
    conn.execute(
        "INSERT INTO voyages (nom,destination,duree_jours,description,prix_base,categorie) VALUES (?,?,?,?,?,?)",
        (nom, destination, duree, description, prix, categorie)
    )
    conn.commit()
    conn.close()

def update_voyage(vid, nom, destination, duree, description, prix, categorie):
    conn = get_connection()
    conn.execute(
        "UPDATE voyages SET nom=?,destination=?,duree_jours=?,description=?,prix_base=?,categorie=? WHERE id=?",
        (nom, destination, duree, description, prix, categorie, vid)
    )
    conn.commit()
    conn.close()


# ─── DEVIS ─────────────────────────────────────────────────────────────────────

def get_all_devis():
    conn = get_connection()
    rows = conn.execute("""
        SELECT d.*, c.nom||' '||c.prenom as client_nom, v.nom as voyage_nom
        FROM devis d
        LEFT JOIN clients c ON d.client_id = c.id
        LEFT JOIN voyages v ON d.voyage_id = v.id
        ORDER BY d.date_creation DESC
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def add_devis(reference, client_id, voyage_id, nb_personnes, date_depart, date_retour, prix_total, statut, notes):
    conn = get_connection()
    conn.execute(
        "INSERT INTO devis (reference,client_id,voyage_id,nb_personnes,date_depart,date_retour,prix_total,statut,notes) VALUES (?,?,?,?,?,?,?,?,?)",
        (reference, client_id, voyage_id, nb_personnes, date_depart, date_retour, prix_total, statut, notes)
    )
    conn.commit()
    conn.close()

def update_devis_statut(devis_id, statut):
    conn = get_connection()
    conn.execute("UPDATE devis SET statut=? WHERE id=?", (statut, devis_id))
    conn.commit()
    conn.close()


# ─── RÉSERVATIONS ──────────────────────────────────────────────────────────────

def get_all_reservations():
    conn = get_connection()
    rows = conn.execute("""
        SELECT r.*, c.nom||' '||c.prenom as client_nom, v.nom as voyage_nom
        FROM reservations r
        LEFT JOIN clients c ON r.client_id = c.id
        LEFT JOIN voyages v ON r.voyage_id = v.id
        ORDER BY r.date_depart ASC
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def add_reservation(reference, devis_id, client_id, voyage_id, nb_personnes,
                    date_depart, date_retour, prix_total, acompte, statut, notes):
    solde = prix_total - acompte
    conn = get_connection()
    conn.execute(
        "INSERT INTO reservations (reference,devis_id,client_id,voyage_id,nb_personnes,date_depart,date_retour,prix_total,acompte,solde,statut,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        (reference, devis_id, client_id, voyage_id, nb_personnes, date_depart, date_retour, prix_total, acompte, solde, statut, notes)
    )
    conn.commit()
    conn.close()


# ─── STATS DASHBOARD ───────────────────────────────────────────────────────────

def get_stats():
    conn = get_connection()
    stats = {}
    stats["nb_clients"]       = conn.execute("SELECT COUNT(*) FROM clients").fetchone()[0]
    stats["nb_voyages"]       = conn.execute("SELECT COUNT(*) FROM voyages").fetchone()[0]
    stats["nb_devis"]         = conn.execute("SELECT COUNT(*) FROM devis").fetchone()[0]
    stats["nb_reservations"]  = conn.execute("SELECT COUNT(*) FROM reservations").fetchone()[0]
    ca = conn.execute("SELECT COALESCE(SUM(prix_total),0) FROM reservations").fetchone()[0]
    stats["chiffre_affaires"] = ca
    acomptes = conn.execute("SELECT COALESCE(SUM(acompte),0) FROM reservations").fetchone()[0]
    stats["acomptes_recus"]   = acomptes
    stats["solde_restant"]    = ca - acomptes

    rows = conn.execute("SELECT statut, COUNT(*) as n FROM devis GROUP BY statut").fetchall()
    stats["devis_statuts"] = {r["statut"]: r["n"] for r in rows}

    rows = conn.execute("""
        SELECT v.nom, COUNT(*) as n, SUM(r.prix_total) as ca
        FROM reservations r JOIN voyages v ON r.voyage_id=v.id
        GROUP BY v.nom ORDER BY ca DESC
    """).fetchall()
    stats["res_par_voyage"] = [dict(r) for r in rows]

    rows = conn.execute("SELECT nationalite, COUNT(*) as n FROM clients GROUP BY nationalite ORDER BY n DESC").fetchall()
    stats["clients_nationalite"] = [dict(r) for r in rows]

    conn.close()
    return stats
