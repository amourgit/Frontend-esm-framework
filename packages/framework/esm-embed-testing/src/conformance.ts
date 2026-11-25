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
      const c = await connect({ ...sim.connectOptions, capabilities: ['tenant'] });
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
      await expect(c.tenant.get()).rejects.toMatchObject({ code: 'DENIED' });
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

    it('règle d’or : identité, droits, thème et api ne sont pas des capacités du SDK', async () => {
      const sim = createTestHost();
      const c = await connect({ ...sim.connectOptions, capabilities: ['tenant', 'session', 'theme', 'permissions', 'api'] as any });
      expect(c.has('tenant')).toBe(true);
      expect(c.denied.map((d) => d.id).sort()).toEqual(['api', 'permissions', 'session', 'theme']);
      expect(c.denied.every((d) => d.reason === 'UNKNOWN')).toBe(true);
      c.close();
      sim.destroy();
    });

    it('moindre privilège : capacité non approuvée refusée à la négociation et localement', async () => {
      const sim = createTestHost();
      const c = await connect({ ...sim.connectOptions, capabilities: ['tenant', 'events', 'notifications'] });
      expect(c.has('events')).toBe(false);
      expect(c.denied.map((d) => d.id).sort()).toEqual(['events', 'notifications']);
      await expect(c.notifications.show({ kind: 'info', title: 'x' })).rejects.toMatchObject({ code: 'DENIED' });
      expect(sim.calls.some((x) => x.cap === 'notifications')).toBe(false);
      c.close();
      sim.destroy();
    });

    it('changements poussés par l’hôte (langue)', async () => {
      const sim = createTestHost({ locale: 'fr' });
      const c = await connect({ ...sim.connectOptions, capabilities: ['locale'] });
      const seen: unknown[] = [];
      await c.locale.onChange((x) => seen.push(x));
      sim.emit.locale('en');
      await tick();
      expect(seen).toEqual(['en']);
      c.close();
      sim.destroy();
    });

    it('extensions : découverte limitée aux slots approuvés', async () => {
      const list = [{ name: 'nav-x', moduleName: '@egen/esm-x-app', meta: { label: 'X' } }];
      const sim = createTestHost({ extensions: { 'topbar-nav-slot': list }, manifestCapabilities: { extensions: { discover: ['topbar-nav-slot'] } }, approved: { extensions: { discover: ['topbar-nav-slot'] } } });
      const c = await connect({ ...sim.connectOptions, capabilities: ['extensions'] });
      await expect(c.extensions.list('topbar-nav-slot')).resolves.toEqual(list);
      await expect(c.extensions.list('shell-rail-left-slot')).rejects.toMatchObject({ code: 'DENIED' });
      c.close();
      sim.destroy();
    });

    it('fermeture : appels suivants rejetés', async () => {
      const sim = createTestHost();
      const c = await connect({ ...sim.connectOptions, capabilities: ['tenant'] });
      c.close();
      await expect(c.tenant.get()).rejects.toMatchObject({ code: 'DENIED' });
      sim.destroy();
    });
  });
}
