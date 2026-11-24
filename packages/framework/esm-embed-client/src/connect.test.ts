import { afterEach, describe, expect, it } from 'vitest';
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
    const { shell, p } = setup({ capabilities: ['session', 'theme', 'events'] });
    expect(shell.hostWindow.posted[0]).toMatchObject({ message: { egen: 2, moduleName: shell.moduleName, message: { kind: 'probe' } }, targetOrigin: shell.origin });
    shell.hello();
    expect(shell.connectMsg).toMatchObject({ kind: 'connect', nonce: 'nonce-0123456789', protocol: 2, requested: [{ id: 'session', version: 1 }, { id: 'theme', version: 1 }, { id: 'events', version: 1 }] });
    expect(shell.hostWindow.posted.at(-1)!.targetOrigin).toBe(shell.origin);
    shell.accept([grant('session', { fields: ['user.display'] }), grant('theme')], { session: { get: () => ({ user: { display: 'Sam' } }) } });
    const c = await p;
    expect(c.connected).toBe(true);
    expect(c.has('session')).toBe(true);
    expect(c.has('events')).toBe(false);
    await expect(c.session.get()).resolves.toEqual({ user: { display: 'Sam' } });
  });

  it('ignore une origine ou une source inattendue, puis repli autonome', async () => {
    const { shell, p } = setup();
    shell.hello('nonce-0123456789', { origin: 'https://evil.exemple.org' });
    shell.hello('nonce-0123456789', { source: {} });
    expect(shell.connectMsg).toBeUndefined();
    const c = await p;
    expect(c.connected).toBe(false);
    await expect(c.session.get()).rejects.toMatchObject({ code: 'DENIED' });
  });

  it('ignore un port avec un mauvais nonce ou sans port', async () => {
    const { shell, p } = setup();
    shell.hello();
    shell.accept([grant('session')], { session: { get: () => 1 } }, 'autre-nonce-0123456');
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
    shell.accept([grant('session')], { session: { get: () => 1 } }, 'nonce-aaaaaaaaaa');
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
  async function connected(granted = [grant('session'), grant('theme'), grant('ai-tools'), grant('lifecycle'), grant('events')], handlers: any = {}, subscribe?: any) {
    const { shell, p } = setup();
    shell.hello();
    shell.accept(granted, handlers, 'nonce-0123456789', { subscribe });
    return { shell, c: await p };
  }

  it('capacité non accordée : rejet local sans aller-retour', async () => {
    let called = false;
    const { c } = await connected([grant('session')], { api: { fetch: () => (called = true) } });
    await expect(c.api.fetch({ path: '/x' })).rejects.toMatchObject({ code: 'DENIED', message: expect.stringMatching(/api/) });
    await expect(c.notifications.show({ kind: 'info', title: 'a' })).rejects.toMatchObject({ code: 'DENIED' });
    expect(called).toBe(false);
  });

  it('theme.sync applique les variables valides et ignore les injections', async () => {
    const set: Record<string, string> = {};
    const dark: boolean[] = [];
    const root = { style: { setProperty: (k: string, v: string) => (set[k] = v) }, classList: { toggle: (_n: string, f?: boolean) => (dark.push(!!f), !!f) } };
    let emit: any;
    const { c } = await connected(undefined, { theme: { get: () => ({ mode: 'dark', tokens: { '--primary': '#fff', 'color': 'red', '--bad': 'red;}body{display:none', '--ok': 'rgb(1 2 3)' } }) } }, (_cap: string, _ev: string, e: any) => ((emit = e), () => undefined));
    const off = await c.theme.sync(root);
    expect(set).toEqual({ '--primary': '#fff', '--ok': 'rgb(1 2 3)' });
    expect(dark).toEqual([true]);
    emit({ mode: 'light', tokens: { '--primary': '#000' } });
    await tick();
    expect(set['--primary']).toBe('#000');
    expect(dark).toEqual([true, false]);
    off();
  });

  it('événements : abonnement filtré par l’hôte', async () => {
    const got: unknown[] = [];
    const { c } = await connected(undefined, {}, (cap: string, ev: string, emit: any) => (cap === 'events' && ev === 'core.theme.changed' ? (emit('x'), () => undefined) : undefined));
    await c.events.subscribe('core.theme.changed', (p) => got.push(p));
    await tick();
    expect(got).toEqual(['x']);
    await expect(c.events.subscribe('core.secret', () => undefined)).rejects.toMatchObject({ code: 'DENIED' });
  });

  it('outils IA : l’hôte invoque le handler enregistré', async () => {
    const { c, shell } = await connected(undefined, { 'ai-tools': { register: () => undefined, unregister: () => undefined } });
    await c.aiTools.register([{ name: 'palette.apply', description: 'Applique', handler: (a) => ({ applied: a.name }) }]);
    await expect(shell.rpc!.call('ai-tools', 'invoke', ['palette.apply', { name: 'sunset' }])).resolves.toEqual({ applied: 'sunset' });
    await expect(shell.rpc!.call('ai-tools', 'invoke', ['inconnu', {}])).rejects.toMatchObject({ code: 'UNKNOWN_METHOD' });
    await c.aiTools.unregister(['palette.apply']);
    await expect(shell.rpc!.call('ai-tools', 'invoke', ['palette.apply', {}])).rejects.toMatchObject({ code: 'UNKNOWN_METHOD' });
  });

  it('cycle de vie : canLeave', async () => {
    const { c, shell } = await connected();
    await expect(shell.rpc!.call('lifecycle', 'canLeave')).resolves.toBe(true);
    c.lifecycle.setBeforeLeave(async () => false);
    await expect(shell.rpc!.call('lifecycle', 'canLeave')).resolves.toBe(false);
  });

  it('fermeture : client fermé, appels rejetés', async () => {
    const { c } = await connected(undefined, { session: { get: () => 1 } });
    c.close();
    expect(c.closed).toBe(true);
    await expect(c.session.get()).rejects.toMatchObject({ code: 'DENIED' });
  });
});
