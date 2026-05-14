/**
 * PdfExportPage — Centre d'export PDF
 *
 * Génération client-side de rapports PDF professionnels :
 *  1. Devis voyageur complet
 *  2. Fiche récapitulatif projet
 *  3. Programme journalier guide / chauffeur
 *
 * Utilise jsPDF + jspdf-autotable (dynamic import, pas de chunk principal).
 */

import { useState } from 'react'
import {
  FileDown, FileText, FolderOpen, CalendarDays,
  Loader2, CheckCircle2, AlertTriangle, Sparkles,
  ChevronRight, Eye,
} from 'lucide-react'
import { clsx } from 'clsx'
import {
  exportQuotationPDF,
  exportProjectRecapPDF,
  exportDayProgrammePDF,
  type QuotationPDFData,
  type ProjectRecapPDFData,
  type DayProgrammePDFData,
} from '@/lib/pdfExport'

// ─────────────────────────────────────────────────────────────────────────────
// Demo data
// ─────────────────────────────────────────────────────────────────────────────

const DEMO_QUOTATION: QuotationPDFData = {
  ref: 'DEV-2026-089',
  date: '9 mai 2026',
  client: 'Horizon Travels — Sandra Müller',
  agent: 'STOURS Commercial — Abdelwahed Chakir',
  destination: 'Maroc Impérial — Villes Impériales 8J/7N',
  duration: 7,
  pax: 22,
  currency: 'EUR',
  pricePerPax: 980,
  totalPrice: 21_560,
  marginPct: 22,
  exchangeRate: 10.85,
  validUntil: '9 juin 2026',
  itinerary: [
    { day: 1, city: 'Casablanca',  title: 'Arrivée & Transfert', description: 'Accueil à l\'aéroport, transfert hôtel 5★, dîner de bienvenue.' },
    { day: 2, city: 'Rabat',       title: 'Capitale Royale',      description: 'Kasbah des Oudayas, Mausolée Mohammed V, Tour Hassan.' },
    { day: 3, city: 'Meknès',      title: 'Ville Ismaïlienne',    description: 'Bab Mansour, Mausolée Moulay Ismaïl, Volubilis.' },
    { day: 4, city: 'Fès',         title: 'Médina médiévale',     description: 'Al-Qaraouiyine, tanneries Chouara, Bou Inania.' },
    { day: 5, city: 'Fès',         title: 'Arts & Artisanat',     description: 'Madrassa Attarine, musée Dar Batha, marché couvert.' },
    { day: 6, city: 'Marrakech',   title: 'Ville Ocre',           description: 'Djemaa El Fna, Palais Bahia, Majorelle.' },
    { day: 7, city: 'Marrakech',   title: 'Souks & Bien-être',    description: 'Souks de la médina, hammam traditionnel, dîner gala.' },
    { day: 8, city: 'Casablanca',  title: 'Départ',               description: 'Transfert aéroport, assistance départ.' },
  ],
  services: [
    { category: 'Hébergement', description: '7 nuits hôtels 5★ (2 pax/ch)', qty: 7, unitCost: 28_000, totalCost: 196_000 },
    { category: 'Transport',   description: 'Bus 30 pax A/C + guide', qty: 1, unitCost: 45_000, totalCost: 45_000 },
    { category: 'Restauration', description: 'Demi-pension (7 D + 7 PDJ)', qty: 22, unitCost: 1_200, totalCost: 26_400 },
    { category: 'Guides',      description: 'Guide local FR 8 jours', qty: 8, unitCost: 2_000, totalCost: 16_000 },
    { category: 'Visites',     description: 'Entrées monuments & musées', qty: 22, unitCost: 850, totalCost: 18_700 },
    { category: 'Divers',      description: 'Eau, portage, téléphone', qty: 1, unitCost: 5_000, totalCost: 5_000 },
  ],
  notes: 'Ce devis est valable 30 jours à compter de sa date d\'émission. Les prix sont basés sur les tarifs prestataires en vigueur au 9 mai 2026 et peuvent être révisés en cas de variation de change supérieure à 5%. Acompte de 30% à la confirmation, solde 30 jours avant départ.',
}

