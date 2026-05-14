/**
 * Budget Tracker — offline / demo fallback data.
 *
 * Shown when no project is selected. Represents a typical Maroc circuit
 * so the UI looks realistic in demos without a live backend.
 *
 * Category values mirror the backend `QuotationLine.category` enum:
 *   hotel | transport | guide | monument | activity | restaurant | misc
 */

export interface BudgetLine {
  id: string
  category: string
  label: string
  estimated: number
  actual: number | null
  notes: string
  status: 'pending' | 'invoiced' | 'paid'
}

export const MOCK_BUDGET_LINES: BudgetLine[] = [
  { id: '1',  category: 'Hébergement',  label: 'Riad Fes 5* — 3 nuits',             estimated: 5850,  actual: 5850,  notes: '',                          status: 'paid'     },
  { id: '2',  category: 'Hébergement',  label: 'Movenpick Marrakech — 2 nuits',      estimated: 3600,  actual: 3800,  notes: 'Surclassement suite',         status: 'paid'     },
  { id: '3',  category: 'Hébergement',  label: 'Bivouac Merzouga — 1 nuit',          estimated: 2800,  actual: 2800,  notes: '',                          status: 'paid'     },
  { id: '4',  category: 'Transport',    label: 'Bus climatisé 50 places',            estimated: 35000, actual: 35000, notes: '',                          status: 'invoiced' },
  { id: '5',  category: 'Transport',    label: 'Transferts aéroport (2x)',           estimated: 3000,  actual: 2800,  notes: 'Négocié avec Horizon',        status: 'paid'     },
  { id: '6',  category: 'Restauration', label: 'Déjeuners (7 jours)',                estimated: 8400,  actual: 8900,  notes: '2 déjeuners supplémentaires', status: 'invoiced' },
  { id: '7',  category: 'Restauration', label: 'Dîners gastronomiques (4)',          estimated: 6000,  actual: 5600,  notes: '',                          status: 'paid'     },
  { id: '8',  category: 'Guides',       label: 'Guide francophone (8 jours)',        estimated: 6400,  actual: 6400,  notes: '',                          status: 'paid'     },
  { id: '9',  category: 'Guides',       label: 'Guide local Fès',                   estimated: 1000,  actual: 1200,  notes: 'Extension visite médina',     status: 'paid'     },
  { id: '10', category: 'Activités',    label: 'Entrées monuments',                  estimated: 2400,  actual: 2400,  notes: '',                          status: 'paid'     },
  { id: '11', category: 'Activités',    label: 'Balade dromadaires',                 estimated: 4000,  actual: 4000,  notes: '',                          status: 'invoiced' },
  { id: '12', category: 'Activités',    label: 'Cours de cuisine',                   estimated: 3000,  actual: null,  notes: 'Annulé — météo',             status: 'pending'  },
  { id: '13', category: 'Divers',       label: 'Pourboires guides/chauffeurs',       estimated: 2000,  actual: 2500,  notes: 'Groupe très satisfait',       status: 'paid'     },
  { id: '14', category: 'Divers',       label: 'Imprévu / urgences',                estimated: 1500,  actual: 800,   notes: 'Pharmacie passager',          status: 'paid'     },
]
