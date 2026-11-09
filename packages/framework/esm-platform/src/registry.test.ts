import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CapabilityName } from '@egen-civitas/esm-globals';
import { getPlatform, registerPlatformCapabilities } from './index';
import {
  getCapabilityDefinition,
  isHostVersionSufficient,
  isKnownCapability,
  listCapabilityNames,
  registerCapability,
  unregisterCapability,
} from './registry';
import { createMockHost, createMockPlatform } from './testing';
import type { Unsubscribe } from './types';

/**
 * CRITÈRE DE RÉUSSITE DE C6 : « ajouter une capacité fictive dans un test ne modifie que les fichiers prévus ».
 *
 * La capacité `fictional` ci-dessous est ENTIÈREMENT déclarée dans ce fichier : ses types (deux fusions de
 * déclaration, sans toucher `esm-globals` ni `types.ts`), son entrée de registre, son adaptateur Web et son
 * adaptateur natif. Aucun fichier de production n'est modifié, et pourtant elle apparaît partout : gabarit
 * `UNAVAILABLE`, `getPlatform()` (Web et natif), handshake du Host, `has()`, mock.
 */
interface FictionalCapability {
  ping(message: string): Promise<string>;
  onTick(callback: () => void): Unsubscribe;
}

declare module '@egen-civitas/esm-globals' {
  interface EgenCapabilityExtensions {
    fictional: true;
  }
}
declare module './types' {
  interface CapabilityInterfaces {
    fictional: FictionalCapability;
  }
}

const w = window as unknown as Record<string, unknown>;
const V1 = [
  'session',
  'secureStorage',
  'openExternal',
  'lifecycle',
  'permissions',
  'files',
  'camera',
  'push',
  'biometric',
];

function registerFictional(overrides: { web?: boolean; native?: boolean; version?: number } = {}) {
  const { web = true, native = true, version = 1 } = overrides;
  registerCapability('fictional', {
    version,
    methods: { ping: 'async', onTick: 'subscribe' },
    web: web ? () => ({ ping: async (message: string) => `web:${message}` }) : undefined,
    native: native
      ? (client) => ({
          ping: (message: string) => client.call<string>('fictional', 'ping', { message }),
          onTick: (callback: () => void) => client.onEvent('fictional.tick', () => callback()),
        })
      : undefined,
  });
}

beforeEach(() => {
  delete w.egenTarget;
});
afterEach(() => {
  unregisterCapability('fictional');
  delete w.egenTarget;
  delete w.egenHostBridge;
});

describe('registre : les 9 capacités v1', () => {
  it('sont toutes enregistrées, avec leur version et leurs méthodes (contrat de l’annexe 2)', () => {
    expect(listCapabilityNames().sort()).toEqual([...V1].sort());
    const methods = (name: string) => getCapabilityDefinition(name)?.methods;
    expect(methods('session')).toEqual({
      getAuthorization: 'async',
      setTokens: 'async',
      refresh: 'async',
      clear: 'async',
    });
    expect(methods('secureStorage')).toEqual({ get: 'async', set: 'async', remove: 'async' });
    expect(methods('lifecycle')).toEqual({ onResume: 'subscribe', onPause: 'subscribe' });
    expect(methods('push')).toEqual({ register: 'async', onMessage: 'subscribe' });
    for (const name of V1) expect(getCapabilityDefinition(name)?.version).toBe(1);
  });

  it('seules les capacités que le navigateur sait fournir ont un adaptateur Web ; aucune n’a d’adaptateur natif (C7)', () => {
    const withWeb = V1.filter((name) => getCapabilityDefinition(name)?.web);
    expect(withWeb.sort()).toEqual(['camera', 'files', 'lifecycle', 'openExternal', 'permissions', 'session']);
    expect(V1.filter((name) => getCapabilityDefinition(name)?.native)).toEqual([]);
    // Jamais de faux coffre, de push ni de biométrie simulés en Web.
    for (const name of ['secureStorage', 'push', 'biometric'])
      expect(getCapabilityDefinition(name)?.web).toBeUndefined();
  });
});

