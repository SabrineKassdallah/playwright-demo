# Explication détaillée du projet Playwright

Voici une explication complète du projet, en partant de zéro.

---

# 0. Les notions de base, avant de lire les fichiers

**Playwright** est un outil de Microsoft qui **pilote un vrai navigateur** (Chrome, Firefox…) à ta place, avec du code. Il peut ouvrir une page, cliquer, remplir un champ, puis **vérifier** que le résultat est correct. C'est ce qu'on appelle un **test de bout en bout** (E2E) : on teste l'application comme le ferait un vrai utilisateur.

Le site testé ici est **SauceDemo** (https://www.saucedemo.com), une fausse boutique en ligne créée pour s'entraîner aux tests.

Quelques mots qui reviennent partout :

| Mot | Signification |
|---|---|
| **TypeScript** | Le langage du projet. C'est du JavaScript avec des types (`string`, `number`…). |
| **`async` / `await`** | Une action dans le navigateur prend du temps. `await` veut dire « attends que cette action soit terminée avant de passer à la suivante ». On le met devant presque toutes les lignes Playwright. |
| **`page`** | Un onglet du navigateur. C'est l'objet principal pour agir sur le site. |
| **Locator** | La façon de **trouver un élément** sur la page (un bouton, un champ…). Par exemple : « le bouton dont le texte est Login ». |
| **Assertion (`expect`)** | La vérification : « je m'attends à ce que le titre soit *Products* ». Si c'est faux, le test échoue. |
| **`test(...)`** | Un cas de test. |
| **`test.describe(...)`** | Un groupe de tests qui vont ensemble. |
| **`beforeEach`** | Du code exécuté **avant chaque test** du groupe. |

---

# 1. Les fichiers de configuration

## `package.json`
C'est la « carte d'identité » d'un projet Node.js (Node.js permet d'exécuter du JavaScript en dehors du navigateur).

- **`devDependencies`** : les bibliothèques nécessaires.
  - `@playwright/test` : Playwright lui-même.
  - `@types/node` : les types TypeScript de Node.
- **`scripts`** : des raccourcis de commandes. `npm run <nom>` les lance :

| Commande | Ce qu'elle fait |
|---|---|
| `npm test` | Lance **tous** les tests. |
| `npm run test:smoke` | Lance seulement les tests marqués `@smoke` (les plus importants, rapides). |
| `npm run test:headed` | Lance les tests **en montrant le navigateur** (par défaut il est invisible, on dit « headless »). |
| `npm run test:ui` | Ouvre une interface graphique pour lancer les tests et voir chaque étape. **Le plus utile pour apprendre.** |
| `npm run report` | Ouvre le rapport HTML des derniers tests. |
| `npm run codegen` | Ouvre le site. Tu cliques et Playwright **écrit le code pour toi**. |

## `package-lock.json`
Fichier généré automatiquement. Il fixe les **versions exactes** de toutes les bibliothèques installées (ici Playwright 1.63.0), pour que tout le monde ait exactement la même chose. On ne le modifie jamais à la main.

## `tsconfig.json`
La configuration de TypeScript. Les options importantes :
- `strict: true` : TypeScript signale plus d'erreurs, ce qui évite des bugs.
- `noEmit: true` : on ne génère pas de fichiers JavaScript, Playwright lit directement le TypeScript.

Tu n'auras presque jamais besoin d'y toucher.

## `.gitignore`
La liste des dossiers que **Git ne doit pas enregistrer** :
- `node_modules/` : les bibliothèques installées (très lourd, et `npm install` les recrée).
- `test-results/`, `playwright-report/`, `results/` : les résultats générés à chaque exécution.
- `.auth/` : la session de connexion sauvegardée. Elle contient des cookies, donc on ne la publie pas.

## `playwright.config.ts` (le fichier le plus important)
Il dit à Playwright **comment** exécuter les tests.

