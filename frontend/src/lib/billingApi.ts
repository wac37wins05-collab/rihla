/**
 * billingApi — Client HTTP pour le NestJS Billing Engine (port 3100)
 * Toute la logique financière ERP : factures, paiements, TVA, reporting
 *
 * Base URL: /billing  (proxied → http://localhost:3100 en dev)
 */

import axios from 'axios'

// ── Axios instance dédiée ─────────────────────────────────────────
export const billingHttp = axios.create({
  baseURL: '/billing',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
})

// Injecter le même JWT que le backend principal
billingHttp.interceptors.request.use((config) => {
  const token = localStorage.getItem('stours_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  // x-company-id fallback (billing engine utilise ce header)
  const companyId = localStorage.getItem('stours_company_id') ?? 'stours-main'
  config.headers['x-company-id'] = companyId
  return config
})

// ── Types ─────────────────────────────────────────────────────────

export type InvoiceType   = 'FINAL' | 'PROFORMA' | 'CREDIT_NOTE' | 'SUPPLIER_INVOICE' | 'RECEIPT'
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'VOID'
export type PaymentMethod = 'BANK_TRANSFER' | 'CHECK' | 'CASH' | 'CREDIT_CARD' | 'WIRE' | 'MOBILE'

export interface InvoiceSummary {
  id: string
  invoiceNumber: string
  type: InvoiceType
  status: InvoiceStatus
  customerId: string
  customerName: string
  currency: string
  grandTotal: string          // Decimal serialized as string
  grandTotalBase: string
  amountPaid: string
  amountDue: string
  issueDate: string           // ISO date string
  dueDate: string | null
  createdAt: string
}

export interface InvoiceItem {
  id: string
  sortOrder: number
  description: string
  quantity: string
  unitPrice: string
  discountAmount: string
  taxRatePct: string
  taxAmount: string
  subtotalExcl: string
  subtotalIncl: string
}

export interface InvoiceDetail extends InvoiceSummary {
  subtotalAmount: string
  taxAmount: string
  exchangeRate: string
  exchangeRateDate: string
  notes: string | null
  termsAndConditions: string | null
  sentAt: string | null
  paidAt: string | null
  voidReason: string | null
  taxBreakdown: {
    byRate: Array<{ rate: string; taxType: string; taxableAmount: string; taxAmount: string }>
  } | null
  items: InvoiceItem[]
  customer: { id: string; name: string; email: string; taxNumber: string | null } | null
  booking: { id: string; bookingRef: string } | null
  payments: Array<{
    allocatedAmount: string
    payment: { id: string; method: string; paymentDate: string; reference: string | null }
  }>
}

export interface CreateInvoiceItemDto {
  description: string
  quantity: number
  unitPrice: string
  discountAmount?: string
  taxRatePct?: number
  isTaxInclusive?: boolean
}

export interface CreateInvoiceDto {
  type: InvoiceType
  customerId: string
  bookingId?: string
  currency: string
  issueDate?: string
  dueDate?: string
  items: CreateInvoiceItemDto[]
  notes?: string
  termsAndConditions?: string
}

export interface RecordPaymentDto {
  customerId: string
  invoiceIds: string[]
  amount: string
  currency: string
  method: PaymentMethod
  paymentDate?: string
  reference?: string
  bankAccount?: string
  notes?: string
}

export interface RevenueSummary {
  period: string
  invoiceCount: number
  totalRevenue: string
  totalTax: string
  totalRevenueExcl: string
  collected: string
  outstanding: string
  currency: string
}

export interface AgingBucket {
  customerId: string
  customerName: string
  current: string
  days30: string
  days60: string
  days90: string
  days90Plus: string
  total: string
  currency: string
}

export interface VatLine {
  taxRatePct: string
  taxableAmount: string
  taxAmount: string
  invoiceCount: number
}

// ── Helpers ───────────────────────────────────────────────────────

/** Formate un montant Decimal (string) en monnaie locale */
export function fmtAmount(value: string | number, currency = 'MAD'): string {
  const n = Number(value)
  if (isNaN(n)) return '–'
  const sym: Record<string, string> = { EUR: '€', USD: '$', GBP: '£', MAD: 'MAD' }
  const s = sym[currency] ?? currency
  const formatted = n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return currency === 'MAD' ? `${formatted} ${s}` : `${s} ${formatted}`
}

export const INV_STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string }> = {
  DRAFT:   { label: 'Brouillon', color: 'bg-slate-100 text-slate-500' },
  SENT:    { label: 'Envoyée',   color: 'bg-amber-50 text-amber-700' },
  PARTIAL: { label: 'Partiel',   color: 'bg-blue-50 text-blue-700' },
  PAID:    { label: 'Réglée',    color: 'bg-emerald-50 text-emerald-700' },
  OVERDUE: { label: 'En retard', color: 'bg-red-50 text-red-600' },
  VOID:    { label: 'Annulée',   color: 'bg-gray-100 text-gray-400' },
}

// ── API ───────────────────────────────────────────────────────────

export const billingInvoicesApi = {
  list: (params?: {
    customerId?: string
    status?: InvoiceStatus
    type?: InvoiceType
    from?: string
    to?: string
    page?: number
    limit?: number
  }) => billingHttp.get<{ items: InvoiceSummary[]; total: number }>('/invoices', { params }),

  get: (id: string) =>
    billingHttp.get<InvoiceDetail>(`/invoices/${id}`),

  create: (dto: CreateInvoiceDto) =>
    billingHttp.post<{ id: string }>('/invoices', dto),

  update: (id: string, dto: { dueDate?: string; notes?: string; termsAndConditions?: string }) =>
    billingHttp.patch(`/invoices/${id}`, dto),

  send: (id: string) =>
    billingHttp.post(`/invoices/${id}/send`),

  void: (id: string, reason: string) =>
    billingHttp.post(`/invoices/${id}/void`, { reason }),

  delete: (id: string) =>
    billingHttp.delete(`/invoices/${id}`),

  history: (id: string) =>
    billingHttp.get<any[]>(`/invoices/${id}/history`),

  markOverdue: () =>
    billingHttp.post<{ markedOverdue: number }>('/invoices/mark-overdue'),

  pdf: (id: string) =>
    billingHttp.get(`/invoices/${id}/pdf`, { responseType: 'blob' }),
}

export const billingPaymentsApi = {
  record: (dto: RecordPaymentDto) =>
    billingHttp.post<{
      paymentId: string
      totalAllocated: string
      fullyPaidInvoices: string[]
      partiallyPaidInvoices: string[]
    }>('/payments', dto),

  get: (id: string) => billingHttp.get(`/payments/${id}`),

  void: (id: string, reason: string) =>
    billingHttp.post(`/payments/${id}/void`, { reason }),

  refund: (id: string, amount: string, reason: string, method?: string) =>
    billingHttp.post<{ refundId: string }>(`/payments/${id}/refund`, { amount, reason, method }),

  customerBalance: (customerId: string) =>
    billingHttp.get<{
      totalOutstanding: string
      overdueAmount: string
      currency: string
      invoiceCount: number
    }>(`/payments/customers/${customerId}/balance`),
}

export const billingReportsApi = {
  revenue: (from: string, to: string) =>
    billingHttp.get<RevenueSummary>('/reports/revenue', { params: { from, to } }),

  aging: () =>
    billingHttp.get<AgingBucket[]>('/reports/aging'),

  vat: (from: string, to: string) =>
    billingHttp.get<VatLine[]>('/reports/vat', { params: { from, to } }),

  profit: (from: string, to: string) =>
    billingHttp.get('/reports/profit', { params: { from, to } }),
}
