/**
 * Happy Path 2 — Créer un Projet
 *
 * Covers:
 *  - Navigate to /projects/new
 *  - Fill out the new project form
 *  - Submit → project appears in the list
 *  - Project detail page loads correctly
 */
import { test, expect } from '@playwright/test'
import { chromium } from '@playwright/test'
import * as path from 'path'

// Reuse authenticated session
test.use({ storageState: path.join(__dirname, '.auth/user.json') })

const PROJECT_NAME = `E2E Test — YS Travel ${Date.now()}`

test.describe('Créer un Projet', () => {
  test('ouvrir le formulaire via raccourci Ctrl+Shift+N', async ({ page }) => {
    await page.goto('/projects')

    await page.keyboard.press('Control+Shift+N')

    // Should navigate to new project page
    await page.waitForURL(/\/projects\/new|\/projects\?new=1/, { timeout: 8_000 })
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('créer un projet complet → apparaît dans la liste', async ({ page }) => {
    await page.goto('/projects/new')
    await page.waitForLoadState('networkidle')

    // Fill project name (various possible field labels)
    const nameField = page.getByLabel(/nom du (projet|dossier)|référence|project name/i).first()
    await nameField.fill(PROJECT_NAME)

    // Fill client / agence field if present
    const clientField = page.getByLabel(/client|agence/i).first()
    if (await clientField.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await clientField.fill('YS Travel Morocco')
    }

    // Fill destination if present
    const destField = page.getByLabel(/destination/i).first()
    if (await destField.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await destField.fill('Marrakech')
    }

    // Fill pax count if present
    const paxField = page.getByLabel(/pax|participants|voyageurs/i).first()
    if (await paxField.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await paxField.fill('12')
    }

    // Submit the form
    const submitBtn = page.getByRole('button', { name: /créer|sauvegarder|enregistrer|create|save/i }).first()
    await submitBtn.click()

    // Should redirect to project detail or list
    await page.waitForURL(/\/projects\/[\w-]+|\/projects/, { timeout: 15_000 })

    // Navigate to projects list and verify the new project appears
    await page.goto('/projects')
    await page.waitForLoadState('networkidle')

    // Project should appear in list (may need to search)
    const projectInList = page.getByText(PROJECT_NAME, { exact: false })
    await expect(projectInList).toBeVisible({ timeout: 10_000 })
  })

  test('la page /projects charge correctement', async ({ page }) => {
    await page.goto('/projects')
    await page.waitForLoadState('networkidle')

    // Page should have a title and at least a "New Project" button
    await expect(page.getByRole('heading').first()).toBeVisible()
    const createBtn = page.getByRole('button', { name: /nouveau|créer|new/i }).first()
      .or(page.getByRole('link', { name: /nouveau|créer|new/i }).first())
    await expect(createBtn).toBeVisible()
  })
})
