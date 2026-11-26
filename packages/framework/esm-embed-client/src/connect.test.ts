import { afterEach, describe, expect, it, vi } from 'vitest';
import { connectToEgen, type EgenClient } from './index.js';
import { FakeShell, grant } from './__tests__/fake-shell.js';

const clients: EgenClient[] = [];
afterEach(() => {
  while (clients.length) clients.pop()!.close();
});
const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));

function setup(extra: Partial<Parameters<typeof connectToEgen>[0]> = {}) {
  const shell = new FakeShell();
  const p = connectToEgen({ moduleName: shell.moduleName, hostOrigins: [shell.origin], window: shell.appWindow as any, host: shell.hostWindow as any, timeoutMs: 150, ...extra }).then((c) => (clients.push(c), c));
  return { shell, p };
}

describe('validation des options', () => {
  it('hostOrigins obligatoire et explicite', () => {
    const base = { moduleName: 'x', window: new EventTarget() as any, host: { postMessage() {} } };
    expect(() => connectToEgen({ ...base, hostOrigins: [] })).toThrow(/obligatoire/);
    expect(() => connectToEgen({ ...base, hostOrigins: ['*'] })).toThrow(/invalide/);
    expect(() => connectToEgen({ ...base, hostOrigins: ['https://a.org/chemin'] })).toThrow(/invalide/);
    expect(() => connectToEgen({ ...base, hostOrigins: ['null'] })).toThrow(/invalide/);
  });
});

describe('poignée de main', () => {
  it('sonde, hello, connect (nonce, origine cible explicite), port : client connecté', async () => {
    const { shell, p } = setup({ capabilities: ['tenant', 'locale', 'events'] });
    expect(shell.hostWindow.posted[0]).toMatchObject({ message: { egen: 2, moduleName: shell.moduleName, message: { kind: 'probe' } }, targetOrigin: shell.origin });
    shell.hello();
    expect(shell.connectMsg).toMatchObject({ kind: 'connect', nonce: 'nonce-0123456789', protocol: 2, requested: [{ id: 'tenant', version: 1 }, { id: 'locale', version: 1 }, { id: 'events', version: 1 }] });
    expect(shell.hostWindow.posted.at(-1)!.targetOrigin).toBe(shell.origin);
    shell.accept([grant('tenant'), grant('locale')], { tenant: { get: () => ({ id: 't1' }) } });
    const c = await p;
    expect(c.connected).toBe(true);
    expect(c.has('tenant')).toBe(true);
    expect(c.has('events')).toBe(false);
    await expect(c.tenant.get()).resolves.toEqual({ id: 't1' });
  });

  it('ignore une origine ou une source inattendue, puis repli autonome', async () => {
    const { shell, p } = setup();
    shell.hello('nonce-0123456789', { origin: 'https://evil.exemple.org' });
    shell.hello('nonce-0123456789', { source: {} });
    expect(shell.connectMsg).toBeUndefined();
    const c = await p;
    expect(c.connected).toBe(false);
    await expect(c.tenant.get()).rejects.toMatchObject({ code: 'DENIED' });
  });

  it('ignore un port avec un mauvais nonce ou sans port', async () => {
    const { shell, p } = setup();
    shell.hello();
    shell.accept([grant('tenant')], { tenant: { get: () => 1 } }, 'autre-nonce-0123456');
    shell.deliver({ egen: 2, moduleName: shell.moduleName, message: { kind: 'port', nonce: 'nonce-0123456789', protocol: 2, granted: [], denied: [] } });
    expect((await p).connected).toBe(false);
  });

  it('ignore un module différent et un second hello', async () => {
    const { shell, p } = setup();
    shell.deliver({ egen: 2, moduleName: '@autre/app', message: { kind: 'hello', nonce: 'nonce-0123456789', protocols: [2] } });
    expect(shell.connectMsg).toBeUndefined();
    shell.hello('nonce-aaaaaaaaaa');
    shell.hello('nonce-bbbbbbbbbb');
    expect(shell.hostWindow.posted.filter((m) => m.message.message.kind === 'connect')).toHaveLength(1);
    expect(shell.connectMsg.nonce).toBe('nonce-aaaaaaaaaa');
    shell.accept([grant('tenant')], { tenant: { get: () => 1 } }, 'nonce-aaaaaaaaaa');
    expect((await p).connected).toBe(true);
  });

  it('hôte qui ne parle pas le protocole 2 : repli autonome', async () => {
    const { shell, p } = setup();
    shell.deliver({ egen: 2, moduleName: shell.moduleName, message: { kind: 'hello', nonce: 'nonce-0123456789', protocols: [1] } });
    expect((await p).connected).toBe(false);
  });

  it('sans fenêtre parente : autonome immédiat', async () => {
    const c = await connectToEgen({ moduleName: 'x', hostOrigins: ['https://a.org'], window: undefined, host: undefined });
    expect(c.connected).toBe(false);
  });
});

