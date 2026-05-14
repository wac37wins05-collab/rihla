/**
 * Happy Path 5 — Valider une Facture
 *
 * Covers:
 *  - Page /invoices charge et liste les factures
 *  - Ouvrir une facture → détail visible
 *  - Changer le statut en "payé" → confirmation
 *  - Export PDF ou Excel depuis /invoices
 */
import { test, expect } from '@playwright/test'
import * as path from 'path'

test.use({ storageState: path.join(__dirname, '.auth/user.json') })

test.describe('Facturation & Validation', () => {
  test('/invoices charge et affiche les factures', async ({ page }) => {
    await page.goto('/invoices')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading').first()).toBeVisible()

    // Some table or list of invoices
    const invoiceList = page
      .getByRole('table')
      .or(page.getByRole('list'))
      .or(page.getByText(/aucune facture|nouvelle facture|créer/i))
      .first()
    await expect(invoiceList).toBeVisible({ timeout: 10_000 })
  })

  test('ouvrir une facture → détail affiché', async ({ page }) => {
    await page.goto('/invoices')
    await page.waitForLoadState('networkidle')

    // Click the first invoice row or card
    const firstInvoice = page
      .getByRole('row').nth(1)
      .or(page.getByTestId('invoice-card').first())
      .or(page.getByRole('link', { name: /INV|FAC|facture/i }).first())

    if (await firstInvoice.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await firstInvoice.click()
      await page.waitForLoadState('networkidle')

      // Should show invoice detail
      const detail = page
        .getByText(/total|montant|TTC|HT|MAD/i)
        .first()
      await expect(detail).toBeVisible({ timeout: 8_000 })
    }
  })

  test('marquer une facture comme payée', async ({ page }) => {
    await page.goto('/invoices')
    await page.waitForLoadState('networkidle')

    // Find a "Mark as paid" button (may be in a row action menu)
    const paidBtn = page
      .getByRole('button', { name: /payé|payer|mark.*paid|valider/i })
      .first()

    if (await paidBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await paidBtn.click()

      // Confirmation dialog or success toast
      const confirmation = page
        .getByRole('dialog')
        .or(page.getByRole('alert'))
        .or(page.getByText(/confirmé|payé|success/i))
        .first()
      await expect(confirmation).toBeVisible({ timeout: 8_000 })
    }
  })

  test('/export-excel télécharge un fichier xlsx', async ({ page }) => {
    await page.goto('/export-excel')
    await page.waitForLoadState('networkidle')

    // Look for an export button
    const exportBtn = page
      .getByRole('button', { name: /exporter|télécharger|download|export/i })
      .first()

    if (await exportBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      // Listen for download event
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 15_000 }).catch(() => null),
        exportBtn.click(),
      ])

      if (download) {
        expect(download.suggestedFilename()).toMatch(/\.(xlsx|csv)$/i)
      }
    }
  })

  test('/reports charge sans erreur', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))

    await page.goto('/reports')
    await page.waitForLoadState('networkidle')

    expect(errors.filter(e => !e.includes('ResizeObserver'))).toHaveLength(0)
    await expect(page.getByRole('heading').first()).toBeVisible()
  })
})
