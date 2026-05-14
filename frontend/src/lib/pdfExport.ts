/**
 * pdfExport.ts — Client-side PDF generation for STOURS / Rihla
 *
 * Uses jsPDF (already a transitive dep) + jspdf-autotable for tables.
 * Install if not present:  npm i jspdf jspdf-autotable
 *
 * Exported functions:
 *   exportQuotationPDF(quotation)   → client quotation PDF
 *   exportProjectRecapPDF(project)  → project recap / brief PDF
 *   exportDayProgrammePDF(group)    → day-by-day programme PDF
 */

// We use dynamic import to avoid bundling jsPDF in the main chunk.
// Each function is async and triggers the download directly.

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface QuotationPDFData {
  ref: string
  date: string
  client: string
  agent?: string
  destination: string
  duration: number        // nights
  pax: number
  currency: string
  pricePerPax: number
  totalPrice: number
  marginPct: number
  exchangeRate: number
  itinerary: Array<{
    day: number
    city: string
    title: string
    description?: string
  }>
  services: Array<{
    category: string
    description: string
    qty: number
    unitCost: number
    totalCost: number
  }>
  notes?: string
  validUntil?: string
}

export interface ProjectRecapPDFData {
  ref: string
  name: string
  client: string
  type: string
  destination: string
  startDate: string
  endDate: string
  pax: number
  status: string
  budgetMAD: number
  spentMAD: number
  guide?: string
  vehicle?: string
  notes?: string
  milestones: Array<{ label: string; date: string; done: boolean }>
}

