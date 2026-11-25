import { afterEach, describe, expect, it } from 'vitest';
import { EmbedError, RpcEndpoint, validateCall, type HandlerTable } from './index.js';

const open: RpcEndpoint[] = [];
afterEach(() => {
  while (open.length) open.pop()!.close('test');
});

function pair(hostHandlers: HandlerTable = {}, appHandlers: HandlerTable = {}, extra: Partial<ConstructorParameters<typeof RpcEndpoint>[0]> = {}) {
  const { port1, port2 } = new MessageChannel();
  const subs: Array<{ cap: string; ev: string; emit: (v?: unknown) => void; cleaned: boolean }> = [];
  const host = new RpcEndpoint({
    port: port1,
    handlers: hostHandlers,
    validate: validateCall,
    limits: { pingIntervalMs: 0 },
    onSubscribe: (cap, ev, emit) => {
      if (ev === 'refus') return undefined;
      const rec = { cap, ev, emit, cleaned: false };
      subs.push(rec);
      emit('initial');
      return () => {
        rec.cleaned = true;
      };
    },
    ...extra,
  });
  const app = new RpcEndpoint({ port: port2, handlers: appHandlers, limits: { pingIntervalMs: 0, callTimeoutMs: 300 } });
  open.push(host, app);
  return { host, app, subs };
}

const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));

describe('RPC sur vrai MessageChannel', () => {
  it('appel nominal et résultat', async () => {
    const { app } = pair({ tenant: { get: async () => ({ id: 't1' }) } });
    await expect(app.call('tenant', 'get')).resolves.toEqual({ id: 't1' });
  });

  it('capacité et méthode inconnues', async () => {
    const { app } = pair({ tenant: { get: () => 1 } });
    await expect(app.call('locale', 'get')).rejects.toMatchObject({ code: 'UNKNOWN_CAPABILITY' });
    await expect(app.call('tenant', 'set')).rejects.toMatchObject({ code: 'UNKNOWN_METHOD' });
  });

  it('dispatch fermé : constructor, __proto__, toString inatteignables', async () => {
    let touched = false;
    const { app } = pair({ tenant: { get: () => (touched = true) } });
    for (const [cap, m] of [
      ['constructor', 'constructor'],
      ['__proto__', 'get'],
      ['tenant', 'constructor'],
      ['tenant', '__proto__'],
      ['tenant', 'toString'],
      ['tenant', 'hasOwnProperty'],
    ]) {
      await expect(app.call(cap, m)).rejects.toMatchObject({ code: expect.stringMatching(/UNKNOWN_(CAPABILITY|METHOD)/) });
    }
    expect(touched).toBe(false);
  });

  it('validation des arguments avant appel', async () => {
    let called = false;
    const { app } = pair({ navigation: { navigate: () => (called = true) } });
    await expect(app.call('navigation', 'navigate', ['//evil.com'])).rejects.toMatchObject({ code: 'INVALID_ARGS' });
    expect(called).toBe(false);
    await expect(app.call('navigation', 'navigate', ['/ok'])).resolves.toBe(true);
  });

  it('erreurs : EmbedError conservée, erreur interne masquée', async () => {
    const { app } = pair({
      flags: { isEnabled: () => { throw new EmbedError('DENIED', 'non'); } },
      tenant: { get: () => { throw new Error('secret interne /etc/passwd'); } },
    });
    await expect(app.call('flags', 'isEnabled', ['x'])).rejects.toMatchObject({ code: 'DENIED', message: 'non' });
    const e: any = await app.call('tenant', 'get').catch((x) => x);
    expect(e.code).toBe('INTERNAL');
    expect(e.message).not.toMatch(/secret|passwd/);
  });

  it('délai dépassé', async () => {
    const { app } = pair({ tenant: { get: () => new Promise(() => undefined) } });
    await expect(app.call('tenant', 'get', [], 50)).rejects.toMatchObject({ code: 'TIMEOUT' });
  });

  it('appels hôte → app (rappel)', async () => {
    const { host } = pair({}, { 'ai-tools': { invoke: (n: string) => `ok:${n}` } });
    await expect(host.call('ai-tools', 'invoke', ['outil', {}])).resolves.toBe('ok:outil');
  });

  it('abonnement : valeur initiale après la réponse, événements, désabonnement', async () => {
    const { app, subs } = pair();
    const got: unknown[] = [];
    const off = await app.subscribe('locale', 'change', (v) => got.push(v));
    await tick();
    expect(got).toEqual(['initial']);
    subs[0].emit('b');
    await tick();
    expect(got).toEqual(['initial', 'b']);
    off();
    await tick();
    expect(subs[0].cleaned).toBe(true);
    subs[0].emit('c');
    await tick();
    expect(got).toEqual(['initial', 'b']);
  });

  it('abonnement refusé', async () => {
    const { app } = pair();
    await expect(app.subscribe('locale', 'refus', () => undefined)).rejects.toMatchObject({ code: 'DENIED' });
  });

  it('limite d’abonnements', async () => {
    const { app } = pair({}, {}, { limits: { pingIntervalMs: 0, maxSubscriptions: 2 } });
    await app.subscribe('locale', 'a', () => undefined);
    await app.subscribe('locale', 'b', () => undefined);
    await expect(app.subscribe('locale', 'c', () => undefined)).rejects.toMatchObject({ code: 'RATE_LIMITED' });
  });

  it('limite de débit puis coupure', async () => {
    const { app, host } = pair({ tenant: { get: () => 1 } }, {}, { limits: { pingIntervalMs: 0, requestsPerSecond: 5 } });
    const results = await Promise.allSettled(Array.from({ length: 8 }, () => app.call('tenant', 'get')));
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(5);
    expect(results.filter((r) => r.status === 'rejected' && (r.reason as any).code === 'RATE_LIMITED').length).toBeGreaterThan(0);
    const burst = await Promise.allSettled(Array.from({ length: 30 }, () => app.call('tenant', 'get')));
    expect(burst.some((r) => r.status === 'rejected')).toBe(true);
    await tick();
    expect(host.closed).toBe(true);
  });

  it('message trop volumineux', async () => {
    const { app } = pair({ tenant: { get: () => 1 } }, {}, { limits: { pingIntervalMs: 0, maxMessageBytes: 1000 } });
    await expect(app.call('tenant', 'get', ['x'.repeat(5000)])).rejects.toMatchObject({ code: 'TOO_LARGE' });
  });

  it('fermeture : appels en cours rejetés, appels suivants refusés, pair prévenu', async () => {
    const { app, host } = pair({ tenant: { get: () => new Promise(() => undefined) } });
    const p = app.call('tenant', 'get');
    await tick();
    app.close();
    await expect(p).rejects.toMatchObject({ code: 'CLOSED' });
    await expect(app.call('tenant', 'get')).rejects.toMatchObject({ code: 'CLOSED' });
    await tick();
    expect(host.closed).toBe(true);
  });

  it('nettoie les abonnements à la fermeture', async () => {
    const { app, host, subs } = pair();
    await app.subscribe('locale', 'change', () => undefined);
    host.close('test');
    expect(subs[0].cleaned).toBe(true);
  });
});
