# RIHLA CRM — Roadmap de développement DMC Tourism

> **Cible** : transformer le CRM générique actuel en un CRM **DMC-tourism grade**, aligné sur les pratiques des tour-opérateurs internationaux (Voyageurs du Monde, Audley, Abercrombie & Kent, Black Tomato).
>
> **Effort total** : ~34 h dev en 4 phases séquentielles.
> **Mode** : démo activé partout (mailbox / webform / WhatsApp / IG simulés). Aucun credential externe nécessaire.
> **Branche cible** : `feature/automations-a1-a12` (continuation).

---

## 0. État actuel — Audit

### Backend (`backend/app/modules/crm/`, ~1 100 lignes)

**5 entités SQLAlchemy** :
| Table | Rôle | Champs principaux |
|---|---|---|
| `crm_accounts` | Comptes B2B / clients directs | code, name, account_type (agency/tour_operator/direct/corporate/mice), country, language, tier (bronze→platinum), lifecycle_stage, health_score, nps_score, tags, preferences |
| `crm_contacts` | Personnes dans un compte | first/last_name, title, email, phone, mobile, whatsapp, linkedin, is_primary, is_decision_maker |
| `crm_activities` | Timeline événements | account_id, kind (call/meeting/email/note/status_change), subject, body, outcome, scheduled_at |
| `crm_deals` | Opportunités commerciales | account_id, name, value, currency, stage, probability, expected_close_at, lost_reason |
| `crm_tasks` | Tâches assignées | title, owner_user_id, due_at, priority, status, related_account/deal_id |

**26 endpoints REST** (`/api/crm/*`) :
- CRUD accounts/contacts/activities/deals/tasks
- `GET /accounts/{id}/360` → vue Account 360
- `GET /pipeline` → vue Kanban deals
- `POST /deals/{id}/win|lose`
- `GET /dashboard` → KPIs CRM

### Frontend (`frontend/src/pages/`)

| Page | Rôle | Lignes |
|---|---|---|
| `CrmPage.tsx` | Liste comptes + filtres + KPIs | 450 |
| `CrmPipelinePage.tsx` | Kanban deals par étape | 225 |
| `CrmTasksPage.tsx` | Liste tâches commerciales | 200 |
| `CrmAccountDetailPage.tsx` | Account 360 (basique) | 817 |

### Hooks A1-A12 déjà branchés

L'engine d'automatisations (`backend/app/modules/automations/engine.py`) déclenche déjà :
- `inquiry.received` → A1 + A2 (auto-réponse + tâche qualif)
- `quote.sent` → A3 + A4 + A5 (follow-up J+2 / J+5+appel / bascule LOST J+10)
- `deal.won` → A6 (Booking auto + 5 tâches ops + voucher)
- `task.overdue` → A10 (notif manager J+1)
- `account.at_risk` → A11 (tâche CSM + alerte direction)
- `payment.received` → A12 (bascule CONFIRMED + voucher)

---

## 🔴 Gaps DMC-tourism critiques

### 1. Lead capture multi-canal — INEXISTANT
**Aujourd'hui** : 1 seule entrée manuelle via formulaire interne.

**Réalité S'TOURS** :
- Mailbox `a.chakir@stours.ma` reçoit 70 % des demandes (anglais/français/espagnol)
- WhatsApp Business : agences B2B + clients directs marocains
- Webform `stours.ma/contact`
- Salons & foires (ITB Berlin, IFTM Paris, FITUR Madrid, WTM London) → scan QR
- Instagram DM (`@stours.voyages`)
- Référencements via Google Business / TripAdvisor / Booking
- Portail B2B `portal.stours.ma` (existe déjà — non câblé au CRM)

**Impact** : leads perdus, pas de vue unifiée, scoring impossible.

### 2. Lead scoring tourism-aware — INEXISTANT
**Aujourd'hui** : aucun score, assignation manuelle.

**Besoins DMC** : pondération
- **Pays origine** (US/UK/AU/DE = ×1.5 vs MA = ×0.6)
- **Budget déclaré** (>10K€ → +30 pts)
- **Saison** (haute saison oct-mai = ×1.3 vs août = ×0.7)
- **Niche** (luxe/MICE/incentive/family/honeymoon)
- **Repeat customer** (existe en base ? +20 pts)
- **Source canal** (référencement = ×1.4 vs cold mail = ×0.8)
- **Délai départ** (J-90 = +20 pts vs J-30 = -10 pts)

