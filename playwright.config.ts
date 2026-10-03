import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,                       // timeout d'un test
  expect: { timeout: 5_000 },            // timeout des assertions web-first
  fullyParallel: true,                   // tests en parallèle, même dans un fichier
  retries: process.env.CI ? 2 : 0,       // retries seulement en CI → statut "flaky"
  workers: process.env.CI ? 2 : undefined,

  reporter: [
    ['list'],                                         // console
    ['html', { open: 'never' }],                      // rapport HTML
    ['junit', { outputFile: 'results/junit.xml' }],   // pour Jenkins / Zephyr
  ],

  use: {
    baseURL: process.env.BASE_URL ?? 'https://www.saucedemo.com',
    testIdAttribute: 'data-test',        // SauceDemo utilise data-test au lieu de data-testid
    trace: 'on-first-retry',             // Trace Viewer
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // 1. Connexion une seule fois, la session est sauvegardée
    { name: 'setup', testMatch: /.*\.setup\.ts/ },

    // 2. Tests qui partent déjà connectés
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: '.auth/standard_user.json' },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], storageState: '.auth/standard_user.json' },
      dependencies: ['setup'],
    },
  ],
});