const DEMO_PROJECT: ProjectRecapPDFData = {
  ref: 'PROJ-2026-032',
  name: 'Sahara Express 5J',
  client: 'Desert & Dunes GmbH',
  type: 'Circuit privatif',
  destination: 'Maroc — Grand Sud & Sahara',
  startDate: '15 mai 2026',
  endDate: '19 mai 2026',
  pax: 16,
  status: 'En cours',
  budgetMAD: 120_000,
  spentMAD: 131_500,
  guide: 'Hassan Benhaddou',
  vehicle: 'Toyota Coaster 22 pl. — BM 2024',
  notes: 'Groupe allemand haut de gamme. Attention : 2 participants végétaliens, 1 allergie aux noix. Contact urgence client : Klaus Weber +49 175 xxx xxxx',
  milestones: [
    { label: 'Devis envoyé',          date: '10 avr. 2026', done: true },
    { label: 'Acompte 30% reçu',      date: '18 avr. 2026', done: true },
    { label: 'Guide confirmé',         date: '25 avr. 2026', done: true },
    { label: 'Hébergements réservés', date: '30 avr. 2026', done: true },
    { label: 'Programme envoyé',       date: '5 mai 2026',   done: true },
    { label: 'Solde reçu',            date: '14 mai 2026',   done: false },
    { label: 'Départ groupe',         date: '15 mai 2026',   done: false },
    { label: 'Rapport de qualité',    date: '22 mai 2026',   done: false },
  ],
}

