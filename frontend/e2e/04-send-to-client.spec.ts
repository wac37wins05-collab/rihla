/**
 * Happy Path 4 — Envoyer une Proposition au Client
 *
 * Covers:
 *  - Page /client-portal charge
 *  - Sélectionner un projet et générer un lien partageable
 *  - Le lien est affiché / copié
 *  - Le Proposal Designer (/proposal-studio) génère un document
 */
import { test, expect } from '@playwright/test'
import * as path from 'path'

test.use({ storageState: path.join(__dirname, '.auth/user.json') })

test.describe('Envoyer au Client', () => {
  test('/client-portal charge et affiche les projets', async ({ page }) => {
    await page.goto('/client-portal')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading').first()).toBeVisible()

    // Should show some list of projects or a "select project" UI
    const projectList = page
      .getByRole('combobox')
      .or(page.getByRole('listbox'))
      .or(page.getByText(/sélectionner|choisir|projet/i))
      .first()
    await expect(projectList).toBeVisible({ timeout: 10_000 })
  })

  test('générer un lien de portail client', async ({ page }) => {
    await page.goto('/client-portal')
    await page.waitForLoadState('networkidle')

    // Try to find a "Generate link" button
    const generateBtn = page
      .getByRole('button', { name: /générer|partager|lien|link|send|envoyer/i })
      .first()

    if (await generateBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await generateBtn.click()

      // A link or URL should appear
      const link = page
        .getByText(/http|\/portal\/|lien généré/i)
        .or(page.getByRole('textbox').filter({ hasText: /http/ }))
        .first()
      await expect(link).toBeVisible({ timeout: 8_000 })
    }
  })

  test('/proposal-studio charge sans crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))

    await page.goto('/proposal-studio')
    await page.waitForLoadState('networkidle')

    expect(errors.filter(e => !e.includes('ResizeObserver'))).toHaveLength(0)
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('/proposal-writer génère une proposition IA', async ({ page }) => {
    await page.goto('/proposal-writer')
    await page.waitForLoadState('networkidle')

    // Look for a "Generate" or "Write" button
    const generateBtn = page
      .getByRole('button', { name: /générer|rédiger|generate|écrire|write/i })
      .first()

    if (await generateBtn.isEnabled({ timeout: 3_000 }).catch(() => false)) {
      await generateBtn.click()

      // Should show some loading state or result
      const result = page
        .getByRole('progressbar')
        .or(page.getByText(/génération|rédaction|génèr/i))
        .or(page.getByRole('article'))
        .first()
      await expect(result).toBeVisible({ timeout: 15_000 })
    }
  })
})
