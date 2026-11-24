import { afterEach, describe, expect, it, vi } from 'vitest';
import { harness, tick } from './__tests__/harness.js';
import { createFetchApiProvider, type HostProviders } from './index.js';

const closers: Array<() => void> = [];
afterEach(() => {
  while (closers.length) closers.pop()!();
});
async function h(opts: Parameters<typeof harness>[0] = {}) {
  const r = await harness(opts);
  closers.push(r.close);
  return r;
}

const session = { authenticated: true, sessionId: 'SECRET', user: { uuid: 'u1', display: 'Sam', email: 'x@y.z' } };
const watch = <T>(v: T) => {
  const subs = new Set<(x: T) => void>();
  return { get: () => v, subscribe: (cb: (x: T) => void) => (subs.add(cb), () => subs.delete(cb)), push: (x: T) => subs.forEach((s) => s(x)) };
};

describe('poignée de main bout en bout (vrai client ↔ vraie connexion hôte)', () => {
  it('l’app (sonde) déclenche hello, connect, port ; capacités par défaut accordées', async () => {
    const { client, conn } = await h({ providers: { session: watch(session) as any } });
    expect(client.connected).toBe(true);
    expect(conn.connected).toBe(true);
    expect(client.has('session')).toBe(true);
    expect(client.protocol).toBe(2);
  });

  it('session filtrée : jamais de sessionId ni de champ hors liste', async () => {
    const { client } = await h({ providers: { session: watch(session) as any } });
    const s = await client.session.get();
    expect(s).toEqual({ authenticated: true, user: { uuid: 'u1', display: 'Sam' } });
    expect(JSON.stringify(s)).not.toMatch(/SECRET|x@y\.z/);
  });

  it('session : changement poussé, filtré', async () => {
    const w = watch<any>(session);
    const { client } = await h({ providers: { session: w as any } });
    const got: any[] = [];
    await client.session.onChange((v) => got.push(v));
    w.push({ ...session, user: { ...session.user, display: 'Sam2' }, sessionId: 'AUTRE' });
    await tick();
    expect(got.at(-1)).toEqual({ authenticated: true, user: { uuid: 'u1', display: 'Sam2' } });
  });

  it('refus par défaut : api, events, notifications non accordées sans approbation', async () => {
    const { client } = await h({ providers: { session: watch(session) as any, api: { fetch: vi.fn() }, events: { publish: vi.fn(), subscribe: vi.fn() }, notifications: { show: vi.fn() } } as any, requested: ['session', 'api', 'events', 'notifications'] });
    expect(client.has('api')).toBe(false);
    expect(client.denied.map((d) => [d.id, d.reason])).toEqual([['api', 'NOT_APPROVED'], ['events', 'NOT_APPROVED'], ['notifications', 'NOT_APPROVED']]);
  });

  it('capacité accordée mais sans fournisseur : UNAVAILABLE', async () => {
    const { client } = await h({ approved: { notifications: {} }, requested: ['session', 'notifications'], providers: { session: watch(session) as any } });
    expect(client.has('notifications')).toBe(false);
    expect(client.denied).toEqual([{ id: 'notifications', reason: 'UNAVAILABLE' }]);
  });
});