```ts
testDir: './tests',          // les tests sont dans le dossier tests/
timeout: 30_000,             // un test a 30 secondes maximum
expect: { timeout: 5_000 },  // une vérification attend jusqu'à 5 s que la condition devienne vraie
```
Ce dernier point est essentiel : Playwright **attend automatiquement**. Si tu vérifies qu'un texte s'affiche, il réessaie pendant 5 secondes avant de déclarer l'échec. Pas besoin d'ajouter des pauses (`sleep`).

```ts
fullyParallel: true,                  // plusieurs tests en même temps
retries: process.env.CI ? 2 : 0,      // en CI, un test raté est relancé 2 fois
workers: process.env.CI ? 2 : undefined,
```
`process.env.CI` est une variable qui existe seulement sur un serveur d'intégration continue (GitHub Actions, Jenkins). Un test qui échoue puis réussit au 2ᵉ essai est marqué **flaky** (instable).

```ts
reporter: [
  ['list'],                                        // affichage dans le terminal
  ['html', { open: 'never' }],                     // rapport HTML
  ['junit', { outputFile: 'results/junit.xml' }],  // fichier XML lu par Jenkins
],
```

```ts
use: {
  baseURL: 'https://www.saucedemo.com',  // page.goto('/') ouvre cette adresse
  testIdAttribute: 'data-test',          // voir l'explication ci-dessous
  trace: 'on-first-retry',               // enregistre une "trace" quand un test est relancé
  screenshot: 'only-on-failure',         // capture d'écran si échec
  video: 'retain-on-failure',            // vidéo gardée si échec
},
```
`testIdAttribute` : les développeurs de SauceDemo ont mis des attributs spéciaux dans le HTML, par exemple `<div data-test="title">`. Avec ce réglage, `getByTestId('title')` trouve cet élément.

La **trace** est un enregistrement complet du test (chaque action, captures, requêtes réseau). C'est l'outil n°1 pour comprendre pourquoi un test a échoué.

```ts
projects: [
  { name: 'setup', testMatch: /.*\.setup\.ts/ },
  { name: 'chromium', use: { ...devices['Desktop Chrome'], storageState: '.auth/standard_user.json' }, dependencies: ['setup'] },
  { name: 'firefox',  use: { ...devices['Desktop Firefox'], storageState: '.auth/standard_user.json' }, dependencies: ['setup'] },
],
```
Les **projets** sont des façons différentes d'exécuter les tests :
1. `setup` exécute d'abord `auth.setup.ts`, qui se connecte au site.
2. `chromium` et `firefox` exécutent ensuite tous les tests, **dans deux navigateurs**. `dependencies: ['setup']` veut dire « attends que setup soit terminé ». `storageState` veut dire « démarre avec la session déjà connectée ».

Chaque test est donc exécuté deux fois : une fois dans Chrome et une fois dans Firefox.

---

# 2. Les Page Objects (dossier `pages/`)

Le **Page Object Model** (POM) est un modèle d'organisation très courant. Pour chaque page du site, on crée une classe qui contient :
- les **locators** (où se trouvent les éléments),
- les **actions** (se connecter, ajouter au panier…).

L'avantage : si un bouton change sur le site, on corrige **un seul endroit** au lieu de tous les tests.

## `pages/LoginPage.ts`, la page de connexion

```ts
this.username = page.getByPlaceholder('Username');               // le champ avec le texte grisé "Username"
this.password = page.getByPlaceholder('Password');
this.loginButton = page.getByRole('button', { name: 'Login' });  // le bouton dont le nom est "Login"
this.error = page.getByTestId('error');                          // l'élément data-test="error"
```
Trois types de locators sont utilisés :
- `getByPlaceholder` : par le texte d'aide grisé d'un champ.
- `getByRole` : par le **rôle** de l'élément (bouton, lien, case à cocher…) et son nom visible. C'est la méthode recommandée par Playwright, car elle correspond à ce que voit l'utilisateur.
- `getByTestId` : par un attribut de test. Très stable.

