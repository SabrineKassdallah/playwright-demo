import { test, expect } from '../fixtures/fixtures';

// Les tests de connexion doivent partir SANS session : on vide le storageState
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Connexion', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
  });

  test('connexion réussie', { tag: '@smoke' }, async ({ page, loginPage }) => {
    await loginPage.login('standard_user', 'secret_sauce');

    await expect(page).toHaveURL(/inventory\.html/);
    await expect(page.getByTestId('title')).toHaveText('Products');
  });

  test('utilisateur bloqué', async ({ loginPage }) => {
    await loginPage.login('locked_out_user', 'secret_sauce');

    await expect(loginPage.error).toContainText('this user has been locked out');
  });

  // Tests pilotés par les données (équivalent du Scenario Outline Cucumber)
  const casErreur = [
    { username: '', password: 'secret_sauce', message: 'Username is required' },
    { username: 'standard_user', password: '', message: 'Password is required' },
    { username: 'standard_user', password: 'mauvais', message: 'Username and password do not match' },
  ];

  for (const c of casErreur) {
    test(`message d'erreur : ${c.message}`, async ({ page, loginPage }) => {
      await loginPage.login(c.username, c.password);

      await expect(loginPage.error).toBeVisible();
      await expect(loginPage.error).toContainText(c.message);
      await expect(page).not.toHaveURL(/inventory/);   // on reste sur la page de connexion
    });
  }
});