export interface DayProgrammePDFData {
  groupRef?: string
  groupName: string
  destination?: string
  pax?: number
  guide?: string
  vehicle?: string
  projectRef?: string
  guideeName?: string
  date?: string
  day?: number
  totalDays?: number
  hotel?: string
  paxCount?: number
  programme?: Array<{
    time: string
    place: string
    duration: string
    notes?: string
    type?: string
  }>
  days?: Array<{
    dayNumber: number
    date: string
    city: string
    hotel: string
    activities: string[]
    meals: { breakfast: boolean; lunch: boolean; dinner: boolean }
    notes?: string
  }>
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

const BRAND_COLOR    = [91, 25, 20]   as const   // #5B1914
const ACCENT_COLOR   = [232, 115, 74] as const   // #E8734A
const SLATE_DARK     = [30, 41, 59]   as const   // slate-800
const SLATE_MID      = [100, 116, 139] as const  // slate-500
const SLATE_LIGHT    = [226, 232, 240] as const  // slate-200

type RGB = readonly [number, number, number]

function formatMAD(n: number) {
  return n.toLocaleString('fr-MA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' MAD'
}

async function loadJsPDF() {
  const { jsPDF } = await import('jspdf')
  return jsPDF
}

async function loadAutoTable() {
  await import('jspdf-autotable')
}

function addHeader(
  doc: InstanceType<Awaited<ReturnType<typeof loadJsPDF>>>,
  title: string,
  subtitle: string,
  ref: string,
) {
  const W = doc.internal.pageSize.getWidth()

  // Gradient band (simulated with solid fill)
  doc.setFillColor(...BRAND_COLOR)
  doc.rect(0, 0, W, 28, 'F')

  // Brand name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(255, 255, 255)
  doc.text('STOURS', 14, 12)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(242, 210, 161)
  doc.text('Rihla Suite • DMC Platform', 14, 18)

  // Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(255, 255, 255)
  doc.text(title, W / 2, 12, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(242, 210, 161)
  doc.text(subtitle, W / 2, 19, { align: 'center' })

  // Ref
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  doc.text(ref, W - 14, 12, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(242, 210, 161)
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  doc.text(`Généré le ${today}`, W - 14, 18, { align: 'right' })
}

function addFooter(doc: InstanceType<Awaited<ReturnType<typeof loadJsPDF>>>) {
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const pages = doc.getNumberOfPages()

  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setDrawColor(...SLATE_LIGHT)
    doc.setLineWidth(0.3)
    doc.line(14, H - 12, W - 14, H - 12)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...SLATE_MID)
    doc.text('STOURS — Rihla Suite DMC Platform • Confidentiel', 14, H - 7)
    doc.text(`Page ${i} / ${pages}`, W - 14, H - 7, { align: 'right' })
  }
}

function sectionTitle(
  doc: InstanceType<Awaited<ReturnType<typeof loadJsPDF>>>,
  text: string,
  y: number,
): number {
  const W = doc.internal.pageSize.getWidth()
  doc.setFillColor(...ACCENT_COLOR)
  doc.rect(14, y, W - 28, 0.5, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...BRAND_COLOR)
  doc.text(text.toUpperCase(), 14, y - 1)

  return y + 4
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Quotation PDF
// ─────────────────────────────────────────────────────────────────────────────

export async function exportQuotationPDF(data: QuotationPDFData): Promise<void> {
  const JsPDF = await loadJsPDF()
  await loadAutoTable()

  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  let y = 36

  // ── Header ──
  addHeader(doc, 'Devis Voyageur', `${data.destination} · ${data.duration} nuits · ${data.pax} pax`, data.ref)

  // ── Client block ──
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(14, y, W - 28, 24, 2, 2, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...SLATE_DARK)
  doc.text(data.client, 20, y + 7)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...SLATE_MID)
  if (data.agent) doc.text(`Commercial : ${data.agent}`, 20, y + 13)
  doc.text(`Date devis : ${data.date}`, 20, y + 19)
  if (data.validUntil) doc.text(`Valable jusqu'au : ${data.validUntil}`, 80, y + 19)

  // Price box (right side)
  doc.setFillColor(...BRAND_COLOR)
  doc.roundedRect(W - 60, y, 46, 24, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(255, 255, 255)
  doc.text(
    `${data.pricePerPax.toLocaleString('fr-MA')} ${data.currency}`,
    W - 37, y + 10, { align: 'center' }
  )
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(242, 210, 161)
  doc.text('par personne', W - 37, y + 15, { align: 'center' })
  doc.text(`Total : ${(data.totalPrice).toLocaleString('fr-MA')} ${data.currency}`, W - 37, y + 21, { align: 'center' })

  y += 30

  // ── Itinerary ──
  y = sectionTitle(doc, 'Programme jour par jour', y)

  const itRows = data.itinerary.map(d => [
    `J${d.day}`,
    d.city,
    d.title,
    d.description ?? '',
  ])
  ;(doc as any).autoTable({
    startY: y,
    head: [['Jour', 'Étape', 'Titre', 'Description']],
    body: itRows,
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: BRAND_COLOR, textColor: 255, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 0: { cellWidth: 12 }, 1: { cellWidth: 28 }, 2: { cellWidth: 48 } },
    margin: { left: 14, right: 14 },
  })

  y = (doc as any).lastAutoTable.finalY + 8

  // ── Services ──
  if (doc.internal.pageSize.getHeight() - y < 60) {
    doc.addPage()
    y = 18
  }
  y = sectionTitle(doc, 'Prestations incluses', y)

  const svcRows = data.services.map(s => [
    s.category,
    s.description,
    s.qty.toString(),
    formatMAD(s.unitCost),
    formatMAD(s.totalCost),
  ])
  const totalCost = data.services.reduce((acc, s) => acc + s.totalCost, 0)
  ;(doc as any).autoTable({
    startY: y,
    head: [['Catégorie', 'Description', 'Qté', 'Coût unit.', 'Total']],
    body: svcRows,
    foot: [['', '', '', 'TOTAL COÛT', formatMAD(totalCost)]],
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: BRAND_COLOR, textColor: 255, fontStyle: 'bold', fontSize: 8 },
    footStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 0: { cellWidth: 28 }, 2: { cellWidth: 12, halign: 'center' }, 3: { cellWidth: 28, halign: 'right' }, 4: { cellWidth: 28, halign: 'right' } },
    margin: { left: 14, right: 14 },
  })

  y = (doc as any).lastAutoTable.finalY + 8

  // ── Price summary ──
  if (doc.internal.pageSize.getHeight() - y < 40) {
    doc.addPage()
    y = 18
  }
  y = sectionTitle(doc, 'Récapitulatif tarifaire', y)