Les méthodes :
- `goto()` : ouvre la page d'accueil (`/`, donc `https://www.saucedemo.com/`).
- `login(user, mdp)` : remplit les deux champs (`fill`) et clique sur le bouton (`click`).

`readonly` veut dire que la propriété ne peut pas être modifiée après sa création.

## `pages/InventoryPage.ts`, la liste des produits
Locators : le titre, le badge du panier (le petit chiffre rouge), le lien du panier, la liste de tri, les noms et les prix des produits.

Méthodes intéressantes :
```ts
product(name: string): Locator {
  return this.page.getByTestId('inventory-item').filter({ hasText: name });
}
```
Il y a 6 cartes produits sur la page, et chacune a un bouton « Add to cart ». Pour cliquer sur **le bon**, on prend d'abord **la carte qui contient le nom du produit** (`filter({ hasText })`), puis on cherche le bouton **à l'intérieur** de cette carte :
```ts
async addToCart(name: string) {
  await this.product(name).getByRole('button', { name: 'Add to cart' }).click();
}
```
- `sortBy('lohi')` : choisit une option dans la liste de tri (`lohi` = prix croissant, `hilo` = décroissant, `az`/`za` = par nom).
- `prices()` : récupère tous les textes de prix (`["$29.99", "$9.99", ...]`), enlève le `$` et les transforme en nombres, pour pouvoir vérifier le tri.

## `pages/CheckoutPage.ts`, le panier et la commande
Il regroupe le panier et les étapes de paiement : produits du panier, bouton Checkout, champs Prénom / Nom / Code postal, bouton Continue, message d'erreur, sous-total, bouton Finish, message de confirmation.

La méthode `fillInformation(prenom, nom, codePostal)` remplit les trois champs et clique sur Continue.

---

# 3. Les fixtures, `fixtures/fixtures.ts`

Une **fixture** est un objet que Playwright **prépare et donne automatiquement** à un test. Tu en as déjà vu une sans le savoir : `page` est une fixture intégrée à Playwright.

Ce fichier ajoute trois fixtures personnalisées :
```ts
export const test = base.extend<Pages>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  ...
});
```
Concrètement : « quand un test demande `loginPage`, crée un `new LoginPage(page)` et donne-le au test ». `use(...)` est le moment où le test s'exécute.

Résultat, dans les tests on écrit simplement :
```ts
test('...', async ({ loginPage }) => {
  await loginPage.login('standard_user', 'secret_sauce');
});
```
au lieu de créer l'objet à la main dans chaque test.

Le fichier réexporte aussi `expect`. Les tests importent donc `test` et `expect` depuis `../fixtures/fixtures` et non directement depuis `@playwright/test`.

---

# 4. Les tests (dossier `tests/`)

Les fichiers de test finissent par `.spec.ts`. Ce suffixe permet à Playwright de les reconnaître.

## `tests/auth.setup.ts`, la connexion faite une seule fois
```ts
await loginPage.goto();
await loginPage.login('standard_user', process.env.SAUCE_PASSWORD ?? 'secret_sauce');
await expect(page).toHaveURL(/inventory/);   // on vérifie qu'on est bien connecté
await page.context().storageState({ path: '.auth/standard_user.json' });
```
La dernière ligne **sauvegarde la session** (cookies et localStorage) dans un fichier. Grâce à la configuration, tous les autres tests chargent ce fichier et démarrent **déjà connectés**. On gagne du temps, car on ne remplit pas le formulaire de connexion avant chaque test.

`process.env.SAUCE_PASSWORD ?? 'secret_sauce'` signifie : utilise la variable d'environnement `SAUCE_PASSWORD` si elle existe, sinon `secret_sauce`.

`/inventory/` (entre barres obliques) est une **expression régulière**. Ici, elle veut juste dire « l'URL contient *inventory* ».

## `tests/login.spec.ts`, les tests de connexion
```ts
test.use({ storageState: { cookies: [], origins: [] } });
```
Ici on veut tester la connexion elle-même, donc on **annule** la session sauvegardée : on part d'un navigateur vide.

