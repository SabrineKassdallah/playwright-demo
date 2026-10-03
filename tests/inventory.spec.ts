import { test, expect } from '../fixtures/fixtures';

// Ces tests utilisent la session sauvegardée par auth.setup.ts : pas de connexion ici
test.describe('Catalogue et panier', () => {
  test.beforeEach(async ({ inventoryPage }) => {
    await inventoryPage.goto();
  });

  test('le catalogue affiche 6 produits', { tag: '@smoke' }, async ({ inventoryPage }) => {
    await expect(inventoryPage.title).toHaveText('Products');
    await expect(inventoryPage.itemNames).toHaveCount(6);
  });

  test('ajouter puis retirer un produit du panier', async ({ inventoryPage }) => {
    await inventoryPage.addToCart('Sauce Labs Backpack');
    await expect(inventoryPage.cartBadge).toHaveText('1');

    await inventoryPage.addToCart('Sauce Labs Bike Light');
    await expect(inventoryPage.cartBadge).toHaveText('2');

    await inventoryPage.removeFromCart('Sauce Labs Backpack');
    await expect(inventoryPage.cartBadge).toHaveText('1');
  });

  test('tri par prix croissant', async ({ inventoryPage }) => {
    await inventoryPage.sortBy('lohi');

    const prices = await inventoryPage.prices();
    const sorted = [...prices].sort((a, b) => a - b);
    expect(prices).toEqual(sorted);
  });

  test('tri par nom Z → A', async ({ inventoryPage }) => {
    await inventoryPage.sortBy('za');

    await expect(inventoryPage.itemNames.first()).toHaveText('Test.allTheThings() T-Shirt (Red)');
  });
});