  const summaryRows = [
    ['Coût total prestataires', formatMAD(totalCost)],
    [`Marge commerciale (${data.marginPct}%)`, formatMAD(totalCost * data.marginPct / 100)],
    [`Prix de vente total (${data.pax} pax)`, formatMAD(data.totalPrice * data.exchangeRate)],
    [`Prix par personne (${data.currency})`, `${data.pricePerPax.toLocaleString('fr-MA')} ${data.currency}`],
    [`Taux de change utilisé`, `1 ${data.currency} = ${data.exchangeRate.toFixed(2)} MAD`],
  ]
  ;(doc as any).autoTable({
    startY: y,
    body: summaryRows,
    styles: { fontSize: 8.5, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: 'bold', textColor: SLATE_DARK }, 1: { halign: 'right', fontStyle: 'bold' } },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  })

  y = (doc as any).lastAutoTable.finalY + 8

  // ── Notes ──
  if (data.notes) {
    if (doc.internal.pageSize.getHeight() - y < 30) { doc.addPage(); y = 18 }
    y = sectionTitle(doc, 'Notes & Conditions', y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...SLATE_MID)
    const lines = doc.splitTextToSize(data.notes, W - 28) as string[]
    doc.text(lines, 14, y)
  }

  addFooter(doc)
  doc.save(`${data.ref}_devis.pdf`)
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Project Recap PDF
// ─────────────────────────────────────────────────────────────────────────────

export async function exportProjectRecapPDF(data: ProjectRecapPDFData): Promise<void> {
  const JsPDF = await loadJsPDF()
  await loadAutoTable()

  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  let y = 36

  addHeader(doc, 'Fiche Projet', `${data.name} · ${data.destination}`, data.ref)

  // ── Info grid ──
  const infoLeft = [
    ['Client', data.client],
    ['Type', data.type],
    ['Destination', data.destination],
    ['Dates', `${data.startDate} → ${data.endDate}`],
    ['Participants', `${data.pax} pax`],
    ['Statut', data.status],
  ]
  const infoRight = [
    ['Guide', data.guide ?? 'Non assigné'],
    ['Véhicule', data.vehicle ?? 'Non assigné'],
    ['Budget prévu', formatMAD(data.budgetMAD)],
    ['Dépensé', formatMAD(data.spentMAD)],
    ['Écart', formatMAD(data.spentMAD - data.budgetMAD)],
    ['Taux consommation', `${((data.spentMAD / data.budgetMAD) * 100).toFixed(1)}%`],
  ]

  ;(doc as any).autoTable({
    startY: y,
    body: infoLeft,
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 35, textColor: SLATE_DARK }, 1: { textColor: SLATE_DARK } },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    tableWidth: (W - 28) / 2 - 2,
    margin: { left: 14, right: W / 2 + 2 },
  })

  ;(doc as any).autoTable({
    startY: y,
    body: infoRight,
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 35, textColor: SLATE_DARK }, 1: { textColor: SLATE_DARK } },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    tableWidth: (W - 28) / 2 - 2,
    margin: { left: W / 2 + 2, right: 14 },
  })

  y = Math.max((doc as any).lastAutoTable.finalY, y + 40) + 8

  // ── Budget bar ──
  const barW = W - 28
  const barPct = Math.min(data.spentMAD / data.budgetMAD, 1)
  const overBudget = data.spentMAD > data.budgetMAD

  doc.setFillColor(226, 232, 240)
  doc.roundedRect(14, y, barW, 6, 3, 3, 'F')
  doc.setFillColor(overBudget ? 239 : 16, overBudget ? 68 : 185, overBudget ? 68 : 129)
  doc.roundedRect(14, y, barW * barPct, 6, 3, 3, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...SLATE_MID)
  doc.text(`Budget : ${formatMAD(data.budgetMAD)}`, 14, y + 10)
  doc.text(`Consommé : ${formatMAD(data.spentMAD)}`, W / 2, y + 10, { align: 'center' })
  doc.text(overBudget ? `Dépassement : ${formatMAD(data.spentMAD - data.budgetMAD)}` : `Restant : ${formatMAD(data.budgetMAD - data.spentMAD)}`, W - 14, y + 10, { align: 'right' })

  y += 16

  // ── Milestones ──
  y = sectionTitle(doc, 'Jalons du projet', y)
  const msRows = data.milestones.map(m => [m.done ? '✓' : '○', m.label, m.date])
  ;(doc as any).autoTable({
    startY: y,
    head: [['', 'Jalon', 'Date prévue']],
    body: msRows,
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: BRAND_COLOR, textColor: 255, fontStyle: 'bold', fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 35, halign: 'right' },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
    didDrawCell: (data: any) => {
      if (data.column.index === 0 && data.section === 'body') {
        const done = msRows[data.row.index]?.[0] === '✓'
        doc.setTextColor(done ? 16 : 148, done ? 185 : 163, done ? 129 : 163)
      }
    },
  })

  y = (doc as any).lastAutoTable.finalY + 8

  // ── Notes ──
  if (data.notes) {
    if (doc.internal.pageSize.getHeight() - y < 30) { doc.addPage(); y = 18 }
    y = sectionTitle(doc, 'Notes opérationnelles', y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...SLATE_MID)
    const lines = doc.splitTextToSize(data.notes, W - 28) as string[]
    doc.text(lines, 14, y)
  }

  addFooter(doc)
  doc.save(`${data.ref}_recap.pdf`)
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Day Programme PDF
// ─────────────────────────────────────────────────────────────────────────────

