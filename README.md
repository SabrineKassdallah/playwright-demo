# Playwright Demo – SauceDemo

Projet d'entraînement **Playwright + TypeScript** : tests de bout en bout, tests d'API, mocks réseau et intégration CI (GitHub Actions et Jenkins).

Application testée : [SauceDemo](https://www.saucedemo.com), un site e-commerce de démonstration prévu pour s'entraîner au test.

## Installation et lancement

```bash
npm install
npx playwright install chromium firefox

npm test                 # tous les tests, Chromium + Firefox
npm run test:smoke       # seulement les tests tagués @smoke
npm run test:headed      # voir le navigateur
npm run test:ui          # mode interactif (le plus pratique pour apprendre)
npm run report           # ouvrir le rapport HTML
npm run codegen          # enregistrer des actions et générer le code
```

## Structure

```
playwright.config.ts     configuration : baseURL, reporters, traces, projets navigateurs
pages/                   Page Objects (un fichier par page)
  LoginPage.ts
  InventoryPage.ts
  CheckoutPage.ts
fixtures/fixtures.ts     fixtures personnalisées : injectent les Page Objects dans les tests
tests/
  auth.setup.ts          connexion une seule fois → session sauvegardée (storageState)
  login.spec.ts          connexion : cas passant, utilisateur bloqué, tests pilotés par les données
  inventory.spec.ts      catalogue, panier, tri
  checkout.spec.ts       parcours d'achat complet avec test.step
  api.spec.ts            tests d'API REST (GET, POST, 404)
  mock.spec.ts           simulation de réponses API, panne réseau
.github/workflows/       pipeline GitHub Actions
Jenkinsfile              pipeline Jenkins
```

---

# Guide d'apprentissage

Ce que chaque fichier montre, et comment l'expliquer en entretien.

## 1. La configuration – `playwright.config.ts`

| Option | Rôle | À dire en entretien |
|---|---|---|
| `baseURL` | URL de base, `page.goto('/')` s'y ajoute | On change d'environnement avec la variable `BASE_URL` |
| `testIdAttribute: 'data-test'` | `getByTestId` cherche `data-test` au lieu de `data-testid` | Les attributs de test sont les locators les plus stables |
| `fullyParallel`, `workers` | Exécution en parallèle | Les tests doivent être indépendants |
| `retries` | Relance en cas d'échec (seulement en CI) | Un test qui réussit au 2e essai est marqué **flaky** |
| `reporter` | list + HTML + **JUnit** | Le JUnit XML sert pour Jenkins et pour l'envoi dans Zephyr |
| `trace: 'on-first-retry'` | Enregistre une trace quand un test est relancé | Outil n°1 pour analyser un échec en CI |
| `projects` | setup, chromium, firefox | Multi-navigateurs + connexion partagée |

## 2. Les Page Objects – `pages/`

- Chaque page a sa classe : **locators** en propriétés, **actions** en méthodes.
- Les **assertions restent dans les tests**, pas dans les Page Objects.
- Plusieurs types de locators sont utilisés volontairement :
  - `getByPlaceholder('Username')` et `getByRole('button', { name: 'Login' })` → orientés utilisateur.
  - `getByTestId('title')` → attribut de test, très stable.
  - `.filter({ hasText: name })` dans `InventoryPage.product()` → trouver le bouton **dans la carte d'un produit précis**. C'est l'équivalent d'un XPath `//div[...]/ancestor::...//button`, en beaucoup plus lisible.

## 3. Les fixtures – `fixtures/fixtures.ts`

Avec `test.extend`, chaque test reçoit directement `loginPage`, `inventoryPage`, `checkoutPage` :

```ts
test('...', async ({ loginPage }) => { await loginPage.login(...) });
```

À dire : *« Les fixtures remplacent les `beforeEach` qui créent les objets. Elles ne sont créées que si le test les demande, et elles peuvent gérer le nettoyage après le `use()`. »*

## 4. La connexion partagée – `tests/auth.setup.ts`

1. Le projet `setup` se connecte une fois et enregistre cookies + localStorage dans `.auth/standard_user.json`.
2. Les projets `chromium` et `firefox` ont `dependencies: ['setup']` et `storageState: '.auth/...'`.
3. Résultat : `inventory.spec.ts` et `checkout.spec.ts` démarrent **déjà connectés**.
4. `login.spec.ts` fait l'inverse avec `test.use({ storageState: { cookies: [], origins: [] } })` : il a besoin d'une session vide.

À dire : *« On ne teste la connexion par l'interface qu'une fois, dans les tests de connexion. Pour les autres tests, on réutilise la session : c'est beaucoup plus rapide et ça évite que tous les tests échouent si la page de connexion a un problème. »*

## 5. Tests pilotés par les données – `tests/login.spec.ts`

La boucle `for (const c of casErreur)` génère un test par cas d'erreur. C'est l'équivalent d'un **Scenario Outline + Examples** de Cucumber.

## 6. Les étapes – `tests/checkout.spec.ts`

`test.step('Ajouter deux produits au panier', ...)` découpe le test. Les étapes apparaissent dans le rapport HTML et dans la trace : le test se lit comme un cas de test Zephyr (étapes + résultats attendus).

## 7. Tests d'API – `tests/api.spec.ts`

La fixture `request` envoie des requêtes HTTP sans navigateur : vérification du **code de statut** et du **contenu JSON** (`toMatchObject`). C'est l'équivalent de vos collections Postman/Newman, mais dans le même framework que les tests de l'interface.

## 8. Mocks réseau – `tests/mock.spec.ts`

| Test | Technique | Utilité |
|---|---|---|
| Remplacer la réponse | `route.fulfill({ json })` | Tester le front sans dépendre du back |
| Modifier la vraie réponse | `route.fetch()` puis `route.fulfill` | Ajouter un cas particulier dans des données réelles |
| Panne réseau | `route.abort()` | Vérifier le comportement en cas d'erreur |
