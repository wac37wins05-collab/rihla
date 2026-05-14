import { defineConfig, devices } from '@playwright/test'

/**
 * RIHLA — Playwright E2E Configuration
 *
 * Setup:
 *   npm install             (first time — installs @playwright/test)
 *   npx playwright install  (first time — installs browser binaries)
 *
 * Run:
 *   npm run test:e2e          → headless CI mode
 *   npm run test:e2e:ui       → interactive Playwright UI
 *   npm run test:e2e:headed   → headed mode (visible browser)
 *   npm run test:e2e:report   → open last HTML report
 *
 * Requires:
 *   - Frontend running on http://localhost:5173  (npm run dev)
 *   - Backend  running on http://localhost:8000  (uvicorn)
 *   - DB seeded with demo data (ENVIRONMENT=development python seed_all.py)
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // DMC flows share DB state — keep sequential
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    locale: 'fr-FR',
    timezoneId: 'Africa/Casablanca',
  },

  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      // Login tests run WITHOUT pre-auth (they test auth themselves)
      name: 'chromium-no-auth',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /01-login\.spec\.ts/,
    },
  ],

  // Automatically start dev server before tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
