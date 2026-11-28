import { createServer } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { checkEmbedApp, hasErrors } from './check.js';

const manifest = (over: Record<string, unknown> = {}) => ({
  manifestVersion: 1, name: '@civitas/esm-studio-app', version: '1.0.0', title: 'Studio', url: 'https://studio.exemple.org', route: 'studio', technology: 'nextjs',
  navigation: { mode: 'history' }, capabilities: { locale: {}, notifications: {}, events: { publish: ['app.studio.*'] } }, ...over,
});
const msgs = (i: Array<{ level: string; message: string }>, level?: string) => i.filter((x) => !level || x.level === level).map((x) => x.message);

describe('checkEmbedApp (manifeste)', () => {
  it('cas nominal : seulement des informations', async () => {
    const i = await checkEmbedApp({ manifest: manifest() });
    expect(hasErrors(i)).toBe(false);
    expect(msgs(i, 'info').join()).toMatch(/notifications, events/);
  });
  it('manifeste invalide : erreurs de validation', async () => {
    const i = await checkEmbedApp({ manifest: manifest({ route: 'A B' }) });
    expect(hasErrors(i)).toBe(true);
  });
  it('notifications : rappel du modèle sans doublon', async () => {
    expect(msgs(await checkEmbedApp({ manifest: manifest() }), 'info').join()).toMatch(/egen\.notify/);
  });
  it('capacités retirées du SDK : message explicite', async () => {
    for (const id of ['session', 'theme', 'permissions', 'api']) {
      const i = await checkEmbedApp({ manifest: manifest({ capabilities: { [id]: {} } }) });
      expect(msgs(i, 'error').join()).toMatch(/absente du SDK/);
    }
  });
  it('motifs d’événements', async () => {
    const i = await checkEmbedApp({ manifest: manifest({ capabilities: { events: { publish: ['*', 'core.x', 'app.studio.*'] } } }) });
    expect(msgs(i, 'error').join('|')).toMatch(/pas supporté/);
    expect(msgs(i, 'warn').join('|')).toMatch(/core\.x/);
  });
  it('extensions : slots à approuver et vues intégrées en iframe', async () => {
    const i = await checkEmbedApp({ manifest: manifest({ extensions: [{ name: 'nav', slot: 'topbar-nav-slot' }, { name: 'chip', slot: 'shell-rail-left-slot', view: '/_egen/chip' }] }) });
    expect(msgs(i, 'info').join('|')).toMatch(/topbar-nav-slot, shell-rail-left-slot/);
    expect(msgs(i, 'info').join('|')).toMatch(/vue \/_egen\/chip/);
    expect(hasErrors(await checkEmbedApp({ manifest: manifest({ extensions: [{ name: 'N X', slot: 'a' }] }) }))).toBe(true);
    expect(msgs(await checkEmbedApp({ manifest: manifest({ capabilities: { extensions: { discover: ['*'] } } }) }), 'error').join()).toMatch(/« \* » n'est pas supporté/);
  });
});

describe('checkEmbedApp (droits d’iframe négociés)', () => {
  const IFRAME = { sandbox: ['allow-downloads', 'allow-modals', 'allow-popups-to-escape-sandbox'], allow: ['clipboard-read', 'clipboard-write', 'fullscreen'] };
  it('droits demandés : rappel qu’ils doivent être approuvés (grants.iframe)', async () => {
    const i = await checkEmbedApp({ manifest: manifest({ iframe: IFRAME }) });
    expect(hasErrors(i)).toBe(false);
    expect(msgs(i, 'info').join('|')).toMatch(/grants\.iframe.*sandbox:allow-downloads.*allow:fullscreen/);
    expect(msgs(i, 'warn')).toEqual([]);
  });
  it('aucune demande : aucune remarque sur l’iframe', async () => {
    expect(msgs(await checkEmbedApp({ manifest: manifest() })).join('|')).not.toMatch(/iframe/i);
    expect(msgs(await checkEmbedApp({ manifest: manifest({ iframe: {} }) })).join('|')).not.toMatch(/Droits d'iframe/);
  });
  it('jeton hors liste blanche : erreur nommant le jeton', async () => {
    const i = await checkEmbedApp({ manifest: manifest({ iframe: { sandbox: ['allow-top-navigation'] } }) });
    expect(hasErrors(i)).toBe(true);
    expect(msgs(i, 'error').join()).toMatch(/allow-top-navigation.*hors liste blanche/);
  });
  it('permissions sensibles : réserve', async () => {
    const i = await checkEmbedApp({ manifest: manifest({ iframe: { allow: ['camera', 'fullscreen'] } }) });
    expect(hasErrors(i)).toBe(false);
    expect(msgs(i, 'warn').join()).toMatch(/camera/);
    expect(msgs(i, 'warn').join()).not.toMatch(/fullscreen/);
  });
});

describe('checkEmbedApp (intégrabilité en iframe)', () => {
  let server: ReturnType<typeof createServer> | undefined;
  afterEach(() => new Promise<void>((r) => (server ? server.close(() => r()) : r())));

  type Served = { status?: number; headers?: Record<string, string>; body?: string };

  /** Sonde une app locale : la page d'accueil répond avec `headers`/`status` ; `/egen-config.json` avec `declaration` (défaut : la déclaration contrôlée, sans cache). */
  async function probe(headers: Record<string, string>, status = 200, shell = 'https://egen.exemple.org', declaration?: Served) {
    let port = 0;
    server = createServer((q, s) => {
      if (q.url === '/egen-config.json') {
        const d = declaration ?? { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }, body: JSON.stringify(manifest({ url: `http://127.0.0.1:${port}` })) };
        s.writeHead(d.status ?? 200, d.headers ?? {});
        return s.end(d.body ?? '');
      }
      s.writeHead(status, headers);
      s.end('x');
    });
    await new Promise<void>((r) => server!.listen(0, '127.0.0.1', r));
    port = (server.address() as any).port;
    return checkEmbedApp({ manifest: manifest({ url: `http://127.0.0.1:${port}` }), allowInsecureLocalhost: true, probe: true, shellOrigin: shell });
  }

  describe('déclaration publiée à la racine (voie normale)', () => {
    const OK = { 'content-type': 'application/json', 'cache-control': 'no-store' };
    const frame = { 'content-security-policy': 'frame-ancestors https://egen.exemple.org' };
    it('publiée, valide, identique, sans cache : aucune remarque', async () => {
      const i = await probe(frame);
      expect(msgs(i, 'error')).toEqual([]);
      expect(msgs(i).join('|')).not.toMatch(/egen-config\.json/);
    });
    it('absente (404) : information sur le second recours, pas une erreur', async () => {
      const i = await probe(frame, 200, undefined, { status: 404, body: 'nope' });
      expect(msgs(i, 'error')).toEqual([]);
      expect(msgs(i, 'info').join()).toMatch(/second recours/);
    });
    it('redirigée ou en erreur serveur : réserve', async () => {
      expect(msgs(await probe(frame, 200, undefined, { status: 302, headers: { location: '/x' } }), 'warn').join()).toMatch(/egen-config\.json répond HTTP 302/);
      expect(msgs(await probe(frame, 200, undefined, { status: 503, body: '{}' }), 'warn').join()).toMatch(/HTTP 503/);
    });
    it('JSON invalide ou déclaration invalide : erreur', async () => {
      expect(msgs(await probe(frame, 200, undefined, { headers: OK, body: '<html>' }), 'error').join()).toMatch(/JSON invalide/);
      expect(msgs(await probe(frame, 200, undefined, { headers: OK, body: JSON.stringify({ manifestVersion: 1 }) }), 'error').join()).toMatch(/publié invalide/);
    });
    it('déclaration publiée différente de celle contrôlée : réserve nommant les champs', async () => {
      const i = await probe(frame, 200, undefined, { headers: OK, body: JSON.stringify(manifest({ version: '9.9.9', title: 'Autre' })) });
      const w = msgs(i, 'warn').join();
      expect(w).toMatch(/diffère/);
      expect(w).toMatch(/version/);
    });
    it('sans Cache-Control no-store : rappel (le Core fige le SHA-256)', async () => {
      const i = await probe(frame, 200, undefined, { headers: { 'content-type': 'application/json' }, body: JSON.stringify(manifest({ url: 'http://127.0.0.1:1' })) });
      expect(msgs(i, 'info').join()).toMatch(/Cache-Control/);
    });
  });

  it('X-Frame-Options DENY refuse l’intégration', async () => expect(msgs(await probe({ 'x-frame-options': 'DENY' }), 'error').join()).toMatch(/X-Frame-Options/));
  it('frame-ancestors sans le Shell : erreur', async () => expect(msgs(await probe({ 'content-security-policy': "frame-ancestors 'self'" }), 'error').join()).toMatch(/n'autorise pas le Shell/));
  it('frame-ancestors avec le Shell : conforme', async () => {
    const i = await probe({ 'content-security-policy': 'frame-ancestors https://egen.exemple.org' });
    expect(msgs(i, 'error')).toEqual([]);
    expect(msgs(i, 'warn').join()).not.toMatch(/frame-ancestors/);
  });
  it('frame-ancestors * : réserve ; aucun en-tête : réserve ; none : erreur', async () => {
    expect(msgs(await probe({ 'content-security-policy': 'frame-ancestors *' }), 'warn').join()).toMatch(/clickjacking/);
    expect(msgs(await probe({}), 'warn').join()).toMatch(/Aucune restriction/);
    expect(msgs(await probe({ 'content-security-policy': "frame-ancestors 'none'" }), 'error').join()).toMatch(/impossible|n'autorise pas/);
  });
  it('erreur HTTP et redirection signalées', async () => {
    expect(msgs(await probe({}, 503), 'warn').join()).toMatch(/HTTP 503/);
    expect(msgs(await probe({ location: 'https://x.org' }, 302), 'info').join()).toMatch(/redirige/);
  });
  it('URL injoignable : réserve', async () => {
    const i = await checkEmbedApp({ manifest: manifest({ url: 'http://127.0.0.1:1' }), allowInsecureLocalhost: true, probe: true });
    expect(msgs(i, 'warn').join()).toMatch(/injoignable/);
  });
});