**Impact** : assignation auto par langue + seniority commercial = qualification 10× plus rapide.

### 3. Account 360° complet — PARTIEL
**Aujourd'hui** : contacts + activités + deals.

**Manque** :
- Pax cumulés (sum across all trips)
- CA cumulé (lifetime value)
- Marge moyenne par voyage
- NPS history (graphique)
- Top 3 destinations préférées
- Top 5 fournisseurs préférés
- Photos voyages (album)
- RFM segment auto
- Préférences détaillées (régime alim, accessibilité, langues guides, niveau hôtel)

**Impact** : commercial ne voit pas l'historique → impossible de personnaliser un re-pitch.

### 4. Pipeline DMC-specific — TROP GÉNÉRIQUE
**Aujourd'hui** : étapes génériques (lead/qualif/proposal/negotiation/won/lost).

**Pipeline DMC réel** doit avoir :
1. **Brief reçu** (inquiry parsée)
2. **Brief qualifié** (commercial a appelé)
3. **Cotation V1 envoyée**
4. **Relance J+2** auto (A3)
5. **Relance J+5 + appel** (A4)
6. **Cotation V2** (révision selon retour client)
7. **Décision / acompte demandé**
8. **Acompte reçu** (booking confirmé)
9. **Opérations en cours** (J-7 / J-1 / J0 / live)
10. **Voyage réalisé / NPS J+3**

**Impact** : conversion par étape mesurable, gates auto, équipe alignée sur le funnel réel.

### 5. Segmentation RFM tourism — INEXISTANT
**Aujourd'hui** : tier manuel (bronze/silver/gold/platinum).

**Segments auto à calculer** (cron quotidien) :
- **Champion** : last_trip < 6 mois ET trips_count ≥ 3 ET CA cumulé > 50K€
- **Loyal** : last_trip < 12 mois ET trips_count ≥ 2
- **Promising** : 1 voyage récent < 6 mois OU 3+ devis dont 1 gagné
- **At Risk** : last_trip 12-24 mois ET trips_count ≥ 2 (ex-loyal qui dérive)
- **Hibernating** : last_trip > 24 mois OU 0 voyage et 0 contact > 6 mois
- **New** : créé < 90 j et 0 voyage encore

**Impact** : campagnes ciblées par segment, alertes At Risk → A11 (already exists), retargeting Hibernating.

### 6. Nurturing automatisé — A1-A12 incomplets
**Aujourd'hui** : A1-A12 couvrent les triggers ponctuels (inquiry / quote / deal / payment).

**Manque les séquences temporelles** :
- **Welcome series** (7 jours après création account, 4 emails dont 1 brochure marque)
- **Pre-trip checklist** J-30 / J-14 / J-7 (visa, vols, météo, valise)
- **Post-trip thank-you** J+1 (mail + photo album link)
- **Post-trip cross-sell** J+90 (autre destination Maroc / Maghreb)
- **Anniversary** J+365 (anniv 1 an du voyage = re-engagement luxe)
- **Re-engagement Hibernating** (offre dédiée 3 fois/an)

**Impact** : retention ×2-3, lifetime value en croissance organique.

### 7. Reporting commercial — INEXISTANT
**Aujourd'hui** : `/dashboard` simple (compteurs).

**Manque** :
- Revenue per agent commercial
- Conversion rate par marché (US/UK/FR/MA)
- Win rate vs concurrence (Giant Tour, Ya Voyages, Maroc DMC)
- Win/loss reasons (free-text + tags : "trop cher", "timing", "concurrent moins cher", "langue indispo")
- NPS par destination / par guide
- Churn rate (% Hibernating qui passent à dormant absolu)
- Leaderboard ventes (déjà existe en gamification — connecter)
- Forecast trimestriel par segment

### 8. Mobile commercial déconnecté
**Aujourd'hui** : app `Travel Designer` (HTML) montre Sara Alaoui · 8 dossiers · 142K€ CA → **données mock**.

**Besoin** : que l'app pousse les vrais accounts/deals/tasks via `/api/crm/*` filtrés par owner_user_id.

---

## 📋 Plan de développement — 4 phases

