"""Jinja2 HTML/CSS template for the Circuit Comparator PDF.

Generates a 3-column branded PDF (Luxe · Confort · Essentiel) with:
  - Cover page  (route, duration, date, S'TOURS navy/gold branding)
  - Comparison matrix table (highlight savings percentage)
  - Per-tier programme  (day-by-day cards, side-by-side with coloured headers)
  - Pricing grids per pax range
  - Standard T&Cs + CTA block

Rendered via WeasyPrint (weasyprint>=62).  All layout uses print-safe
CSS — no flexbox/grid, only table-based columns to guarantee reliable
multi-column output across WeasyPrint versions.
"""

COMPARATOR_CSS = """
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

:root {
  --navy:       #1B2A4A;
  --navy-light: #2D4A7A;
  --gold:       #C5943A;
  --light-gold: #F5E6CC;
  --luxe-col:   #C5943A;
  --confort-col:#3182CE;
  --essentiel-col:#38A169;
  --bg:         #FFFFFF;
  --text:       #2D3748;
  --text-light: #718096;
  --border:     #E2E8F0;
  --accent-bg:  #F7FAFC;
  --green-bg:   #F0FFF4;
  --green-bdr:  #C6F6D5;
  --red-bg:     #FFF5F5;
  --red-bdr:    #FED7D7;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

@page {
  size: A4 landscape;
  margin: 12mm 14mm 18mm 14mm;
  @bottom-left {
    content: "S'TOURS DMC Morocco  ·  Proposition confidentielle";
    font-family: 'Inter', sans-serif;
    font-size: 7.5pt;
    color: #aaa;
  }
  @bottom-right {
    content: counter(page) " / " counter(pages);
    font-family: 'Inter', sans-serif;
    font-size: 7.5pt;
    color: #aaa;
  }
}

@page cover {
  margin: 0;
  @bottom-left { content: ""; }
  @bottom-right { content: ""; }
}

body {
  font-family: 'Inter', sans-serif;
  font-size: 9.5pt;
  line-height: 1.55;
  color: var(--text);
}

/* ══ Cover ═══════════════════════════════════════════════════════════ */
.cover {
  page: cover;
  page-break-after: always;
  width:  297mm;
  height: 210mm;
  background: linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 60%, #1a3a6a 100%);
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 20mm 30mm;
  position: relative;
  overflow: hidden;
}
.cover::before {
  content: "";
  position: absolute;
  top: -30mm; right: -20mm;
  width: 100mm; height: 100mm;
  border: 15mm solid rgba(197,148,58,0.12);
  border-radius: 50%;
}
.cover::after {
  content: "";
  position: absolute;
  bottom: -20mm; left: -15mm;
  width: 70mm; height: 70mm;
  border: 10mm solid rgba(197,148,58,0.08);
  border-radius: 50%;
}
.cover-badge {
  font-size: 10pt;
  font-weight: 600;
  letter-spacing: 4px;
  text-transform: uppercase;
  color: var(--gold);
  margin-bottom: 5mm;
  opacity: 0.9;
}
.cover-logo {
  font-size: 28pt;
  font-weight: 800;
  color: var(--gold);
  letter-spacing: 6px;
  margin-bottom: 4mm;
  border-bottom: 2px solid var(--gold);
  padding-bottom: 3mm;
}
.cover-title {
  font-size: 22pt;
  font-weight: 700;
  color: white;
  line-height: 1.25;
  margin-bottom: 3mm;
}
.cover-subtitle {
  font-size: 13pt;
  font-weight: 300;
  color: rgba(255,255,255,0.75);
  margin-bottom: 10mm;
}
.cover-chips {
  display: inline-flex;
  gap: 4mm;
  margin-bottom: 12mm;
}
.cover-chip {
  background: rgba(255,255,255,0.12);
  border: 1px solid rgba(197,148,58,0.4);
  border-radius: 3mm;
  padding: 1.5mm 4mm;
  font-size: 9pt;
  font-weight: 500;
  color: rgba(255,255,255,0.9);
}
.cover-meta {
  font-size: 9pt;
  color: rgba(255,255,255,0.6);
  line-height: 2;
}
.cover-date {
  position: absolute;
  bottom: 8mm;
  right: 14mm;
  font-size: 8pt;
  color: rgba(255,255,255,0.45);
}

/* ══ Section headers ════════════════════════════════════════════════ */
.section-title {
  font-size: 14pt;
  font-weight: 700;
  color: var(--navy);
  border-bottom: 3px solid var(--gold);
  padding-bottom: 2.5mm;
  margin: 7mm 0 4mm 0;
}
.section-subtitle {
  font-size: 8.5pt;
  color: var(--text-light);
  margin-bottom: 4mm;
}

/* ══ Savings banner ═════════════════════════════════════════════════ */
.savings-banner {
  background: var(--green-bg);
  border: 1px solid var(--green-bdr);
  border-radius: 3px;
  padding: 3mm 5mm;
  margin-bottom: 5mm;
  text-align: center;
}
.savings-banner .pct {
  font-size: 16pt;
  font-weight: 800;
  color: #276749;
}
.savings-banner .label {
  font-size: 9pt;
  color: #2F855A;
  margin-top: 1mm;
}

/* ══ Comparison matrix ══════════════════════════════════════════════ */
.matrix-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 7mm;
  font-size: 9pt;
}
.matrix-table th {
  background: var(--navy);
  color: white;
  padding: 3mm 4mm;
  text-align: left;
  font-weight: 600;
  font-size: 9pt;
}
.matrix-table th.tier-header {
  text-align: center;
}
.matrix-table td {
  padding: 2.5mm 4mm;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}
.matrix-table tr:nth-child(even) td {
  background: var(--accent-bg);
}
.matrix-table .row-label {
  font-weight: 600;
  color: var(--navy);
  width: 35mm;
  font-size: 8.5pt;
}
.matrix-table td.value-cell {
  text-align: center;
  font-weight: 500;
}
.tier-badge {
  display: inline-block;
  color: white;
  font-weight: 700;
  font-size: 8.5pt;
  padding: 1mm 3mm;
  border-radius: 2mm;
}
.price-big {
  font-size: 12pt;
  font-weight: 800;
}
.savings-cell {
  background: #F0FFF4 !important;
  color: #276749;
  font-weight: 700;
  font-size: 10pt;
}

/* ══ 3-column tier layout ═══════════════════════════════════════════ */
.tiers-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 4mm 0;
  page-break-before: always;
}
.tiers-table td {
  width: 33.3%;
  vertical-align: top;
  padding: 0;
}
.tier-card {
  border: 1.5pt solid var(--border);
  border-radius: 3mm;
  overflow: hidden;
}
.tier-card-header {
  padding: 4mm 5mm;
  color: white;
}
.tier-card-header .tier-name {
  font-size: 14pt;
  font-weight: 800;
  letter-spacing: 1px;
}
.tier-card-header .tier-cat {
  font-size: 9pt;
  font-weight: 400;
  opacity: 0.85;
  margin-top: 1mm;
}
.tier-card-header .tier-price {
  font-size: 18pt;
  font-weight: 900;
  margin-top: 3mm;
}
.tier-card-header .tier-price-sub {
  font-size: 8pt;
  opacity: 0.75;
}
.tier-section-label {
  font-size: 7.5pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--text-light);
  padding: 2.5mm 4mm 1.5mm;
  border-bottom: 1px solid var(--border);
  background: var(--accent-bg);
}
.tier-pricing-grid {
  padding: 2mm 4mm 3mm;
}
.tier-pricing-row {
  display: flex;
  justify-content: space-between;
  font-size: 8.5pt;
  padding: 1mm 0;
  border-bottom: 1px dotted var(--border);
}
.tier-pricing-row:last-child {
  border-bottom: none;
}
.tier-pricing-row .pax-label {
  color: var(--text-light);
}
.tier-pricing-row .price-val {
  font-weight: 700;
  color: var(--text);
}
.tier-pricing-row .margin-val {
  font-size: 7.5pt;
  color: #38A169;
  margin-left: 1.5mm;
}

/* Day cards inside tier columns */
.day-mini {
  padding: 2mm 4mm 2.5mm;
  border-bottom: 1px solid var(--border);
  page-break-inside: avoid;
}
.day-mini:last-child {
  border-bottom: none;
}
.day-mini-header {
  display: flex;
  align-items: baseline;
  gap: 2mm;
  margin-bottom: 0.8mm;
}
.day-num {
  font-size: 8pt;
  font-weight: 700;
  color: white;
  padding: 0.5mm 1.8mm;
  border-radius: 1.5mm;
  min-width: 8mm;
  text-align: center;
}
.day-city-name {
  font-size: 9pt;
  font-weight: 600;
  color: var(--navy);
  flex: 1;
}
.day-hotel-line {
  font-size: 7.5pt;
  color: var(--text-light);
  margin-left: 10mm;
}

/* ══ Pricing detail table ═══════════════════════════════════════════ */
.pricing-table {
  width: 100%;
  border-collapse: collapse;
  margin: 3mm 0;
  font-size: 8.5pt;
}
.pricing-table th {
  background: var(--navy);
  color: white;
  padding: 2mm 3mm;
  text-align: left;
  font-weight: 600;
}
.pricing-table th:not(:first-child), .pricing-table td:not(:first-child) {
  text-align: right;
}
.pricing-table td {
  padding: 2mm 3mm;
  border-bottom: 1px solid var(--border);
}
.pricing-table tr:nth-child(even) td {
  background: var(--accent-bg);
}
.pricing-table .highlight-row td {
  background: var(--light-gold) !important;
  font-weight: 700;
  border-top: 2px solid var(--gold);
}

/* ══ T&Cs + CTA ═════════════════════════════════════════════════════ */
.terms-section {
  page-break-before: always;
  font-size: 8pt;
  color: var(--text-light);
  line-height: 1.55;
}
.terms-section h3 {
  font-size: 9.5pt;
  font-weight: 600;
  color: var(--navy);
  margin: 4mm 0 1.5mm;
}
.terms-section ul {
  margin-left: 4mm;
}
.terms-section li {
  margin-bottom: 0.8mm;
}
.terms-two-col {
  width: 100%;
  border-collapse: separate;
  border-spacing: 5mm 0;
  margin-top: 4mm;
}
.terms-two-col td {
  vertical-align: top;
  width: 50%;
}
.cta-box {
  background: linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%);
  color: white;
  padding: 5mm 7mm;
  border-radius: 3mm;
  text-align: center;
  margin-top: 7mm;
}
.cta-box .cta-title {
  font-size: 12pt;
  font-weight: 700;
  color: var(--gold);
  margin-bottom: 2mm;
}
.cta-box p {
  font-size: 9pt;
  opacity: 0.88;
}
"""

