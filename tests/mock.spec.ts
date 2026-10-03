import { test, expect } from '@playwright/test';

// Simulation (mock) de réponses API avec page.route
// Page de démo officielle de Playwright, qui affiche une liste de fruits venant de /api/v1/fruits
const DEMO = 'https://demo.playwright.dev/api-mocking';

test.describe('Mock réseau', () => {
  test('remplacer la réponse de l\'API', async ({ page }) => {
    await page.route('*/**/api/v1/fruits', route =>
      route.fulfill({ json: [{ name: 'Fraise-QA', id: 21 }] })
    );

    await page.goto(DEMO);

    await expect(page.getByText('Fraise-QA')).toBeVisible();
  });

  test('modifier la vraie réponse de l\'API', async ({ page }) => {
    await page.route('*/**/api/v1/fruits', async route => {
      const response = await route.fetch();          // appelle la vraie API
      const json = await response.json();
      json.push({ name: 'Ananas-QA', id: 100 });     // ajoute un élément
      await route.fulfill({ response, json });
    });

    await page.goto(DEMO);

    await expect(page.getByText('Ananas-QA')).toBeVisible();
    await expect(page.getByText('Strawberry')).toBeVisible();   // les vraies données sont toujours là
  });

  test('simuler une panne réseau', async ({ page }) => {
    await page.route('*/**/api/v1/fruits', route => route.abort());

    await page.goto(DEMO);

    await expect(page.getByText('Strawberry')).toBeHidden();
  });
});