Les tests :
1. **Connexion réussie** : on vérifie que l'URL contient `inventory.html` et que le titre est « Products ». Il porte le tag `@smoke`.
2. **Utilisateur bloqué** : `locked_out_user` doit afficher un message d'erreur.
3. **Tests pilotés par les données** : le tableau `casErreur` contient 3 cas (nom vide, mot de passe vide, mauvais mot de passe). La boucle `for` **crée un test par cas**. On écrit le test une fois et on le fait tourner avec plusieurs jeux de données.

`expect(page).not.toHaveURL(/inventory/)` : `not` inverse la vérification, donc « on n'est PAS arrivé sur la page des produits ».

## `tests/inventory.spec.ts`, le catalogue et le panier
Ces tests démarrent déjà connectés grâce à `auth.setup.ts`. `beforeEach` ouvre la page des produits avant chaque test.

1. **Le catalogue affiche 6 produits** : `toHaveCount(6)` compte les éléments.
2. **Ajouter puis retirer un produit** : on vérifie que le badge du panier passe à 1, puis 2, puis revient à 1.
3. **Tri par prix croissant** : on récupère les prix, on fait une copie triée (`[...prices].sort(...)`) et on vérifie que les deux sont identiques. Si oui, la page était bien triée.
4. **Tri Z → A** : le premier produit doit être « Test.allTheThings() T-Shirt (Red) ».

## `tests/checkout.spec.ts`, le parcours d'achat
Le premier test est un scénario complet, découpé avec `test.step(...)` :
1. Ajouter deux produits (29,99 $ + 9,99 $), le badge affiche 2.
2. Aller au panier, il contient 2 articles.
3. Cliquer sur Checkout et remplir le formulaire.
4. Vérifier le total (`Item total: $39.98`) et cliquer sur Finish.
5. Vérifier « Thank you for your order! » et que le badge a disparu (`toBeHidden`).

`test.step` n'influence pas le comportement du test. Il sert à rendre le **rapport lisible** : chaque étape apparaît avec son nom, et on voit tout de suite laquelle a échoué.

`{ tag: ['@smoke', '@regression'] }` : des **étiquettes** qui permettent de lancer un sous-ensemble de tests (`--grep @smoke`).

Le second test vérifie que le code postal est **obligatoire** : on le laisse vide et on attend le message d'erreur.

## `tests/api.spec.ts`, les tests d'API (sans navigateur)
Une **API** est une adresse qu'un programme appelle pour obtenir ou envoyer des données, généralement en JSON. On utilise ici la fixture `request`, qui envoie des requêtes HTTP directement, sans ouvrir de navigateur. C'est comme Postman, mais en code.

L'API utilisée, JSONPlaceholder, est une fausse API publique prévue pour les tests.

1. **GET `/users/1`** : on lit un utilisateur. Le code de statut doit être **200** (OK), et le JSON doit contenir `id: 1` et `name: 'Leanne Graham'`. `toMatchObject` vérifie seulement les champs indiqués, pas tout l'objet.
2. **POST `/posts`** : on crée une publication. Le code doit être **201** (créé).
3. **GET `/users/9999`** : cet utilisateur n'existe pas, donc on attend **404** (non trouvé).

## `tests/mock.spec.ts`, la simulation du réseau
Un **mock** consiste à **intercepter** les requêtes que la page envoie au serveur et à **répondre à la place du serveur**. On peut ainsi tester l'interface sans dépendre du vrai serveur.

La page de démo utilisée affiche une liste de fruits récupérée sur `/api/v1/fruits`.

```ts
await page.route('*/**/api/v1/fruits', route => ...);
```
« Chaque fois que la page appelle cette adresse, exécute ma fonction. » Cette ligne doit être placée **avant** `page.goto(...)`.

