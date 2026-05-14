# CONTEXTE PROJET — STOURS / RIHLA
> Coller ce fichier en début de session Claude pour reprendre le contexte sans perdre de tokens.

---

## 👤 Utilisateur
| Champ | Valeur |
|-------|--------|
| Nom | Chakir |
| Rôle | Infographiste & Développeur Python / SaaS |
| Email | pocodatachakir@gmail.com |
| Agence | **Stours** — DMC Maroc · [stours.ma](https://stours.ma) |
| Langue | Français (réponses en français) |

---

## 🛠️ Stack technique
| Couche | Technologie |
|--------|-------------|
| Langage | Python 3.x |
| Web / SaaS | Flask / FastAPI / Streamlit (à préciser) |
| Frontend | HTML, CSS, JS (généré ou assisté) |
| Base de données | SQLite / PostgreSQL (à confirmer) |
| IA | Claude — Cowork mode (Anthropic) |
| Versioning | Git (à confirmer) |
| Dossier de travail | `RIHLA FINAL` (OneDrive Bureau) |
| OS | Windows (hp zbook) |

---

## 📁 Structure des dossiers
```
RIHLA FINAL/
├── CONTEXTE_STOURS.md   ← ce fichier
├── apps/                ← applications Python
├── saas/                ← projets SaaS web
├── design/              ← assets graphiques
└── docs/                ← documents générés
```

---

## 🚀 Projets en cours
| # | Projet | Statut | Description |
|---|--------|--------|-------------|
| 1 | — | 🔲 À démarrer | — |

<!-- Exemple :
| 1 | Rihla Booking | 🟡 En cours | App de réservation tours pour DMC Stours |
| 2 | Dashboard Admin | 🟢 Livré | Tableau de bord gestion clients |
-->

---

## 📌 Conventions de code
```python
# ── Conventions Python Stours ──────────────────────────
# Encodage        : UTF-8
# Style           : PEP8, fonctions snake_case
# Commentaires    : en français
# Fichiers config : .env (jamais commité)

# Template de démarrage rapide
import os
from dotenv import load_dotenv

load_dotenv()

APP_NAME = "Stours App"
VERSION  = "1.0.0"

def main():
    """Point d'entrée principal."""
    print(f"{APP_NAME} v{VERSION} — Stours DMC Maroc")

if __name__ == "__main__":
    main()
```

---

## ⚙️ Commandes fréquentes (shell)
```bash
# Créer un env virtuel Python
python -m venv venv && source venv/bin/activate  # Linux/Mac
python -m venv venv && venv\Scripts\activate      # Windows

# Installer les dépendances
pip install -r requirements.txt

# Lancer une app Streamlit
streamlit run app.py

# Lancer un serveur FastAPI
uvicorn main:app --reload

# Générer requirements.txt
pip freeze > requirements.txt
```

---

## 🗒️ Notes importantes
<!-- Décisions prises, contraintes, rappels clés -->
- Toujours sauvegarder les fichiers finaux dans `RIHLA FINAL/`
- Les liens de fichiers utilisent le format `computer://` dans Claude
- Préférer les fichiers `.env` pour les clés API (ne jamais les exposer)

---

## 📅 Historique des sessions
| Date | Tâche accomplie |
|------|----------------|
| 2026-05-07 | Création & développement du fichier contexte |

---

*Dernière mise à jour : 2026-05-07*
