import { test as setup, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

// Projet "setup" : se connecte UNE fois et sauvegarde la session (cookies + localStorage).
// Les projets chromium/firefox réutilisent ce fichier : leurs tests démarrent déjà connectés.
setup('connexion standard_user', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('standard_user', process.env.SAUCE_PASSWORD ?? 'secret_sauce');
  await expect(page).toHaveURL(/inventory/);

  await page.context().storageState({ path: '.auth/standard_user.json' });
});
