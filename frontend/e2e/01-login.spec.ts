/**
 * Happy Path 1 — Login / Authentication
 *
 * Covers:
 *  - Valid login → redirect to dashboard
 *  - Invalid login → error message shown
 *  - Logout → redirected back to /login
 */
import { test, expect } from '@playwright/test'

const E2E_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@stours.local'
const E2E_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'change-me-local-admin'

test.describe('Login', () => {
  test('valid credentials → dashboard', async ({ page }) => {
    await page.goto('/login')

    await page.getByLabel(/email/i).fill(E2E_ADMIN_EMAIL)
    await page.getByLabel(/mot de passe|password/i).fill(E2E_ADMIN_PASSWORD)
    await page.getByRole('button', { name: /connexion|se connecter|login/i }).click()

    await page.waitForURL(/\/(dashboard|projects)/, { timeout: 15_000 })
    await expect(page).not.toHaveURL(/\/login/)

    // Sidebar should be visible
    await expect(page.getByRole('navigation')).toBeVisible()
  })

  test('invalid credentials → error message', async ({ page }) => {
    await page.goto('/login')

    await page.getByLabel(/email/i).fill('bad@email.com')
    await page.getByLabel(/mot de passe|password/i).fill('wrong_password')
    await page.getByRole('button', { name: /connexion|se connecter|login/i }).click()

    // Should stay on /login with an error
    await expect(page).toHaveURL(/\/login/)
    const error = page.getByRole('alert').or(page.locator('[data-testid="login-error"]'))
    await expect(error.first()).toBeVisible({ timeout: 5_000 })
  })

  test('logout → back to /login', async ({ page }) => {
    // Log in first
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(E2E_ADMIN_EMAIL)
    await page.getByLabel(/mot de passe|password/i).fill(E2E_ADMIN_PASSWORD)
    await page.getByRole('button', { name: /connexion|se connecter|login/i }).click()
    await page.waitForURL(/\/(dashboard|projects)/)

    // Find and click logout
    const logoutBtn = page.getByRole('button', { name: /quitter|déconnexion|logout/i })
    await logoutBtn.click()

    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })
})
