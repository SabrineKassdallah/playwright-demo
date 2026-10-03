import { test, expect } from '../fixtures/fixtures';

test.describe('Commande', () => {
  test.beforeEach(async ({ inventoryPage }) => {
    await inventoryPage.goto();
  });

  // test.step découpe le test en étapes lisibles dans le rapport (comme un cas de test Zephyr)
  test('parcours d\'achat complet', { tag: ['@smoke', '@regression'] }, async ({ page, inventoryPage, checkoutPage }) => {
    await test.step('Ajouter deux produits au panier', async () => {
      await inventoryPage.addToCart('Sauce Labs Backpack');      // 29.99
      await inventoryPage.addToCart('Sauce Labs Bike Light');    //  9.99
      await expect(inventoryPage.cartBadge).toHaveText('2');
    });

    await test.step('Vérifier le panier', async () => {
      await inventoryPage.cartLink.click();
      await expect(page).toHaveURL(/cart\.html/);
      await expect(checkoutPage.cartItems).toHaveCount(2);
    });

    await test.step('Saisir les informations client', async () => {
      await checkoutPage.checkoutButton.click();
      await checkoutPage.fillInformation('Sabrine', 'Kassdallah', '94230');
    });

    await test.step('Vérifier le total et valider', async () => {
      await expect(checkoutPage.subtotal).toHaveText('Item total: $39.98');
      await checkoutPage.finishButton.click();
    });

    await test.step('Vérifier la confirmation', async () => {
      await expect(checkoutPage.completeHeader).toHaveText('Thank you for your order!');
      await expect(inventoryPage.cartBadge).toBeHidden();   // panier vidé
    });
  });

  test('le code postal est obligatoire', async ({ inventoryPage, checkoutPage }) => {
    await inventoryPage.addToCart('Sauce Labs Backpack');
    await inventoryPage.cartLink.click();
    await checkoutPage.checkoutButton.click();

    await checkoutPage.fillInformation('Sabrine', 'Kassdallah', '');

    await expect(checkoutPage.error).toHaveText('Error: Postal Code is required');
  });
});
