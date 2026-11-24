import type { ConnectOptions, EgenClient } from '@egen-civitas/esm-embed-client';
import { createTestHost } from './test-host.js';

export type ConnectFn = (options: ConnectOptions) => Promise<EgenClient>;

export interface ConformanceApi {
  describe(name: string, fn: () => void): void;
  it(name: string, fn: () => Promise<void> | void): void;
  expect: (value: any) => any;
}

/**
 * Suite de conformité du protocole v2 pour un client (le SDK, ou toute implémentation tierce qui expose la même forme).
 * Utilisation (Vitest/Jest) : `defineConformance(connectToEgen, { describe, it, expect })`.
 */
export function defineConformance(connect: ConnectFn, t: ConformanceApi): void {
  const { describe, it, expect } = t;
  const tick = (ms = 25) => new Promise((r) => setTimeout(r, ms));

  describe('conformité protocole v2 (client)', () => {
    it('poignée de main : connecté en protocole 2', async () => {
      const sim = createTestHost();
      const c = await connect({ ...sim.connectOptions, capabilities: ['session'] });
      expect(c.connected).toBe(true);
      expect(c.protocol).toBe(2);
      c.close();
      sim.destroy();
    });

    it('hôte muet : mode autonome, appels rejetés DENIED sans exception synchrone', async () => {
      const sim = createTestHost();
      const silent = { postMessage: () => undefined };
      const c = await connect({ ...sim.connectOptions, host: silent as any, timeoutMs: 80 });
      expect(c.connected).toBe(false);
      await expect(c.session.get()).rejects.toMatchObject({ code: 'DENIED' });
      sim.destroy();
    });

    it('origine d’hôte inattendue : jamais connecté', async () => {
      const sim = createTestHost();
      const c = await connect({ ...sim.connectOptions, hostOrigins: ['https://autre.exemple.org'], timeoutMs: 80 });
      expect(c.connected).toBe(false);
      sim.destroy();
    });

    it('hostOrigins : joker et liste vide refusés', async () => {
      const sim = createTestHost();
      await expect(Promise.resolve().then(() => connect({ ...sim.connectOptions, hostOrigins: ['*'] }))).rejects.toThrow();
      await expect(Promise.resolve().then(() => connect({ ...sim.connectOptions, hostOrigins: [] }))).rejects.toThrow();
      sim.destroy();
    });

    it('session : champs listés seulement, jamais de sessionId', async () => {
      const sim = createTestHost({ session: { authenticated: true, sessionId: 'SECRET', user: { uuid: 'u', display: 'Sam', email: 'e@x.y' } } });
      const c = await connect({ ...sim.connectOptions, capabilities: ['session'] });
      const s = await c.session.get();
      expect(JSON.stringify(s)).not.toMatch(/SECRET|e@x\.y/);
      expect(s).toMatchObject({ authenticated: true, user: { uuid: 'u', display: 'Sam' } });
      c.close();
      sim.destroy();
    });

    it('moindre privilège : capacité non approuvée refusée à la négociation et localement', async () => {
      const sim = createTestHost();
      const c = await connect({ ...sim.connectOptions, capabilities: ['session', 'api', 'notifications'] });
      expect(c.has('api')).toBe(false);
      expect(c.denied.map((d) => d.id).sort()).toEqual(['api', 'notifications']);
      await expect(c.api.fetch({ path: '/x' })).rejects.toMatchObject({ code: 'DENIED' });
      expect(sim.calls.some((x) => x.cap === 'api')).toBe(false);
      c.close();
      sim.destroy();
    });

    it('changements poussés par l’hôte (thème)', async () => {
      const sim = createTestHost({ theme: { mode: 'light', tokens: { '--p': '#fff' } } });
      const c = await connect({ ...sim.connectOptions, capabilities: ['session', 'theme'] });
      const themes: unknown[] = [];
      await c.theme.onChange((x) => themes.push(x));
      sim.emit.theme({ mode: 'dark', tokens: { '--p': '#000' } });
      await tick();
      expect(themes).toEqual([{ mode: 'dark', tokens: { '--p': '#000' } }]);
      c.close();
      sim.destroy();
    });

    it('thème : variables CSS invalides ignorées (pas d’injection)', async () => {
      const set: Record<string, string> = {};
      const sim = createTestHost({ theme: { mode: 'dark', tokens: { '--ok': '#111', color: 'red', '--bad': 'x;}body{display:none' } } });
      const c = await connect({ ...sim.connectOptions, capabilities: ['theme'] });
      await c.theme.sync({ style: { setProperty: (k: string, v: string) => (set[k] = v) } });
      expect(set).toEqual({ '--ok': '#111' });
      c.close();
      sim.destroy();
    });

    it('fermeture : appels suivants rejetés', async () => {
      const sim = createTestHost();
      const c = await connect({ ...sim.connectOptions, capabilities: ['session'] });
      c.close();
      await expect(c.session.get()).rejects.toMatchObject({ code: 'DENIED' });
      sim.destroy();
    });
  });
}
