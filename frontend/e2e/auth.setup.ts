/**
 * Auth setup — logs in once, saves auth state to a file.
 * All other tests reuse this state (faster, no repeated login).
 */
import { test as setup, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const AUTH_FILE = path.join(__dirname, '.auth/user.json')
const E2E_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@stours.local'
const E2E_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'change-me-local-admin'

setup('authenticate as super_admin', async ({ page }) => {
  await page.goto('/login')

  await page.getByLabel(/email/i).fill(E2E_ADMIN_EMAIL)
  await page.getByLabel(/mot de passe|password/i).fill(E2E_ADMIN_PASSWORD)
  await page.getByRole('button', { name: /connexion|se connecter|login/i }).click()

  // Wait for post-login redirect to dashboard
  await page.waitForURL(/\/(dashboard|projects|portal)/, { timeout: 15_000 })
  await expect(page).not.toHaveURL(/\/login/)

  // Persist auth state (cookies + localStorage token)
  await page.context().storageState({ path: AUTH_FILE })
})