export async function exportDayProgrammePDF(data: DayProgrammePDFData): Promise<void> {
  const JsPDF = await loadJsPDF()
  await loadAutoTable()

  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  let y = 36

  const groupRef = data.groupRef ?? data.projectRef ?? 'programme'
  const pax = data.pax ?? data.paxCount ?? 0
  const guide = data.guide ?? data.guideeName ?? 'Guide'
  const vehicle = data.vehicle ?? '—'
  const destination = data.destination ?? 'Maroc'
  const days = data.days ?? [{
    dayNumber: data.day ?? 1,
    date: data.date ?? new Date().toISOString().slice(0, 10),
    city: destination,
    hotel: data.hotel ?? '—',
    activities: (data.programme ?? []).map(step =>
      [step.time, step.place, step.duration, step.notes].filter(Boolean).join(' · ')
    ),
    meals: { breakfast: false, lunch: false, dinner: false },
  }]

  addHeader(doc, 'Programme Journalier', `${data.groupName} · ${pax} pax`, groupRef)

  // ── Group Info ──
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(14, y, W - 28, 16, 2, 2, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...SLATE_DARK)
  doc.text(`Guide : ${guide}`, 20, y + 6)
  doc.text(`Véhicule : ${vehicle}`, 20, y + 12)
  doc.text(`Destination : ${destination}`, W / 2, y + 6)
  doc.text(`Participants : ${pax} pax`, W / 2, y + 12)

  y += 22

  // ── Days ──
  for (const day of days) {
    if (doc.internal.pageSize.getHeight() - y < 45) {
      doc.addPage()
      y = 18
    }

    // Day card header
    doc.setFillColor(...BRAND_COLOR)
    doc.roundedRect(14, y, W - 28, 8, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(255, 255, 255)
    doc.text(`JOUR ${day.dayNumber} — ${day.date}`, 20, y + 5.5)
    doc.text(day.city, W - 20, y + 5.5, { align: 'right' })

    y += 10

    // Hotel
    doc.setFillColor(241, 245, 249)
    doc.roundedRect(14, y, W - 28, 7, 1, 1, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...SLATE_MID)
    doc.text('Hébergement :', 18, y + 4.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...SLATE_DARK)
    doc.text(day.hotel, 52, y + 4.5)

    y += 9

    // Activities
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...SLATE_MID)
    doc.text('Programme :', 18, y + 4)
    y += 5
    for (const act of day.activities) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...SLATE_DARK)
      doc.setFillColor(...ACCENT_COLOR)
      doc.circle(19, y + 2, 1, 'F')
      const lines = doc.splitTextToSize(act, W - 46) as string[]
      doc.text(lines, 23, y + 3)
      y += lines.length * 4 + 1
    }

    // Meals
    const mealIcons = [
      day.meals?.breakfast ? '☀ Petit-déjeuner' : null,
      day.meals?.lunch     ? '☁ Déjeuner'       : null,
      day.meals?.dinner    ? '★ Dîner'           : null,
    ].filter(Boolean)

    if (mealIcons.length) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(...SLATE_MID)
      doc.text('Repas inclus : ' + mealIcons.join('  ·  '), 18, y + 3)
      y += 5
    }

    // Notes
    if (day.notes) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(7.5)
      doc.setTextColor(148, 163, 184)
      const nLines = doc.splitTextToSize(`📌 ${day.notes}`, W - 36) as string[]
      doc.text(nLines, 18, y + 3)
      y += nLines.length * 3.5 + 2
    }

    // Divider
    doc.setDrawColor(...SLATE_LIGHT)
    doc.setLineWidth(0.2)
    doc.line(14, y + 2, W - 14, y + 2)
    y += 6
  }

  addFooter(doc)
  doc.save(`${groupRef}_programme.pdf`)
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience: check if jsPDF is available (for UI button rendering)
// ─────────────────────────────────────────────────────────────────────────────

export async function isPDFAvailable(): Promise<boolean> {
  try {
    await import('jspdf')
    return true
  } catch {
    return false
  }
}
