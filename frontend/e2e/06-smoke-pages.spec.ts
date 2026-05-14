/**
 * Smoke Tests — Pages Critiques
 *
 * Vérifie que chaque page clé charge sans crash JS et affiche un heading.
 * Rapide à maintenir : ajouter/retirer une route = une ligne.
 */
import { test, expect } from '@playwright/test'
import * as path from 'path'

test.use({ storageState: path.join(__dirname, '.auth/user.json') })

const CRITICAL_ROUTES = [
  '/dashboard',
  '/projects',
  '/travel-designer',
  '/quotations',
  '/itineraries',
  '/operations',
  '/operations/calendar',
  '/invoices',
  '/analytics',
  '/crm',
  '/crm/leads',
  '/crm/pipeline',
  '/budget-tracker',
  '/export-excel',
  '/allotments',
  '/passengers',
  '/whatsapp',
  '/flight-search',
  '/supplier-scoring',
  '/group-ops',
  '/pricing-coach',
  '/circuit-comparator',
  '/notifications',
  '/settings',
]

for (const route of CRITICAL_ROUTES) {
  test(`${route} — pas de crash JS`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => {
      // Ignore known benign warnings
      if (!e.message.includes('ResizeObserver') && !e.message.includes('Non-Error')) {
        errors.push(`${e.message}`)
      }
    })

    await page.goto(route)
    await page.waitForLoadState('networkidle', { timeout: 20_000 })

    // No JS crashes
    expect(errors, `JS errors on ${route}: ${errors.join(', ')}`).toHaveLength(0)

    // Page should render something meaningful (not blank)
    const heading = page.getByRole('heading').first()
    await expect(heading).toBeVisible({ timeout: 10_000 })
  })
}
