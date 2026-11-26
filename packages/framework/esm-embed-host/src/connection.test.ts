import { afterEach, describe, expect, it, vi } from 'vitest';
import { harness, tick } from './__tests__/harness.js';
import { type ExtensionInfo, type HostProviders } from './index.js';

const closers: Array<() => void> = [];
afterEach(() => {
  while (closers.length) closers.pop()!();
});
async function h(opts: Parameters<typeof harness>[0] = {}) {
  const r = await harness(opts);
  closers.push(r.close);
  return r;
}

const watch = <T>(v: T) => {
  const subs = new Set<(x: T) => void>();
  return { get: () => v, subscribe: (cb: (x: T) => void) => (subs.add(cb), () => subs.delete(cb)), push: (x: T) => subs.forEach((s) => s(x)) };
};

describe('poignée de main bout en bout (vrai client ↔ vraie connexion hôte)', () => {
  it('l’app (sonde) déclenche hello, connect, port ; capacités par défaut servies accordées', async () => {
    const { client, conn } = await h({ providers: { locale: watch('fr') as any, tenant: watch({ id: 't1' }) as any } });
    expect(client.connected).toBe(true);
    expect(conn.connected).toBe(true);
    expect(client.has('locale')).toBe(true);
    expect(client.protocol).toBe(2);
    await expect(client.locale.get()).resolves.toBe('fr');
    await expect(client.tenant.get()).resolves.toEqual({ id: 't1' });
  });

  it('langue et tenant : changements poussés', async () => {
    const locale = watch('fr');
    const { client } = await h({ providers: { locale: locale as any } });
    const got: string[] = [];
    await client.locale.onChange((l) => got.push(l));
    locale.push('en');
    await tick();
    expect(got).toEqual(['en']);
  });

  it('capacités retirées du SDK (session, thème, droits, api) : refusées, inconnues', async () => {
    const { client } = await h({ providers: { locale: watch('fr') as any }, requested: ['locale', 'session' as any, 'theme' as any, 'permissions' as any, 'api' as any] });
    expect(client.has('locale')).toBe(true);
    expect(client.denied).toEqual([
      { id: 'session', reason: 'UNKNOWN' },
      { id: 'theme', reason: 'UNKNOWN' },
      { id: 'permissions', reason: 'UNKNOWN' },
      { id: 'api', reason: 'UNKNOWN' },
    ]);
  });

  it('refus par défaut : events, notifications non accordées sans approbation', async () => {
    const { client } = await h({ providers: { locale: watch('fr') as any, events: { publish: vi.fn(), subscribe: vi.fn() }, notifications: { show: vi.fn() } } as any, requested: ['locale', 'events', 'notifications'] });
    expect(client.has('events')).toBe(false);
    expect(client.denied.map((d) => [d.id, d.reason])).toEqual([['events', 'NOT_APPROVED'], ['notifications', 'NOT_APPROVED']]);
  });

  it('capacité accordée mais sans fournisseur : UNAVAILABLE', async () => {
    const { client } = await h({ approved: { notifications: {} }, requested: ['locale', 'notifications'], providers: { locale: watch('fr') as any } });
    expect(client.has('notifications')).toBe(false);
    expect(client.denied).toEqual([{ id: 'notifications', reason: 'UNAVAILABLE' }]);
  });
});

