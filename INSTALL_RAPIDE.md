# RIHLA — Installation Rapide (Sans Docker)

## Prérequis
- Python 3.11+ installé → https://www.python.org/downloads/
- Node.js 20+ installé → https://nodejs.org/
- Git (optionnel)

---

## Étape 1 — Installer les dépendances Python

```cmd
cd backend
pip install -r requirements.txt
```

## Étape 2 — Initialiser la base de données

```cmd
cd backend
python -m scripts.seed_admin
```

Ce script crée :
- La base SQLite `dev.db`
- Tous les rôles système
- L'utilisateur admin : **a.chakir@stours.ma** / **<mot_de_passe_admin_local>**
- La société STOURS VOYAGES

## Étape 3 — Installer les dépendances frontend

```cmd
cd frontend
npm install
```

## Étape 4 — Lancer les serveurs

**Option A — Double-clic sur START.bat** (recommandé)

**Option B — Manuellement (2 terminaux) :**

Terminal 1 (Backend) :
```cmd
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

Terminal 2 (Frontend) :
```cmd
cd frontend
npm run dev
```

## Accès

| Service | URL |
|---------|-----|
| Application | http://localhost:5173 |
| API Backend | http://localhost:8000 |
| Swagger Docs | http://localhost:8000/docs |

**Connexion :**
- Email : `a.chakir@stours.ma`
- Password : `<mot_de_passe_admin_local>`

---

## Avec Docker (optionnel)

```bash
docker compose up
```

Attendre ~2 min que la DB soit prête, puis ouvrir http://localhost:5173
