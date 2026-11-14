// H2 — e2e du SPA statique en cible native, avec un Host simulé (`createMockHost`) : voir docs/EGEN-FRAMEWORK-DEV.md.
import { expect, test } from '@playwright/test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mockHostInitScript } from './support/mock-host.mjs';
import { startStaticServer } from './support/static-server.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const API = 'https://api.test.local';

const SESSION_HOST = {
  capabilities: { session: { v: 1 } },
  handlers: {
    'session.getAuthorization': () => 'Bearer ' + (window.__tok ||= 't1'),
    'session.refresh': () => {
      window.__tok = 't2';
      window.__refreshed = (window.__refreshed || 0) + 1;
      return true;
    },
  },
};

let server;
test.beforeAll(async () => {
  server = await startStaticServer({
    root: join(here, '.artifact/android'),
    extra: { '/app/e2e-fake.js': join(here, 'fixtures/e2e-fake.js') },
  });
});
test.afterAll(async () => {
  await server.close();
});

/** Ouvre une page avec sondes (CSP, requêtes hors origine) et API simulée. `unauthorizedOnce` : 1er appel en 401. */
async function open(page, { host, unauthorizedOnce = false, path = '/app/' } = {}) {
  const probe = { apiCalls: [], offOrigin: [], consoleErrors: [], pageErrors: [] };
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };
  let rejected = false;

  await page.route(`${API}/**`, (route) => {
    const request = route.request();
    probe.apiCalls.push({ method: request.method(), auth: request.headers().authorization });
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (unauthorizedOnce && !rejected && request.headers().authorization === 'Bearer t1') {
      rejected = true;
      return route.fulfill({ status: 401, contentType: 'application/json', headers: cors, body: '{}' });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: '{}' });
  });
  page.on('request', (request) => {
    const { origin } = new URL(request.url());
    if (origin !== server.origin && origin !== API && !request.url().startsWith('data:')) probe.offOrigin.push(request.url());
  });
  page.on('console', (message) => message.type() === 'error' && probe.consoleErrors.push(message.text()));
  page.on('pageerror', (error) => probe.pageErrors.push(String(error)));
  await page.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
  });
  if (host) await page.addInitScript(mockHostInitScript(host));
  await page.goto(server.origin + path);
  return probe;
}

const installed = (page) => page.evaluate(() => (window.installedModules || []).map(([name]) => name));

test.describe('cible android, Host OK', () => {
  test('(1)(2) démarre sans 404, sans requête hors origine (hors API) et sans violation de CSP', async ({ page }) => {
    const probe = await open(page, { host: SESSION_HOST });
    await expect.poll(() => installed(page)).not.toEqual([]);
    await page.waitForLoadState('networkidle');

    expect(server.requests.filter((r) => !r.startsWith('200'))).toEqual([]);
    expect(probe.offOrigin).toEqual([]);
    expect(await page.evaluate(() => window.__csp)).toEqual([]);
  });

  test('(3) filtre les apps par `platforms` : l’app iOS n’est pas enregistrée en android', async ({ page }) => {
    const warnings = [];
    page.on('console', (m) => m.type() === 'warning' && warnings.push(m.text()));
    await open(page, { host: SESSION_HOST, path: '/app/e2e' });

    await expect(page.locator('#e2e-fake-mounted')).toBeAttached();
    expect(warnings.some((w) => w.includes('@e2e/ios-only') && w.includes('pas enregistrée'))).toBe(true);
    await page.goto(server.origin + '/app/ios');
    await expect(page.locator('#e2e-fake-mounted')).toHaveCount(0);
  });

  test('(5) 401 ⇒ un seul refresh ⇒ rejeu avec le nouveau jeton', async ({ page }) => {
    const probe = await open(page, { host: SESSION_HOST, unauthorizedOnce: true });
    await expect.poll(() => page.evaluate(() => window.__refreshed)).toBe(1);
    await expect.poll(() => probe.apiCalls.some((c) => c.auth === 'Bearer t2')).toBe(true);
    expect(await page.evaluate(() => window.__refreshed)).toBe(1);
  });

  test('(6) les overrides d’import map du localStorage sont ignorés', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('egen:devtools', 'true');
      localStorage.setItem('import-map-override:@e2e/fake', '/app/pirate.js');
    });
    await open(page, { host: SESSION_HOST, path: '/app/e2e' });

    await expect(page.locator('#e2e-fake-mounted')).toBeAttached();
    expect(server.requests.some((r) => r.endsWith('/app/pirate.js'))).toBe(false);
  });
});

test.describe('cible android, Host incompatible', () => {
  test('(4) écran d’incompatibilité bloquant, aucune app enregistrée, aucun appel API', async ({ page }) => {
    const probe = await open(page, { host: { protocol: 99 } });

    await expect(page.locator('.egen-host-incompatible')).toBeVisible();
    await expect(page.locator('.egen-host-incompatible button')).toBeVisible();
    expect(await installed(page)).toEqual([]);
    expect(probe.apiCalls).toEqual([]);
    expect(await page.evaluate(() => window.__csp)).toEqual([]);
    // L'écran bloquant est la seule réaction : l'échec de session ne remonte pas en erreur globale non interceptée.
    expect(probe.pageErrors).toEqual([]);
  });

  test('(4b) Host absent : même écran', async ({ page }) => {
    await open(page, {});
    await expect(page.locator('.egen-host-incompatible')).toBeVisible();
    expect(await installed(page)).toEqual([]);
  });
});