COMPARATOR_HTML = """<!DOCTYPE html>
<html lang="{{ language }}">
<head>
  <meta charset="UTF-8">
  <style>{{ css }}</style>
</head>
<body>

<!-- ══════════════════════════════════════
     COVER PAGE
══════════════════════════════════════ -->
<div class="cover">
  <div class="cover-badge">Proposition commerciale</div>
  <div class="cover-logo">S'TOURS</div>
  <div class="cover-title">{{ route }}</div>
  <div class="cover-subtitle">Comparatif Luxe · Confort · Essentiel</div>
  <div class="cover-chips">
    <span class="cover-chip">{{ duration }}</span>
    <span class="cover-chip">{{ variants|length }} variante{{ 's' if variants|length > 1 else '' }}</span>
    {% if pax_range %}
    <span class="cover-chip">{{ pax_range.min }}–{{ pax_range.max }} pax</span>
    {% endif %}
    <span class="cover-chip">Marge {{ margin_pct }}%</span>
  </div>
  <div class="cover-meta">
    DMC Maroc · Réceptif haut de gamme<br>
    <strong>contact@stours.ma</strong>
  </div>
  <div class="cover-date">Généré le {{ generated_date }}</div>
</div>

<!-- ══════════════════════════════════════
     PAGE 2 — COMPARISON MATRIX
══════════════════════════════════════ -->
<div class="section-title">Matrice de comparaison</div>
<div class="section-subtitle">
  Circuit : {{ route }} · {{ duration }} · Marge appliquée : {{ margin_pct }}%
</div>

{% if price_range and price_range.savings_pct > 0 %}
<div class="savings-banner">
  <div class="pct">{{ price_range.savings_pct }}% d'économie</div>
  <div class="label">entre la formule Luxe ({{ price_range.max|round|int }} €/pers.) et Essentiel ({{ price_range.min|round|int }} €/pers.)</div>
</div>
{% endif %}

<table class="matrix-table">
  <thead>
    <tr>
      <th>Critère</th>
      {% for v in variants %}
      <th class="tier-header">
        <span class="tier-badge" style="background:{{ v.tier_color }}">{{ v.tier_label }}</span>
      </th>
      {% endfor %}
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="row-label">Catégorie hôtel</td>
      {% for v in variants %}
      <td class="value-cell">{{ v.hotel_category }}</td>
      {% endfor %}
    </tr>
    <tr>
      <td class="row-label">Plan repas</td>
      {% for v in variants %}
      <td class="value-cell">{{ meal_plan_labels.get(v.meal_plan, v.meal_plan) }}</td>
      {% endfor %}
    </tr>
    <tr>
      <td class="row-label">Services inclus</td>
      {% for v in variants %}
      <td class="value-cell">{{ v.services|length }}</td>
      {% endfor %}
    </tr>
    <tr>
      <td class="row-label">Extras luxe</td>
      {% for v in variants %}
      <td class="value-cell">{{ "✓" if v.tier == "luxe" else "—" }}</td>
      {% endfor %}
    </tr>
    <tr>
      <td class="row-label">Coût / personne</td>
      {% for v in variants %}
      <td class="value-cell">{{ v.cost_per_person|round|int }} €</td>
      {% endfor %}
    </tr>
    <tr>
      <td class="row-label">
        <strong>Prix vente / pers.</strong>
      </td>
      {% for v in variants %}
      <td class="value-cell{% if loop.first %} savings-cell{% endif %}">
        <span class="price-big" style="color:{{ v.tier_color }}">
          {{ v.price_per_person|round|int }} €
        </span>
      </td>
      {% endfor %}
    </tr>
    {% if variants[0].pricing and variants[0].pricing.ranges %}
    {% for ri in range(variants[0].pricing.ranges|length) %}
    <tr>
      <td class="row-label">Prix {{ variants[0].pricing.ranges[ri].min_pax }}–{{ variants[0].pricing.ranges[ri].max_pax }} pax</td>
      {% for v in variants %}
      <td class="value-cell">
        {% if v.pricing and v.pricing.ranges and ri < v.pricing.ranges|length %}
          {{ v.pricing.ranges[ri].selling_per_person|round|int }} €
          <span style="font-size:7.5pt; color:#38A169">·&nbsp;{{ v.pricing.ranges[ri].margin_pct }}%</span>
        {% else %}—{% endif %}
      </td>
      {% endfor %}
    </tr>
    {% endfor %}
    {% endif %}
  </tbody>
</table>

<!-- ══════════════════════════════════════
     PAGE 3+ — TIER PROGRAMMES (3 COLUMNS)
══════════════════════════════════════ -->
<table class="tiers-table">
  {% for v in variants %}
  <td>
    <div class="tier-card">
      <!-- Tier header -->
      <div class="tier-card-header" style="background:{{ v.tier_color }}">
        <div class="tier-name">{{ v.tier_label }}</div>
        <div class="tier-cat">{{ v.hotel_category }} · {{ meal_plan_labels.get(v.meal_plan, v.meal_plan) }}</div>
        <div class="tier-price">{{ v.price_per_person|round|int }} €
          <span class="tier-price-sub">/pers.</span>
        </div>
      </div>

      <!-- Pricing grid -->
      {% if v.pricing and v.pricing.ranges %}
      <div class="tier-section-label">Grille tarifaire</div>
      <div class="tier-pricing-grid">
        {% for r in v.pricing.ranges %}
        <div class="tier-pricing-row">
          <span class="pax-label">{{ r.min_pax }}–{{ r.max_pax }} pax</span>
          <span>
            <span class="price-val">{{ r.selling_per_person|round|int }} €</span>
            <span class="margin-val">{{ r.margin_pct }}%</span>
          </span>
        </div>
        {% endfor %}
      </div>
      {% endif %}

      <!-- Day-by-day programme -->
      {% if v.days %}
      <div class="tier-section-label">Programme jour par jour</div>
      {% for d in v.days %}
      <div class="day-mini">
        <div class="day-mini-header">
          <span class="day-num" style="background:{{ v.tier_color }}">J{{ d.day_number }}</span>
          <span class="day-city-name">{{ d.title or d.city or ("Jour " + d.day_number|string) }}</span>
        </div>
        {% if d.hotel %}
        <div class="day-hotel-line">🏨 {{ d.hotel }}
          {% if d.hotel_category %} · {{ d.hotel_category }}{% endif %}
          {% if d.meal_plan %} · {{ meal_plan_labels.get(d.meal_plan, d.meal_plan) }}{% endif %}
        </div>
        {% endif %}
        {% if d.activities and d.activities|length > 0 %}
        <div class="day-hotel-line">
          ▸ {{ d.activities|join(' · ') }}
        </div>
        {% endif %}
      </div>
      {% endfor %}
      {% endif %}

    </div><!-- /tier-card -->
  </td>
  {% endfor %}
</table>

<!-- ══════════════════════════════════════
     CONDITIONS GÉNÉRALES + CTA
══════════════════════════════════════ -->
<div class="terms-section">
  <div class="section-title" style="margin-top:0">Conditions générales de vente</div>
  <table class="terms-two-col">
    <tr>
      <td>
        <h3>Validité de l'offre</h3>
        <p>Cette proposition est valable <strong>15 jours</strong> à compter de la date d'émission. Les tarifs sont susceptibles d'être modifiés en cas de variation des taux de change ou des prix fournisseurs.</p>

        <h3>Conditions de paiement</h3>
        <ul>
          <li>30 % d'acompte à la confirmation du dossier</li>
          <li>Solde (70 %) au plus tard 30 jours avant le départ</li>
          <li>Paiement par virement bancaire ou carte de crédit</li>
        </ul>

        <h3>Politique d'annulation</h3>
        <ul>
          <li>Plus de 60 jours avant le départ : remboursement intégral (hors frais de dossier 50 €/pax)</li>
          <li>60 à 30 jours : pénalité de 30 %</li>
          <li>30 à 15 jours : pénalité de 50 %</li>
          <li>Moins de 15 jours : aucun remboursement</li>
        </ul>
      </td>
      <td>
        <h3>Substitution hôtelière</h3>
        <p>En cas d'indisponibilité, S'TOURS se réserve le droit de substituer tout hébergement par un établissement de catégorie équivalente ou supérieure sans supplément de prix.</p>

        <h3>Responsabilités</h3>
        <p>S'TOURS agit en qualité d'organisateur réceptif. Les services de transport international, visas et assurances voyages restent à la charge du partenaire émetteur sauf mention contraire dans l'offre.</p>

        <h3>Tarifs</h3>
        <p>Tous les prix sont exprimés en euros (€), par personne en base double, et comprennent la TVA marocaine applicable. Les tarifs single supplement sont disponibles sur demande.</p>
      </td>
    </tr>
  </table>
</div>

<div class="cta-box">
  <div class="cta-title">Prêt à confirmer votre programme ?</div>
  <p>
    Contactez votre Travel Designer S'TOURS pour toute modification ou confirmation.<br>
    📧 contact@stours.ma &nbsp;|&nbsp; 🌐 stours.ma &nbsp;|&nbsp; 📞 +212 5 22 XX XX XX
  </p>
</div>

</body>
</html>"""