describe('application des grants', () => {
  it('événements : publication limitée à app.<slug>.*, abonnement limité', async () => {
    const publish = vi.fn();
    const subscribed: string[] = [];
    const providers: HostProviders = { events: { publish, subscribe: (t) => (subscribed.push(t), () => undefined) } };
    const { client } = await h({
      providers,
      requested: ['events'],
      approved: { events: { publish: ['app.demo.*'], subscribe: ['core.theme.*'] } },
    });
    await client.events.publish('app.demo.saved', { id: 1 });
    expect(publish).toHaveBeenCalledWith('app.demo.saved', { id: 1 }, { moduleName: '@acme/esm-demo-app' });
    await expect(client.events.publish('core.theme.changed', {})).rejects.toMatchObject({ code: 'DENIED' });
    await expect(client.events.publish('app.autre.x', {})).rejects.toMatchObject({ code: 'DENIED' });
    await client.events.subscribe('core.theme.changed', () => undefined);
    expect(subscribed).toEqual(['core.theme.changed']);
    await expect(client.events.subscribe('core.secret', () => undefined)).rejects.toMatchObject({ code: 'DENIED' });
  });

  it('API : hôtes et en-têtes autorisés seulement, le jeton reste dans le Core', async () => {
    const fetchImpl = vi.fn(async (_u: string, init: any) => new Response('{"ok":1}', { status: 200, headers: { 'content-type': 'application/json', 'set-cookie': 'a=b', 'x-secret': 's' } }));
    const api = createFetchApiProvider({ baseUrl: 'https://api.exemple.org/v1/', getHeaders: () => ({ Authorization: 'Bearer SECRET' }), fetchImpl: fetchImpl as any });
    const { client } = await h({ providers: { api }, requested: ['api'], approved: { api: { hosts: ['https://ext.exemple.org'], paths: ['/users', '/x'] } } });
    const r = await client.api.fetch({ path: '/users', headers: { accept: 'application/json' } });
    expect(r).toEqual({ status: 200, headers: { 'content-type': 'application/json' }, body: '{"ok":1}' });
    expect(fetchImpl.mock.calls[0][0]).toBe('https://api.exemple.org/v1/users');
    expect(fetchImpl.mock.calls[0][1]).toMatchObject({ credentials: 'include', headers: { Authorization: 'Bearer SECRET' } });
    await client.api.fetch({ url: 'https://ext.exemple.org/x' });
    expect(fetchImpl.mock.calls[1][1]).toMatchObject({ credentials: 'omit', redirect: 'error' });
    expect(JSON.stringify(fetchImpl.mock.calls[1][1].headers)).not.toMatch(/SECRET/);
    await expect(client.api.fetch({ url: 'https://evil.exemple.org/x' })).rejects.toMatchObject({ code: 'DENIED' });
    await expect(client.api.fetch({ path: '/x', headers: { authorization: 'x' } })).rejects.toMatchObject({ code: 'DENIED' });
    await expect(client.api.fetch({ path: '/admin/users' })).rejects.toMatchObject({ code: 'DENIED', message: expect.stringMatching(/Chemin d'API non autorisé/) });
    await expect(client.api.fetch({ path: '/users/../admin' })).rejects.toMatchObject({ code: 'DENIED' });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('API : réponse trop volumineuse refusée', async () => {
    const fetchImpl = vi.fn(async () => new Response('x'.repeat(500)));
    const api = createFetchApiProvider({ baseUrl: 'https://api.exemple.org', fetchImpl: fetchImpl as any, maxResponseBytes: 100 });
    const { client } = await h({ providers: { api }, requested: ['api'], approved: { api: { paths: ['/gros'] } } });
    await expect(client.api.fetch({ path: '/gros' })).rejects.toMatchObject({ code: 'TOO_LARGE' });
  });

  it('permissions et drapeaux : seulement ce qui est sondable', async () => {
    const providers: HostProviders = { permissions: { can: (p) => p === 'admin' }, flags: { isEnabled: (n) => n === 'beta' } };
    const { client } = await h({ providers, requested: ['permissions', 'flags'], approved: { permissions: { probe: ['admin'] }, flags: { names: ['beta'] } } });
    await expect(client.permissions.can('admin')).resolves.toBe(true);
    await expect(client.permissions.can('root')).rejects.toMatchObject({ code: 'DENIED' });
    await expect(client.flags.isEnabled('beta')).resolves.toBe(true);
    await expect(client.flags.isEnabled('autre')).rejects.toMatchObject({ code: 'DENIED' });
  });

  it('outils IA : namespace imposé, invocation hôte → app, nettoyage à la fermeture', async () => {
    const reg: any[] = [];
    const unreg = vi.fn();
    const providers: HostProviders = { aiTools: { register: (m, tools, invoke) => reg.push({ m, tools, invoke }), unregister: unreg } };
    const { client, conn } = await h({ providers, requested: ['ai-tools'], approved: { 'ai-tools': { tools: ['demo.*'] } } });
    await client.aiTools.register([{ name: 'demo.apply', description: 'x', handler: (a) => ({ got: a }) }]);
    expect(reg[0].m).toBe('@acme/esm-demo-app');
    await expect(reg[0].invoke('demo.apply', { n: 1 })).resolves.toEqual({ got: { n: 1 } });
    await expect(client.aiTools.register([{ name: 'core.admin', description: 'x', handler: () => 1 }])).rejects.toMatchObject({ code: 'DENIED' });
    conn.reset();
    expect(unreg).toHaveBeenCalledWith('@acme/esm-demo-app', ['demo.apply']);
  });

  it('thème : lecture et changements', async () => {
    const w = watch({ mode: 'dark', tokens: { '--primary': '#111' } });
    const { client } = await h({ providers: { theme: w as any } });
    await expect(client.theme.get()).resolves.toEqual({ mode: 'dark', tokens: { '--primary': '#111' } });
    const got: any[] = [];
    await client.theme.onChange((t) => got.push(t));
    w.push({ mode: 'light', tokens: { '--primary': '#fff' } });
    await tick();
    expect(got).toEqual([{ mode: 'light', tokens: { '--primary': '#fff' } }]);
  });

  it('navigation et cycle de vie : contrôles du Shell appelés, goto poussé', async () => {
    const report = vi.fn();
    const resize = vi.fn();
    const onReady = vi.fn();
    const { client, channel } = await h({ controls: { report, resize, onReady } });
    await client.navigation.report('/a?b=1', { replace: true, title: 'A' });
    await client.navigation.resize(640);
    await client.lifecycle.ready();
    expect(report).toHaveBeenCalledWith('/a?b=1', { replace: true, title: 'A' });
    expect(resize).toHaveBeenCalledWith(640);
    expect(onReady).toHaveBeenCalled();
    const gotos: any[] = [];
    await client.navigation.onGoto((m) => gotos.push(m));
    channel.emit('goto', { path: '/x', seq: 1 });
    await tick();
    expect(gotos).toEqual([{ path: '/x', seq: 1 }]);
    await expect(client.navigation.navigate('//evil.com')).rejects.toMatchObject({ code: 'INVALID_ARGS' });
  });

  it('une capacité non accordée n’existe pas côté hôte (dispatch fermé)', async () => {
    const providers: HostProviders = { notifications: { show: vi.fn() } };
    const { client, conn } = await h({ providers, requested: ['session', 'notifications'] });
    expect(client.has('notifications')).toBe(false);
    await expect(conn.callApp('lifecycle', 'canLeave')).resolves.toBe(true);
  });
});

describe('cycle de connexion', () => {
  it('hello ferme la connexion précédente (rechargement de l’iframe)', async () => {
    const { conn, client } = await h({ providers: { session: watch(session) as any } });
    expect(conn.connected).toBe(true);
    conn.hello();
    expect(conn.connected).toBe(false);
    await tick();
    await expect(client.session.get()).rejects.toBeTruthy();
  });

  it('un second connect est ignoré ; une origine/protocole inconnu ne connecte pas', async () => {
    const { conn, sentByApp } = await h();
    const before = conn.state;
    conn.handle({ egen: 2, moduleName: '@acme/esm-demo-app', message: { kind: 'connect', nonce: 'x'.repeat(16), protocol: 2, requested: [] } });
    expect(conn.state).toBe(before);
    expect(conn.handle({ egen: 1, moduleName: '@acme/esm-demo-app', message: { kind: 'ready' } })).toBe(false);
    expect(sentByApp.length).toBeGreaterThan(0);
  });
});
