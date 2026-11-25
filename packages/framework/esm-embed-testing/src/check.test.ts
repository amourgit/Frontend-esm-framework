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
  it('capacités retirées du SDK : message explicite', async () => {
    for (const id of ['session', 'theme', 'permissions', 'api']) {
      const i = await checkEmbedApp({ manifest: manifest({ capabilities: { [id]: {} } }) });
      expect(msgs(i, 'error').join()).toMatch(/absente du SDK/);
    }
  });
  it('motifs d’événements et outils non préfixés', async () => {
    const i = await checkEmbedApp({ manifest: manifest({ capabilities: { events: { publish: ['*', 'core.x', 'app.studio.*'] }, 'ai-tools': { tools: ['apply'] } } }) });
    expect(msgs(i, 'error').join('|')).toMatch(/pas supporté/);
    expect(msgs(i, 'warn').join('|')).toMatch(/core\.x/);
    expect(msgs(i, 'warn').join('|')).toMatch(/préfixés/);
  });
  it('extensions : slots à approuver et vues intégrées en iframe', async () => {
    const i = await checkEmbedApp({ manifest: manifest({ extensions: [{ name: 'nav', slot: 'topbar-nav-slot' }, { name: 'chip', slot: 'shell-rail-left-slot', view: '/_egen/chip' }] }) });
    expect(msgs(i, 'info').join('|')).toMatch(/topbar-nav-slot, shell-rail-left-slot/);
    expect(msgs(i, 'info').join('|')).toMatch(/vue \/_egen\/chip/);
    expect(hasErrors(await checkEmbedApp({ manifest: manifest({ extensions: [{ name: 'N X', slot: 'a' }] }) }))).toBe(true);
    expect(msgs(await checkEmbedApp({ manifest: manifest({ capabilities: { extensions: { discover: ['*'] } } }) }), 'error').join()).toMatch(/« \* » n'est pas supporté/);
  });
});

describe('checkEmbedApp (intégrabilité en iframe)', () => {
  let server: ReturnType<typeof createServer> | undefined;
  afterEach(() => new Promise<void>((r) => (server ? server.close(() => r()) : r())));

  async function probe(headers: Record<string, string>, status = 200, shell = 'https://egen.exemple.org') {
    server = createServer((_q, s) => (s.writeHead(status, headers), s.end('x')));
    await new Promise<void>((r) => server!.listen(0, '127.0.0.1', r));
    const port = (server.address() as any).port;
    return checkEmbedApp({ manifest: manifest({ url: `http://127.0.0.1:${port}` }), allowInsecureLocalhost: true, probe: true, shellOrigin: shell });
  }

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