const DEMO_PROGRAMME: DayProgrammePDFData = {
  groupRef: 'GRP-2026-021',
  groupName: 'Désert & Kasbahs 6J — Belges',
  destination: 'Maroc — Grand Sud',
  pax: 18,
  guide: 'Youssef El Mansouri',
  vehicle: 'Mercedes Sprinter 20 pl.',
  days: [
    {
      dayNumber: 1, date: '20 mai 2026', city: 'Marrakech → Aït Benhaddou',
      hotel: 'Auberge Casbah Aït Ben Haddou ★★★★',
      activities: [
        '09h00 — Départ de Marrakech, transfert minibus',
        '12h30 — Déjeuner panoramique Col du Tichka (2 260m)',
        '15h00 — Visite ksar Aït Benhaddou (classé UNESCO)',
        '18h00 — Installation hôtel, temps libre',
        '20h00 — Dîner traditionnel avec spectacle musical',
      ],
      meals: { breakfast: false, lunch: true, dinner: true },
      notes: 'Prévoir chaussures de marche pour Aït Benhaddou (terrain irrégulier).',
    },
    {
      dayNumber: 2, date: '21 mai 2026', city: 'Aït Benhaddou → Ouarzazate → Skoura',
      hotel: 'Dar Ahlam Skoura ★★★★★',
      activities: [
        '08h00 — Petit-déjeuner panoramique',
        '09h30 — Visite studios Atlas d\'Ouarzazate',
        '11h00 — Musée du Cinéma, Kasbah Taourirt',
        '13h30 — Déjeuner à Ouarzazate',
        '15h30 — Route des Kasbahs, palmeraie de Skoura',
        '18h00 — Coucher de soleil depuis la terrasse du Dar',
      ],
      meals: { breakfast: true, lunch: true, dinner: true },
    },
    {
      dayNumber: 3, date: '22 mai 2026', city: 'Skoura → Vallée du Dadès → Gorges du Todra',
      hotel: 'Riad Berbère Tinghir ★★★★',
      activities: [
        '08h30 — Petit-déjeuner, découverte du jardin Dar Ahlam',
        '10h00 — Route du Dadès, villages berbères',
        '12h00 — Gorges du Dadès (Doigts de singe)',
        '14h00 — Déjeuner en gorges',
        '16h00 — Gorges du Todra (paroi 300m), balade à pied',
        '19h00 — Arrivée Tinghir, installation',
      ],
      meals: { breakfast: true, lunch: true, dinner: false },
      notes: 'Pause photo obligatoire aux Gorges du Dadès (km 27).',
    },
    {
      dayNumber: 4, date: '23 mai 2026', city: 'Tinghir → Merzouga / Erg Chebbi',
      hotel: 'Luxury Desert Camp Erg Chebbi',
      activities: [
        '07h30 — Petit-déjeuner, route de l\'Erg',
        '10h00 — Oasis de Tinjdad, coopérative féminine',
        '13h00 — Déjeuner Rissani, marché berbère',
        '16h00 — Arrivée Merzouga, montée dromadaires au coucher du soleil',
        '18h30 — Installation camp luxe, cocktail en dunes',
        '20h30 — Dîner sous les étoiles, musique gnawa',
      ],
      meals: { breakfast: true, lunch: true, dinner: true },
      notes: 'Bagage minimum pour la nuit en camp (1 sac léger). Prévoir vêtements chauds.',
    },
    {
      dayNumber: 5, date: '24 mai 2026', city: 'Merzouga → Rissani → Erfoud → Errachidia',
      hotel: 'Kenzi Azghor Errachidia ★★★★',
      activities: [
        '05h30 — Lever du soleil sur les dunes (dromadaires)',
        '07h30 — Petit-déjeuner camp, retour Merzouga',
        '10h00 — Village de potiers Rissani',
        '12h30 — Déjeuner fossiles & géologie Erfoud',
        '15h00 — Visite musée géologique du Sahara',
        '18h00 — Arrivée Errachidia, dîner & repos',
      ],
      meals: { breakfast: true, lunch: true, dinner: true },
    },
    {
      dayNumber: 6, date: '25 mai 2026', city: 'Errachidia → Midelt → Marrakech',
      hotel: '— Départ —',
      activities: [
        '08h00 — Petit-déjeuner, départ tôt',
        '10h30 — Pause Midelt (pommiers, tapis berbères)',
        '13h00 — Déjeuner Col Zad',
        '17h00 — Arrivée Marrakech, transfert hôtel ou aéroport',
      ],
      meals: { breakfast: true, lunch: true, dinner: false },
      notes: 'Vol retour Brussels Airlines AT0442 à 20h15 — prévoir arrivée aéroport RAK 18h00.',
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// Export Card Component
// ─────────────────────────────────────────────────────────────────────────────

type ExportStatus = 'idle' | 'loading' | 'done' | 'error'

function ExportCard({
  icon: Icon,
  title,
  description,
  details,
  color,
  onExport,
}: {
  icon: typeof FileText
  title: string
  description: string
  details: Array<{ label: string; value: string }>
  color: string
  onExport: () => Promise<void>
}) {
  const [status, setStatus] = useState<ExportStatus>('idle')

  const handleClick = async () => {
    setStatus('loading')
    try {
      await onExport()
      setStatus('done')
      setTimeout(() => setStatus('idle'), 3000)
    } catch (err) {
      console.error(err)
      setStatus('error')
      setTimeout(() => setStatus('idle'), 4000)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Card header */}
      <div className={clsx('px-5 py-4 flex items-center gap-3', color)}>
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
          <Icon size={20} className="text-white" />
        </div>
        <div>
          <p className="text-[15px] font-bold text-white leading-tight">{title}</p>
          <p className="text-[11px] text-white/70 mt-0.5">{description}</p>
        </div>
      </div>

      {/* Details */}
      <div className="px-5 py-4 space-y-1.5">
        {details.map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-[12px] text-slate-400 dark:text-slate-500">{label}</span>
            <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[55%] text-right">{value}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="px-5 pb-5">
        <button
          onClick={handleClick}
          disabled={status === 'loading'}
          className={clsx(
            'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold transition-all',
            status === 'done'
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
              : status === 'error'
                ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400'
                : status === 'loading'
                  ? 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500 cursor-wait'
                  : 'bg-[#5B1914] text-white hover:bg-[#7A2219] dark:bg-[#E8734A] dark:hover:bg-[#d4633c]'
          )}
        >
          {status === 'loading' && <Loader2 size={15} className="animate-spin" />}
          {status === 'done'    && <CheckCircle2 size={15} />}
          {status === 'error'   && <AlertTriangle size={15} />}
          {status === 'idle'    && <FileDown size={15} />}
          {status === 'loading' ? 'Génération en cours…'
           : status === 'done'  ? 'PDF téléchargé !'
           : status === 'error' ? 'Erreur — réessayer'
           : 'Télécharger le PDF'}
        </button>

        {status === 'error' && (
          <p className="text-[11px] text-rose-500 mt-2 text-center">
            jsPDF non disponible. Exécutez :{' '}
            <code className="font-mono bg-rose-50 dark:bg-rose-900/20 px-1 rounded">
              npm i jspdf jspdf-autotable
            </code>
          </p>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export function PdfExportPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 space-y-6">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#5B1914] to-[#E8734A] flex items-center justify-center">
            <FileDown size={16} className="text-white" />
          </div>
          <h1 className="text-[22px] font-bold text-slate-800 dark:text-slate-100">
            Export PDF
          </h1>
        </div>
        <p className="text-[13px] text-slate-500 dark:text-slate-400 ml-10">
          Génération de rapports PDF professionnels — client-side, aucune dépendance serveur
        </p>
      </div>

      {/* ── Info banner ───────────────────────────────────────────── */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/15 border border-blue-200 dark:border-blue-500/20">
        <Sparkles size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-[13px] font-semibold text-blue-800 dark:text-blue-300">
            Génération 100% côté client
          </p>
          <p className="text-[12px] text-blue-600 dark:text-blue-400 mt-0.5">
            Les PDFs sont générés directement dans votre navigateur avec <strong>jsPDF + autoTable</strong>.
            Aucune donnée ne quitte votre machine. Installez les dépendances si nécessaire :{' '}
            <code className="font-mono bg-blue-100 dark:bg-blue-900/30 px-1 rounded text-[11px]">
              npm i jspdf jspdf-autotable
            </code>
          </p>
        </div>
      </div>

      {/* ── Export cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Quotation PDF */}
        <ExportCard
          icon={FileText}
          title="Devis Voyageur"
          description="Devis complet avec itinéraire, prestations et tarification"
          color="bg-gradient-to-r from-[#5B1914] to-[#7A2219]"
          details={[
            { label: 'Référence',    value: DEMO_QUOTATION.ref },
            { label: 'Client',       value: 'Horizon Travels' },
            { label: 'Destination',  value: 'Maroc Impérial 8J' },
            { label: 'Participants', value: `${DEMO_QUOTATION.pax} pax` },
            { label: 'Prix/personne', value: `${DEMO_QUOTATION.pricePerPax} ${DEMO_QUOTATION.currency}` },
            { label: 'Contenu',      value: '8 jours · 6 services · notes' },
          ]}
          onExport={() => exportQuotationPDF(DEMO_QUOTATION)}
        />

        {/* Project Recap PDF */}
        <ExportCard
          icon={FolderOpen}
          title="Fiche Projet"
          description="Récapitulatif projet avec budget, jalons et équipe terrain"
          color="bg-gradient-to-r from-slate-700 to-slate-800"
          details={[
            { label: 'Référence',    value: DEMO_PROJECT.ref },
            { label: 'Projet',       value: DEMO_PROJECT.name },
            { label: 'Client',       value: DEMO_PROJECT.client },
            { label: 'Dates',        value: `${DEMO_PROJECT.startDate} → ${DEMO_PROJECT.endDate}` },
            { label: 'Budget',       value: `${DEMO_PROJECT.budgetMAD.toLocaleString('fr-MA')} MAD` },
            { label: 'Jalons',       value: `${DEMO_PROJECT.milestones.length} étapes` },
          ]}
          onExport={() => exportProjectRecapPDF(DEMO_PROJECT)}
        />

        {/* Day Programme PDF */}
        <ExportCard
          icon={CalendarDays}
          title="Programme Journalier"
          description="Programme détaillé jour par jour pour guide et chauffeur"
          color="bg-gradient-to-r from-[#E8734A] to-[#d4633c]"
          details={[
            { label: 'Groupe',       value: DEMO_PROGRAMME.groupRef ?? '' },
            { label: 'Circuit',      value: 'Désert & Kasbahs 6J' },
            { label: 'Guide',        value: DEMO_PROGRAMME.guide ?? '' },
            { label: 'Participants', value: `${DEMO_PROGRAMME.pax ?? 0} pax` },
            { label: 'Durée',        value: `${DEMO_PROGRAMME.days?.length ?? 0} jours` },
            { label: 'Repas',        value: 'Inclus dans le programme' },
          ]}
          onExport={() => exportDayProgrammePDF(DEMO_PROGRAMME)}
        />
      </div>

      {/* ── How it works ──────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
        <p className="text-[14px] font-semibold text-slate-700 dark:text-slate-300 mb-3">
          Intégration dans vos pages
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: FileText,
              title: 'Depuis QuotationWizard',
              desc: 'Le bouton "Exporter PDF" sur la step 4 appelle exportQuotationPDF() avec les données du wizard.',
              link: '/quotations/new',
              linkLabel: 'Ouvrir le wizard',
            },
            {
              icon: FolderOpen,
              title: 'Depuis Projects',
              desc: 'Chaque projet dans la DataTable propose un menu contextuel "Exporter fiche" appelant exportProjectRecapPDF().',
              link: '/projects',
              linkLabel: 'Voir les projets',
            },
            {
              icon: CalendarDays,
              title: 'Depuis le Cockpit Ops',
              desc: 'Chaque GroupCard dans le cockpit a un bouton "Programme PDF" pour le guide et le chauffeur.',
              link: '/operations/cockpit',
              linkLabel: 'Ouvrir le cockpit',
            },
          ].map(({ icon: Icon, title, desc, link, linkLabel }) => (
            <div key={title} className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                  <Icon size={14} className="text-[#5B1914] dark:text-[#E8734A]" />
                </div>
                <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">{title}</span>
              </div>
              <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
              <a
                href={link}
                className="inline-flex items-center gap-1 text-[12px] font-medium text-[#5B1914] dark:text-[#E8734A] hover:underline"
              >
                {linkLabel} <ChevronRight size={11} />
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* ── Structure des fichiers ─────────────────────────────────── */}
      <div className="bg-slate-900 dark:bg-slate-950 rounded-2xl p-5 border border-slate-800">
        <div className="flex items-center gap-2 mb-3">
          <Eye size={14} className="text-slate-400" />
          <span className="text-[12px] font-semibold text-slate-400 uppercase tracking-wider">
            Référence rapide — src/lib/pdfExport.ts
          </span>
        </div>
        <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed whitespace-pre">{`import { exportQuotationPDF } from '@/lib/pdfExport'

// Dans un composant React :
const handleExport = async () => {
  await exportQuotationPDF({
    ref: 'DEV-2026-089',
    client: 'Horizon Travels',
    pax: 22,
    currency: 'EUR',
    pricePerPax: 980,
    totalPrice: 21_560,
    marginPct: 22,
    exchangeRate: 10.85,
    itinerary: [...],  // { day, city, title, description }
    services: [...],   // { category, description, qty, unitCost, totalCost }
  })
}

// Bouton :
<button onClick={handleExport}>
  Télécharger le devis PDF
</button>`}
        </pre>
      </div>
    </div>
  )
}