1. **Remplacer la réponse** : `route.fulfill({ json: [...] })` renvoie une fausse liste qui ne contient que « Fraise-QA ». On vérifie qu'elle s'affiche.
2. **Modifier la vraie réponse** : `route.fetch()` appelle le vrai serveur, puis on ajoute « Ananas-QA » à la liste avant de la donner à la page. On voit à la fois les vrais fruits et le fruit ajouté.
3. **Simuler une panne** : `route.abort()` coupe la requête, et aucun fruit ne s'affiche.

Remarque : `api.spec.ts` et `mock.spec.ts` importent depuis `@playwright/test` et non depuis les fixtures, car ils n'ont pas besoin des Page Objects.

---

# 5. L'intégration continue (CI)

La **CI** consiste à lancer les tests **automatiquement** sur un serveur, par exemple à chaque modification du code. Le projet propose deux outils au choix.

## `.github/workflows/playwright.yml`, GitHub Actions
Ce fichier est lu par GitHub si le projet y est publié.

**Quand ?** (`on:`)
- à chaque **pull request** vers `main` (une proposition de modification),
- à chaque **push** sur `main`,
- **chaque nuit** du lundi au vendredi à 2 h UTC (`cron: '0 2 * * 1-5'`),
- **manuellement** (`workflow_dispatch`).

`concurrency` : si on pousse deux fois rapidement, l'ancienne exécution est annulée.

**Étapes** (`steps:`) sur une machine Ubuntu :
1. `checkout` : récupère le code.
2. `setup-node` : installe Node.js 22.
3. `npm ci` : installe les bibliothèques en suivant exactement `package-lock.json`.
4. `npx playwright install --with-deps chromium firefox` : installe les navigateurs.
5. Pour une pull request, seulement les tests `@smoke` dans Chrome (rapide). Sinon, **tous** les tests (régression complète).
6. Envoie le rapport HTML et le fichier JUnit comme **artefacts** (fichiers téléchargeables depuis GitHub). `if: always()` garantit que ça se fait **même si les tests échouent**, c'est justement là qu'on en a le plus besoin.

## `Jenkinsfile`, le même principe pour Jenkins
Jenkins est un autre outil de CI, très courant en entreprise.
- `agent { docker { image 'mcr.microsoft.com/playwright:v1.63.0-noble' } }` : les tests tournent dans un conteneur Docker officiel où Node et les navigateurs sont déjà installés. La version (1.63.0) correspond bien à celle du `package-lock.json`, ce qui est nécessaire.
- `parameters` : au lancement manuel, on choisit `smoke` ou `complete`.
- `triggers { cron('H 2 * * 1-5') }` : exécution chaque nuit de semaine.
- `environment { CI = 'true' }` : active les relances (`retries`) définies dans la configuration.
- `stages` : Install, puis Smoke **ou** Régression complète selon le paramètre.
- `post { always { ... } }` : publie toujours le rapport JUnit (si des tests échouent, le build devient **UNSTABLE**, en jaune) et le rapport HTML.

---

# 6. `README.md`
La documentation du projet : comment l'installer, les commandes, la structure, un guide pour expliquer chaque notion en entretien et **8 exercices**. C'est la meilleure suite à cette explication.

---

# Comment tout s'enchaîne quand tu lances `npm test`

```
npm test
  └─ Playwright lit playwright.config.ts
       ├─ projet "setup"    → auth.setup.ts : connexion, puis session sauvegardée dans .auth/
       ├─ projet "chromium" → tous les *.spec.ts dans Chrome, déjà connecté
       └─ projet "firefox"  → tous les *.spec.ts dans Firefox, déjà connecté
            │
            tests → utilisent les fixtures → qui créent les Page Objects → qui pilotent la page
  └─ Résultats : terminal + playwright-report/ (HTML) + results/junit.xml
```

# Pour commencer concrètement
```bash
npm install
npx playwright install chromium firefox
npm run test:ui
```
Dans l'interface, lance **« parcours d'achat complet »** et clique sur chaque étape dans la chronologie : tu verras le navigateur à chaque instant, avec l'élément ciblé par chaque locator. C'est la façon la plus rapide de comprendre comment le code et le site sont liés.