describe('ajouter une capacité fictive : aucun fichier de production modifié', () => {
  it('une capacité absente du registre est inconnue partout', () => {
    expect(isKnownCapability('fictional')).toBe(false);
    expect(Object.keys(getPlatform())).not.toContain('fictional');
  });

  it('gabarit « indisponible » : la capacité existe comme objet, méthodes en UNAVAILABLE (async rejette, abonnement lève)', async () => {
    registerFictional({ web: false, native: false });
    expect(isKnownCapability('fictional')).toBe(true);
    w.egenTarget = 'android'; // natif sans Host : aucun adaptateur ne s'applique
    const platform = getPlatform();
    expect(platform.has('fictional')).toBe(false);
    await expect(platform.fictional.ping('x')).rejects.toMatchObject({
      code: 'UNAVAILABLE',
      capability: 'fictional',
      method: 'ping',
    });
    expect(() => platform.fictional.onTick(() => {})).toThrowError(
      expect.objectContaining({ code: 'UNAVAILABLE', capability: 'fictional', method: 'onTick' }),
    );
  });

  it('Web : l’adaptateur du registre est branché par getPlatform(), has() devient vrai', async () => {
    registerFictional();
    const platform = getPlatform();
    expect(platform.has('fictional')).toBe(true);
    await expect(platform.fictional.ping('salut')).resolves.toBe('web:salut');
    // Une méthode que l'adaptateur ne fournit pas reste UNAVAILABLE (pas de faux succès).
    expect(() => platform.fictional.onTick(() => {})).toThrowError(expect.objectContaining({ code: 'UNAVAILABLE' }));
  });

  it('Web : une fabrique qui retourne undefined (navigateur incapable) laisse la capacité absente', () => {
    registerCapability('fictional', {
      version: 1,
      methods: { ping: 'async', onTick: 'subscribe' },
      web: () => undefined,
    });
    expect(getPlatform().has('fictional')).toBe(false);
  });

  it('natif : le Host l’annonce et l’adaptateur appelle le pont ; événements relayés', async () => {
    registerFictional();
    w.egenTarget = 'android';
    const host = createMockHost({
      capabilities: { fictional: { v: 1 } } as never,
      handlers: { 'fictional.ping': (args) => `host:${(args as { message: string }).message}` },
    });
    host.install();
    const platform = getPlatform();
    await platform.ready;

    expect(platform.has('fictional')).toBe(true);
    await expect(platform.fictional.ping('salut')).resolves.toBe('host:salut');
    const tick = vi.fn();
    const off = platform.fictional.onTick(tick);
    host.emit('fictional.tick');
    await Promise.resolve();
    expect(tick).toHaveBeenCalledTimes(1);
    off();
  });

  it('natif : une capacité que le Host n’annonce pas reste indisponible, même avec un adaptateur', async () => {
    registerFictional();
    w.egenTarget = 'android';
    createMockHost({ capabilities: {} }).install();
    const platform = getPlatform();
    await platform.ready;
    expect(platform.has('fictional')).toBe(false);
    await expect(platform.fictional.ping('x')).rejects.toMatchObject({ code: 'UNAVAILABLE' });
  });

  it('natif : une version de Host INFÉRIEURE à celle du framework rend la capacité indisponible', async () => {
    registerFictional({ version: 2 });
    w.egenTarget = 'android';
    createMockHost({ capabilities: { fictional: { v: 1 } } as never }).install();
    const platform = getPlatform();
    await platform.ready;
    expect(platform.has('fictional')).toBe(false);
  });

  it('natif : une version de Host égale ou supérieure convient', async () => {
    registerFictional({ version: 2 });
    w.egenTarget = 'android';
    createMockHost({ capabilities: { fictional: { v: 3 } } as never }).install();
    const platform = getPlatform();
    await platform.ready;
    expect(platform.has('fictional')).toBe(true);
  });

  it('handshake : une capacité fictive annoncée par le Host est retenue ; avant son enregistrement elle était ignorée', async () => {
    w.egenTarget = 'android';
    createMockHost({ capabilities: { fictional: { v: 1 }, session: { v: 1 } } as never }).install();
    const ignored = getPlatform();
    await ignored.ready;
    // Capacité inconnue du client = ignorée (compatibilité ascendante) : seule `session` est retenue.
    const { getHostInfo } = await import('./index');
    expect(Object.keys(getHostInfo()?.capabilities ?? {})).toEqual(['session']);
  });

  it('mock : createMockPlatform fournit la capacité fictive et laisse le reste UNAVAILABLE', async () => {
    registerFictional({ web: false, native: false });
    const platform = createMockPlatform({ capabilities: { fictional: { ping: async (m) => `mock:${m}` } } });
    expect(platform.has('fictional')).toBe(true);
    await expect(platform.fictional.ping('x')).resolves.toBe('mock:x');
    expect(() => platform.fictional.onTick(() => {})).toThrowError(expect.objectContaining({ code: 'UNAVAILABLE' }));
  });

  it('filtrage des apps (F2) : requiredCapabilities accepte le nom fictif une fois déclaré', async () => {
    registerFictional();
    const name: CapabilityName = 'fictional'; // compile grâce à EgenCapabilityExtensions
    const platform = getPlatform();
    await registerPlatformCapabilities(platform);
    const { hasCapability } = await import('@egen-civitas/esm-globals');
    expect(hasCapability(name)).toBe(true);
  });

  it('retirer la capacité du registre la fait disparaître partout (aucun état résiduel)', () => {
    registerFictional();
    expect(unregisterCapability('fictional')).toBe(true);
    expect(unregisterCapability('fictional')).toBe(false);
    expect(isKnownCapability('fictional')).toBe(false);
    expect(Object.keys(getPlatform())).not.toContain('fictional');
  });
});

describe('isHostVersionSufficient', () => {
  it.each([
    ['session', 1, true],
    ['session', 2, true],
    ['session', 0, false],
    ['session', undefined, false],
    ['inconnue', 1, false],
  ])('%s annoncée en version %s → %s', (name, hostVersion, expected) => {
    expect(isHostVersionSufficient(name, hostVersion as number | undefined)).toBe(expected);
  });
});