### Phase CRM-1 — Account 360° enrichi + RFM (8 h) ⭐⭐⭐⭐⭐

**Pourquoi en premier** : c'est la fondation. Tous les autres modules s'appuient sur un Account 360 solide.

#### Backend
- **Migration Alembic** : ajouter colonnes computed sur `crm_accounts` :
  - `pax_cumul: int`
  - `ca_cumul: Numeric(14,2)`
  - `margin_avg_pct: Numeric(5,2)`
  - `trips_count: int`
  - `last_trip_at: Date`
  - `nps_avg: Numeric(4,1)`
  - `lifetime_value: Numeric(14,2)`
  - `rfm_segment: String(20)` indexé (champion/loyal/promising/at_risk/hibernating/new)
  - `rfm_score: String(3)` (e.g. "555", "143")
  - `top_destinations: JSON` (top 3)
  - `top_suppliers: JSON` (top 5)
  - `last_recompute_at: DateTime`
- **Module `crm/scoring.py`** :
  - `recompute_account_metrics(account_id, db)` — recalcule tous les computed
  - `recompute_rfm_segment(account, db)` — classement Champion/Loyal/etc.
  - `recompute_all_accounts(db)` — cron job
- **Endpoints** :
  - `POST /api/crm/accounts/{id}/recompute` — manuel (1 compte)
  - `POST /api/crm/recompute-all` — admin / cron
  - `GET /api/crm/segments` — répartition par segment + count par segment
  - `GET /api/crm/accounts/{id}/360-v2` — version enrichie (timeline complète, photos, NPS history graph data, top dest/supp)

#### Frontend
- **Page `CrmAccountDetailPage` redesign** :
  - Header full-width avec avatar + nom + segment badge + tier + KPIs (Pax cumul, CA cumul, LTV, NPS avg)
  - Sidebar gauche : timeline activities/deals/trips (chronologique)
  - Tabs : `Devis` · `Voyages` · `NPS history` (chart) · `Photos` · `Préférences détaillées` · `Documents` · `Contacts` · `Tasks`
  - Bouton "Recalculer 360°" en haut à droite
- **Page `CrmPage` enrichissement** :
  - Filtre `RFM segment` (multi-select)
  - Colonne `Segment` (badge coloré)
  - Colonne `LTV` (currency)
  - Tri par LTV / CA cumul / last_trip_at

#### Tests
- Seed démo : 12 comptes avec voyages historiques (3 champions, 3 loyal, 2 promising, 2 at_risk, 1 hibernating, 1 new)
- POST recompute-all → vérifier segments calculés
- GET /segments → 6 segments avec counts cohérents

#### Captures attendues
- `crm1_account_360.png` — page detail enrichie (timeline + tabs + KPIs)
- `crm1_segments.png` — page liste avec filtre segment + colonnes LTV
- `crm1_recompute.png` — résultat /segments répartition

---

### Phase CRM-2 — Lead Inbox + Scoring IA multi-canal (12 h) ⭐⭐⭐⭐⭐

**Pourquoi** : tu ne perds plus aucun lead. Source de leads × scoring auto × assignation.

#### Backend
- **Nouvelle table `crm_leads`** (avant qualification = avant promote en Account+Deal) :
  - `id, source` (email/webform/whatsapp/instagram/portal_b2b/salon/referral)
  - `subject, body, raw_payload (JSON)`
  - `extracted_email, extracted_phone, extracted_country`
  - `extracted_pax, extracted_budget, extracted_dates, extracted_destinations` (JSON)
  - `extracted_niche` (luxe/mice/family/honeymoon/cultural/adventure)
  - `extracted_language` (fr/en/es/de)
  - `score: int` (0-100)
  - `score_breakdown: JSON` (poids par critère)
  - `assigned_to_user_id` (auto)
  - `status` (new/qualified/converted/spam/rejected)
  - `converted_account_id, converted_deal_id` (si promu)
  - `received_at, qualified_at, converted_at`
- **Module `crm/lead_intake.py`** :
  - `parse_email(raw)` → extract budget/pax/dates/country (regex + LLM fallback)
  - `parse_webform(payload)` → mapping JSON
  - `parse_whatsapp(message)` → extract similar
  - `parse_instagram_dm(payload)`