describe('application des grants', () => {
  it('événements : publication limitée à app.<slug>.*, abonnement limité', async () => {
    const publish = vi.fn();
    const subscribed: string[] = [];
    const providers: HostProviders = { events: { publish, subscribe: (t) => (subscribed.push(t), () => undefined) } };
    const { client } = await h({ providers, requested: ['events'], approved: { events: { publish: ['app.demo.*'], subscribe: ['core.theme.*'] } } });
    await client.events.publish('app.demo.saved', { id: 1 });
    expect(publish).toHaveBeenCalledWith('app.demo.saved', { id: 1 }, { moduleName: '@acme/esm-demo-app' });
    await expect(client.events.publish('core.theme.changed', {})).rejects.toMatchObject({ code: 'DENIED' });
    await expect(client.events.publish('app.autre.x', {})).rejects.toMatchObject({ code: 'DENIED' });
    await client.events.subscribe('core.theme.changed', () => undefined);
    expect(subscribed).toEqual(['core.theme.changed']);
    await expect(client.events.subscribe('core.secret', () => undefined)).rejects.toMatchObject({ code: 'DENIED' });
  });

  it('drapeaux : seulement ceux que le grant nomme', async () => {
    const providers: HostProviders = { flags: { isEnabled: (n) => n === 'beta' } };
    const { client } = await h({ providers, requested: ['flags'], approved: { flags: { names: ['beta'] } } });
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

  it('extensions : découverte limitée aux slots du grant, changements poussés', async () => {
    const list: ExtensionInfo[] = [{ name: 'nav-annuaire', moduleName: '@egen/esm-annuaire-app', order: 1, meta: { label: 'Annuaire' } }];
    const subs = new Map<string, (l: ExtensionInfo[]) => void>();
    const providers: HostProviders = { extensions: { list: (slot) => (slot === 'topbar-nav-slot' ? list : []), subscribe: (slot, cb) => (subs.set(slot, cb), () => subs.delete(slot)) } };
    const { client } = await h({ providers, requested: ['extensions'], approved: { extensions: { discover: ['topbar-nav-slot', 'annuaire-*'] } } });
    await expect(client.extensions.list('topbar-nav-slot')).resolves.toEqual(list);
    await expect(client.extensions.list('annuaire-detail-slot')).resolves.toEqual([]);
    await expect(client.extensions.list('shell-rail-left-slot')).rejects.toMatchObject({ code: 'DENIED', message: expect.stringMatching(/Slot non découvrable/) });
    const got: unknown[] = [];
    await client.extensions.onChange('topbar-nav-slot', (l) => got.push(l));
    subs.get('topbar-nav-slot')!([]);
    await tick();
    expect(got).toEqual([[]]);
    await expect(client.extensions.onChange('shell-rail-left-slot', () => undefined)).rejects.toMatchObject({ code: 'DENIED' });
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
    const { client, conn } = await h({ providers, requested: ['locale', 'notifications'] });
    expect(client.has('notifications')).toBe(false);
    await expect(conn.callApp('lifecycle', 'canLeave')).resolves.toBe(true);
  });
});

describe('cycle de connexion', () => {
  it('hello ferme la connexion précédente (rechargement de l’iframe)', async () => {
    const { conn, client } = await h({ providers: { locale: watch('fr') as any } });
    expect(conn.connected).toBe(true);
    conn.hello();
    expect(conn.connected).toBe(false);
    await tick();
    await expect(client.locale.get()).rejects.toBeTruthy();
  });

  it('un second connect est ignoré ; un message v1 n’est pas consommé', async () => {
    const { conn, sentByApp } = await h();
    const before = conn.state;
    conn.handle({ egen: 2, moduleName: '@acme/esm-demo-app', message: { kind: 'connect', nonce: 'x'.repeat(16), protocol: 2, requested: [] } });
    expect(conn.state).toBe(before);
    expect(conn.handle({ egen: 1, moduleName: '@acme/esm-demo-app', message: { kind: 'ready' } })).toBe(false);
    expect(sentByApp.length).toBeGreaterThan(0);
  });
});

describe('toasts partagés (le Core est l’afficheur)', () => {
  it('temps réel : l’app envoie, le Core affiche (attribué au module), la réponse indique si affiché', async () => {
    const shown: Array<{ n: any; from: string }> = [];
    const providers: HostProviders = { notifications: { show: (n, ctx) => void shown.push({ n, from: ctx.moduleName }) } };
    const { client } = await h({ providers, requested: ['notifications'], approved: { notifications: {} } });
    await expect(client.notifications.show({ kind: 'success', title: 'Enregistré', id: 'theme.saved' })).resolves.toEqual({ displayed: true });
    expect(shown).toEqual([{ n: { kind: 'success', title: 'Enregistré', id: 'theme.saved' }, from: '@acme/esm-demo-app' }]);
  });

  it('un doublon écarté par le Core (provider → false) est signalé : displayed false', async () => {
    const providers: HostProviders = { notifications: { show: () => false } };
    const { client } = await h({ providers, requested: ['notifications'], approved: { notifications: {} } });
    await expect(client.notifications.show({ kind: 'info', title: 'x', id: 'dup' })).resolves.toEqual({ displayed: false });
  });

  it('anti-spam : au-delà de la fenêtre (rate) → RATE_LIMITED, le Core n’affiche pas', async () => {
    const show = vi.fn();
    const { client } = await h({ providers: { notifications: { show } }, requested: ['notifications'], approved: { notifications: { rate: { max: 2, perSeconds: 60 } } } });
    await client.notifications.show({ kind: 'info', title: '1' });
    await client.notifications.show({ kind: 'info', title: '2' });
    await expect(client.notifications.show({ kind: 'info', title: '3' })).rejects.toMatchObject({ code: 'RATE_LIMITED' });
    expect(show).toHaveBeenCalledTimes(2);
  });

  it('politique transmise à l’app : exclusive par défaut ; exclusive:false si l’opérateur le décide', async () => {
    const providers: HostProviders = { notifications: { show: vi.fn() } };
    const a = await h({ providers, requested: ['notifications'], approved: { notifications: {} } });
    expect(a.client.coreDisplaysNotifications).toBe(true);
    const b = await h({ providers, requested: ['notifications'], approved: { notifications: { exclusive: false } } });
    expect(b.client.coreDisplaysNotifications).toBe(false);
    const c = await h({ providers, requested: ['notifications'] });
    expect(c.client.coreDisplaysNotifications).toBe(false); // non accordée : l'app affiche elle-même
  });

  it('egen.notify : le Core affiche, l’affichage local n’est PAS appelé (pas de doublon)', async () => {
    const show = vi.fn();
    const local = vi.fn();
    const { client } = await h({ providers: { notifications: { show } }, requested: ['notifications'], approved: { notifications: {} } });
    await client.notify({ kind: 'success', title: 'OK' }, local);
    expect(show).toHaveBeenCalledTimes(1);
    expect(local).not.toHaveBeenCalled();
  });

  it('egen.notify : capacité non accordée → affichage local ; exclusive:false → Core ET local ; rate → abandonné', async () => {
    const show = vi.fn();
    const local = vi.fn();
    const none = await h({ providers: { notifications: { show } }, requested: ['notifications'] });
    await none.client.notify({ kind: 'info', title: 'a' }, local);
    expect(local).toHaveBeenCalledTimes(1);
    expect(show).not.toHaveBeenCalled();

    local.mockClear();
    const both = await h({ providers: { notifications: { show } }, requested: ['notifications'], approved: { notifications: { exclusive: false } } });
    await both.client.notify({ kind: 'info', title: 'b' }, local);
    expect(show).toHaveBeenCalledTimes(1);
    expect(local).toHaveBeenCalledTimes(1);

    show.mockClear();
    local.mockClear();
    const limited = await h({ providers: { notifications: { show } }, requested: ['notifications'], approved: { notifications: { rate: { max: 1, perSeconds: 60 } } } });
    await limited.client.notify({ kind: 'info', title: '1' }, local);
    await limited.client.notify({ kind: 'info', title: '2' }, local);
    expect(show).toHaveBeenCalledTimes(1);
    expect(local).not.toHaveBeenCalled();
  });
});
