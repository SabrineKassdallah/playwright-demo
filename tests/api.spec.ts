import { test, expect } from '@playwright/test';

// Tests d'API avec la fixture "request" (équivalent de Postman/Newman)
// JSONPlaceholder : fausse API REST publique, prévue pour les tests
const API = 'https://jsonplaceholder.typicode.com';

test.describe('API REST', () => {
  test('GET : récupérer un utilisateur', { tag: '@api' }, async ({ request }) => {
    const res = await request.get(`${API}/users/1`);

    expect(res.status()).toBe(200);
    const user = await res.json();
    expect(user).toMatchObject({ id: 1, name: 'Leanne Graham' });
    expect(user.email).toContain('@');
  });

  test('POST : créer une publication', { tag: '@api' }, async ({ request }) => {
    const res = await request.post(`${API}/posts`, {
      data: { title: 'Entretien QA', body: 'Test Playwright', userId: 1 },
    });

    expect(res.status()).toBe(201);
    const post = await res.json();
    expect(post).toMatchObject({ title: 'Entretien QA', userId: 1 });
    expect(post.id).toBeDefined();
  });

  test('GET : ressource inexistante → 404', { tag: '@api' }, async ({ request }) => {
    const res = await request.get(`${API}/users/9999`);
    expect(res.status()).toBe(404);
  });
});
