// H2 scénario 7 — le Web (sans EGEN_TARGET, sans Host) garde son parcours existant (règle R2).
import { expect, test } from '@playwright/test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startStaticServer } from './support/static-server.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const BASE = '/egen-civitas/spa';

let server;
test.beforeAll(async () => {
  server = await startStaticServer({
    root: join(here, '.artifact/web'),
    base: BASE,
    extra: { [`${BASE}/e2e-fake.js`]: join(here, 'fixtures/e2e-fake.js') },
  });
});
test.afterAll(async () => {
  await server.close();
});

async function open(page, path) {
  const apiCalls = [];
  await page.route('**/egen/**', (route) => {
    apiCalls.push(route.request().url());
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.goto(server.origin + path);
  return { apiCalls };
}

test.describe('cible web, sans Host', () => {
  test('(7) démarre, monte l’app et ne montre jamais l’écran d’incompatibilité', async ({ page }) => {
    const { apiCalls } = await open(page, `${BASE}/e2e`);

    await expect(page.locator('#e2e-fake-mounted')).toBeAttached();
    await expect(page.locator('.egen-host-incompatible')).toHaveCount(0);
    expect(apiCalls.length).toBeGreaterThan(0);
    expect(server.requests.filter((r) => !r.startsWith('200'))).toEqual([]);
  });

  test('(7) aucune CSP imposée ; le filtrage par plateforme s’applique avec la cible web', async ({ page }) => {
    const warnings = [];
    page.on('console', (m) => m.type() === 'warning' && warnings.push(m.text()));
    await open(page, `${BASE}/e2e`);

    await expect(page.locator('#e2e-fake-mounted')).toBeAttached();
    expect(await page.locator('meta[http-equiv="Content-Security-Policy"]').count()).toBe(0);
    expect(warnings.some((w) => w.includes('@e2e/ios-only') && w.includes('pas enregistrée'))).toBe(true);
    expect(warnings.some((w) => w.includes('@e2e/fake') && w.includes('pas enregistrée'))).toBe(false);
  });

  test('(7) les overrides d’import map restent honorés (comportement Web existant)', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('egen:devtools', 'true');
      localStorage.setItem('import-map-override:@e2e/fake', '/egen-civitas/spa/pirate.js');
    });
    await open(page, `${BASE}/e2e`);

    await expect.poll(() => server.requests.some((r) => r.endsWith('/pirate.js'))).toBe(true);
  });
});