- **Module `crm/lead_scoring.py`** :
  - `score_lead(lead) → (score:int, breakdown:dict)` règles pondérées :
    ```
    base = 50
    + country_weight (US/UK +20, FR/DE +15, ES +10, MA +5)
    + budget_weight (>10K€ +20, 5-10K +10, <5K +0)
    + season_weight (oct-mai +15, août -10)
    + niche_weight (luxe/MICE +20, family +10)
    + repeat_weight (account exists & trips ≥1 → +20)
    + source_weight (referral +15, webform +10, cold +0)
    + lead_time_weight (J-90 +15, J-30 -10)
    = score (clamped 0-100)
    ```
  - `assign_owner(lead, db)` → match par language préférée + seniority + charge actuelle
- **Endpoints** :
  - `POST /api/crm/leads/ingest/email` (mock M365 sync)
  - `POST /api/crm/leads/ingest/webform` (public, no auth)
  - `POST /api/crm/leads/ingest/whatsapp` (mock WhatsApp Business webhook)
  - `POST /api/crm/leads/ingest/instagram` (mock IG webhook)
  - `POST /api/crm/leads/ingest/portal-b2b` (lien direct depuis B2B portal)
  - `GET /api/crm/leads` (filtres : status, source, score_min, score_max, assigned_to)
  - `GET /api/crm/leads/{id}`
  - `POST /api/crm/leads/{id}/qualify` (status → qualified)
  - `POST /api/crm/leads/{id}/convert` → crée Account + Deal + retourne IDs
  - `POST /api/crm/leads/{id}/reject` (status → rejected, reason)
  - `POST /api/crm/leads/seed-demo` → 25 leads démo multi-sources avec scores variés

#### Frontend — page `LeadInboxPage` (nouvelle)
- Layout 2 colonnes Gmail-style :
  - **Left (40%)** : liste leads triée par score desc avec badge source + score + langue + budget extrait
  - **Right (60%)** : détail lead sélectionné
    - Header : source + score gros + breakdown (chart radar 7 critères)
    - Sections : Brief extrait (pax/budget/dates/destinations/niche), Contact info, Raw payload (collapsible)
    - Actions : "Convertir en Account+Deal" / "Rejeter (spam/qualif faible/déjà existant)"
- **Filtres** : source (multi), score min/max slider, langue, status, assigned_to_me toggle
- **Hook A0 nouveau** dans automations engine : `lead.ingested` → si score ≥ 70 → tâche urgente assigné, score 40-70 → tâche normale, score <40 → review queue

#### Tests
- Seed 25 leads démo (5 par source × 5 sources)
- Vérifier scoring distribution (top 5 = US/UK luxe, bottom 5 = MA <2K€)
- Convert 1 lead → vérifier création Account + Deal cohérente
- Vérifier hook lead.ingested déclenché

#### Captures
- `crm2_inbox.png` — Lead Inbox style Gmail
- `crm2_scoring.png` — radar chart breakdown d'un lead
- `crm2_convert.png` — résultat conversion Account + Deal créés

---

### Phase CRM-3 — Pipeline DMC 10 étapes + automation (6 h) ⭐⭐⭐⭐

#### Backend
- **Migration** : ajouter colonnes sur `crm_deals` :
  - `dmc_stage: String(30)` — 10 valeurs énumérées (brief_received, brief_qualified, quote_v1_sent, follow_up_j2, follow_up_j5, quote_v2_sent, decision_pending, deposit_received, ops_in_progress, completed_nps_sent, lost)
  - `entered_stage_at: DateTime` (pour mesurer time-in-stage)
  - `stage_history: JSON` (array of {stage, entered_at, exited_at, notes})
  - `lost_reason: String(40)` (price/timing/competitor/no_response/visa/other)
  - `lost_competitor: String(120)` (Giant Tour, Ya Voyages, etc.)
  - `expected_pax: int`
  - `expected_departure_at: Date`
- **Endpoints** :
  - `POST /api/crm/deals/{id}/move-stage` (body: stage, notes) → met à jour + log history + déclenche hook `deal.stage_changed`
  - `GET /api/crm/pipeline-dmc` → kanban 10 colonnes avec deals
  - `GET /api/crm/pipeline-dmc/conversion` → conversion rate par étape (entered → moved next)
  - `GET /api/crm/pipeline-dmc/time-in-stage` → moyenne en jours par étape