describe('capacités', () => {
  async function connected(granted = [grant('tenant'), grant('locale'), grant('lifecycle'), grant('events'), grant('extensions')], handlers: any = {}, subscribe?: any) {
    const { shell, p } = setup();
    shell.hello();
    shell.accept(granted, handlers, 'nonce-0123456789', { subscribe });
    return { shell, c: await p };
  }

  it('capacité non accordée : rejet local sans aller-retour', async () => {
    let called = false;
    const { c } = await connected([grant('tenant')], { notifications: { show: () => (called = true) } });
    await expect(c.dialogs.confirm({ title: 't', message: 'm' })).rejects.toMatchObject({ code: 'DENIED', message: expect.stringMatching(/dialogs/) });
    await expect(c.notifications.show({ kind: 'info', title: 'a' })).rejects.toMatchObject({ code: 'DENIED' });
    expect(called).toBe(false);
  });

  it('extensions : découverte d’un slot et changements poussés', async () => {
    let emit: any;
    const list = [{ name: 'nav-annuaire', moduleName: '@egen/esm-annuaire-app', order: 1, meta: { label: 'Annuaire' } }];
    const { c } = await connected(undefined, { extensions: { list: (slot: string) => (slot === 'topbar-nav-slot' ? list : []) } }, (cap: string, ev: string, e: any) => (cap === 'extensions' ? ((emit = e), () => undefined) : undefined));
    await expect(c.extensions.list('topbar-nav-slot')).resolves.toEqual(list);
    const got: unknown[] = [];
    await c.extensions.onChange('topbar-nav-slot', (l) => got.push(l));
    emit([]);
    await tick();
    expect(got).toEqual([[]]);
  });

  it('événements : abonnement filtré par l’hôte', async () => {
    const got: unknown[] = [];
    const { c } = await connected(undefined, {}, (cap: string, ev: string, emit: any) => (cap === 'events' && ev === 'core.theme.changed' ? (emit('x'), () => undefined) : undefined));
    await c.events.subscribe('core.theme.changed', (p) => got.push(p));
    await tick();
    expect(got).toEqual(['x']);
    await expect(c.events.subscribe('core.secret', () => undefined)).rejects.toMatchObject({ code: 'DENIED' });
  });

  it('cycle de vie : canLeave', async () => {
    const { c, shell } = await connected();
    await expect(shell.rpc!.call('lifecycle', 'canLeave')).resolves.toBe(true);
    c.lifecycle.setBeforeLeave(async () => false);
    await expect(shell.rpc!.call('lifecycle', 'canLeave')).resolves.toBe(false);
  });

  it('fermeture : client fermé, appels rejetés', async () => {
    const { c } = await connected(undefined, { tenant: { get: () => 1 } });
    c.close();
    expect(c.closed).toBe(true);
    await expect(c.tenant.get()).rejects.toMatchObject({ code: 'DENIED' });
  });
});

describe('notify : un seul afficheur, jamais de doublon', () => {
  async function connectedWith(granted: any[], handlers: any) {
    const { shell, p } = setup();
    shell.hello();
    shell.accept(granted, handlers, 'nonce-0123456789');
    return { shell, c: await p };
  }

  it('Core affiche seul (défaut) : envoyé au Core, affichage local non appelé', async () => {
    const show = vi.fn(async () => ({ displayed: true }));
    const { c } = await connectedWith([grant('tenant'), grant('notifications')], { notifications: { show } });
    const local = vi.fn();
    expect(c.coreDisplaysNotifications).toBe(true);
    await c.notify({ kind: 'success', title: 'OK' }, local);
    expect(show).toHaveBeenCalledTimes(1);
    expect(local).not.toHaveBeenCalled();
  });

  it('exclusive:false : Core ET local', async () => {
    const show = vi.fn(async () => ({ displayed: true }));
    const { c } = await connectedWith([grant('notifications', { exclusive: false })], { notifications: { show } });
    const local = vi.fn();
    expect(c.coreDisplaysNotifications).toBe(false);
    await c.notify({ kind: 'info', title: 'x' }, local);
    expect(show).toHaveBeenCalledTimes(1);
    expect(local).toHaveBeenCalledTimes(1);
  });

  it('capacité non accordée ou client autonome : affichage local', async () => {
    const { c } = await connectedWith([grant('tenant')], { tenant: { get: () => 1 } });
    const local = vi.fn();
    expect(c.coreDisplaysNotifications).toBe(false);
    await c.notify({ kind: 'info', title: 'x' }, local);
    expect(local).toHaveBeenCalledTimes(1);
    const { shell, p } = setup({ timeoutMs: 40 });
    void shell;
    const standalone = await p;
    const local2 = vi.fn();
    await standalone.notify({ kind: 'info', title: 'y' }, local2);
    expect(local2).toHaveBeenCalledTimes(1);
  });

  it('erreur côté hôte (DENIED/TIMEOUT) : repli local ; RATE_LIMITED : abandonné', async () => {
    const { EmbedError } = await import('@egen-civitas/esm-embed-protocol');
    let mode: 'denied' | 'rate' = 'denied';
    const show = vi.fn(async () => {
      throw new EmbedError(mode === 'denied' ? 'DENIED' : 'RATE_LIMITED', 'non');
    });
    const { c } = await connectedWith([grant('notifications')], { notifications: { show } });
    const local = vi.fn();
    await c.notify({ kind: 'info', title: 'a' }, local);
    expect(local).toHaveBeenCalledTimes(1);
    mode = 'rate';
    await c.notify({ kind: 'info', title: 'b' }, local);
    expect(local).toHaveBeenCalledTimes(1);
  });

  it('connexion fermée : affichage local', async () => {
    const { c } = await connectedWith([grant('notifications')], { notifications: { show: async () => ({ displayed: true }) } });
    c.close();
    const local = vi.fn();
    expect(c.coreDisplaysNotifications).toBe(false);
    await c.notify({ kind: 'info', title: 'z' }, local);
    expect(local).toHaveBeenCalledTimes(1);
  });
});