- **Engine A1-A12 enrichi** : ajouter règles
  - **A13** `quote_v1_sent` → tâche relance J+2 (déjà A3, mais lié au stage)
  - **A14** `follow_up_j5_no_reply` → bascule auto en `lost` après J+10 (déjà A5)
  - **A15** `deposit_received` → bascule auto stage `ops_in_progress` + déclenche A6 (création Booking)
  - **A16** `ops_completed` → bascule `completed_nps_sent` + déclenche A9 (NPS J+3)

#### Frontend — page `CrmPipelineDmcPage` (refactor de l'existante)
- Kanban 10 colonnes scrollables horizontalement
- Chaque colonne : count + somme valeur deals + temps moyen en stage
- Drag-drop entre colonnes (HTML5 native, comme Travel Designer Pro)
- Card deal : nom, account, valeur, pax, départ prévu, age in stage (badge rouge si > seuil)
- Modal au clic : détail deal + history stages + lost reason form
- Sidebar droite : conversion funnel chart (entered → next stage rate %)

#### Captures
- `crm3_pipeline.png` — kanban 10 étapes avec compteurs
- `crm3_conversion.png` — funnel conversion par étape
- `crm3_time_in_stage.png` — chart temps moyen

---

### Phase CRM-4 — Reporting commercial + nurturing séquences (8 h) ⭐⭐⭐⭐

#### Backend
- **Module `crm/reporting.py`** :
  - `revenue_per_agent(period)` → liste users avec CA généré
  - `conversion_by_market(period)` → leads → wins par pays
  - `win_loss_analysis(period)` → win rate + lost reasons groupés
  - `nps_by_destination(period)` → NPS moyen par ville/circuit
  - `nps_by_guide(period)` → NPS par guide (lien avec catalogue)
  - `churn_rate(period)` → % comptes passés en hibernating
  - `forecast_quarterly(quarter)` → projection CA basée sur deals en pipeline × proba
- **Module `crm/nurturing.py`** :
  - Table `crm_nurturing_sequences` : id, name, trigger (account_created/trip_completed/etc.), steps (JSON array)
  - Table `crm_nurturing_runs` : sequence_id, account_id, current_step, next_step_at, status
  - Sequences pré-seedées :
    - **Welcome series** (account_created → 4 emails sur 7 j)
    - **Pre-trip** (deal.deposit_received → 3 emails J-30/J-14/J-7)
    - **Post-trip thank-you** (trip_completed → 1 email J+1)
    - **Cross-sell J+90** (trip_completed → 1 email avec offre destination)
    - **Anniversary J+365** (trip_completed → 1 email anniv)
    - **Re-engagement Hibernating** (rfm_segment=hibernating → 1 email/quarter)
- **Endpoints** :
  - `GET /api/crm/reporting/revenue-per-agent?period=Q1-2026`
  - `GET /api/crm/reporting/conversion-by-market`
  - `GET /api/crm/reporting/win-loss`
  - `GET /api/crm/reporting/nps`
  - `GET /api/crm/reporting/forecast`
  - `GET /api/crm/nurturing/sequences`
  - `POST /api/crm/nurturing/sequences/{id}/toggle`
  - `GET /api/crm/nurturing/runs?account_id=...`

#### Frontend
- **Page `CrmReportingPage`** (nouvelle) :
  - 4 onglets : `Vue exécutive` · `Performance équipe` · `Marchés & Win/Loss` · `NPS & Qualité`
  - Vue exécutive : 6 KPI heroes (CA, conversion, NPS avg, deals actifs, churn, leads /jour) + funnel
  - Équipe : leaderboard agent (CA, # deals won, conversion rate, NPS clients, deals at risk)
  - Marchés : map monde colorée par CA + bar chart conversion par pays + pie lost reasons
  - NPS : line chart NPS sur 12 mois + ranking destinations + ranking guides
- **Page `CrmNurturingPage`** (nouvelle) :
  - Liste 6 sequences avec toggle on/off + nb runs actifs + open rate / click rate (mock)
  - Détail sequence : steps timeline + preview email
  - Filtre runs par compte (qui est dans quelle séquence aujourd'hui)

#### Captures
- `crm4_reporting_overview.png` — vue exécutive 6 KPIs + funnel
- `crm4_team.png` — leaderboard agent
- `crm4_markets.png` — map + win/loss
- `crm4_nps.png` — NPS chart 12 mois
- `crm4_nurturing.png` — 6 sequences

---

## 🎯 Effort & ordre d'exécution

| Phase | Objet | Effort | Cumul |
|---|---|---|---|
| **CRM-1** | Account 360° + RFM | 8 h | 8 h |
| **CRM-2** | Lead Inbox + Scoring | 12 h | 20 h |
| **CRM-3** | Pipeline DMC 10 étapes | 6 h | 26 h |
| **CRM-4** | Reporting + Nurturing | 8 h | 34 h |
| **Package** | ZIP + patch unifié + commits | 30 min | 34.5 h |

## 🚦 Livraison

À la fin de chaque phase :
- 1 commit propre sur `feature/automations-a1-a12` avec message structuré
- 3-5 captures d'écran (PNG) jointes au message user
- Tests live curl OK + `pnpm build` → 0 erreur TS

À la fin des 4 phases :
- ZIP complet code (sans `.git`/`node_modules`/`.venv`/`*.db`)
- Patch unifié `git format-patch master..HEAD` applicable
- Doc mise à jour `RIHLA_CRM_DMC_DELIVERED.md`

## 🔌 Intégrations existantes connectées

- **Engine A1-A12** : nouveaux hooks `lead.ingested`, `deal.stage_changed`, `account.segment_changed`, `trip_completed`
- **Travel Designer Pro** : convert lead → deal → utilise pricing grid déjà existant
- **B2B Portal** : leads via portal counted dans Lead Inbox (source=portal_b2b)
- **Catalogue Premium** : préférences fournisseurs Account 360 lient aux items catalogue
- **Mobile App Travel Designer** : push pipeline DMC + tasks + leads triés via `/api/crm/*` filtrés par owner_user_id (TODO Phase post-CRM-4 si demandé)
- **Gamification Leaderboard** : connecté aux KPIs Phase CRM-4
- **Microsoft 365** (module existant) : webhook M365 → `POST /api/crm/leads/ingest/email`

## ✅ Critères d'acceptation final

1. Login `a.chakir@stours.ma` / `rihla2026` OK
2. `pnpm build` → 0 erreur TS
3. Backend : `alembic upgrade head` OK, tous les nouveaux endpoints répondent 200 sur curl
4. CRM-1 : page Account 360 redesign visible, segments calculés, filtres OK
5. CRM-2 : Lead Inbox affiche 25 leads démo avec scoring distribué, conversion en Account+Deal fonctionne
6. CRM-3 : Pipeline 10 étapes drag-drop fonctionnel, conversion funnel correct
7. CRM-4 : Reporting page rend 4 onglets, nurturing page liste 6 séquences

---

## 📂 Fichiers attendus en sortie

```
backend/app/modules/crm/
├── models.py                   (enrichi : computed cols + lead + nurturing)
├── router.py                   (enrichi : +30 endpoints CRM-1/2/3/4)
├── schemas.py                  (enrichi)
├── scoring.py                  (NEW — RFM + lead scoring)
├── lead_intake.py              (NEW — parsers email/webform/whatsapp/IG)
├── lead_scoring.py             (NEW — règles pondérées)
├── reporting.py                (NEW — revenue, conversion, win/loss, NPS, churn)
└── nurturing.py                (NEW — sequences + runs)

backend/alembic/versions/
├── 0042_crm_account_360.py     (NEW — colonnes computed)
├── 0043_crm_leads.py           (NEW — table leads)
├── 0044_crm_pipeline_dmc.py    (NEW — colonnes deal stage)
└── 0045_crm_nurturing.py       (NEW — sequences + runs)

frontend/src/pages/
├── CrmAccountDetailPage.tsx    (refactor — Account 360 v2)
├── CrmPage.tsx                 (enrichi — filtres segment)
├── CrmPipelineDmcPage.tsx      (NEW — kanban 10 étapes)
├── LeadInboxPage.tsx           (NEW — Lead Inbox style Gmail)
├── CrmReportingPage.tsx        (NEW — 4 onglets reporting)
└── CrmNurturingPage.tsx        (NEW — 6 sequences + runs)

frontend/src/lib/roleConfig.ts  (entrées sidebar)
frontend/src/App.tsx            (routes)
```

---

**Document v1 · 5 mai 2026 · branche `feature/automations-a1-a12`**
