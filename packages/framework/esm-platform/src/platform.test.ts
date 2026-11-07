import { afterEach, describe, expect, it } from 'vitest';
import type { CapabilityName } from '@egen-civitas/esm-globals';
import { getPlatform, hasHostBridge, isPlatformError, PlatformError } from './index';
import { createMockPlatform } from './testing';
import type { Platform } from './types';

type AnyRecord = Record<string, (...args: unknown[]) => unknown>;

/** Toutes les capacités v1 avec leurs méthodes (annexe 2). Ajouter une capacité oblige à compléter ce tableau. */
const ASYNC_METHODS: Array<[CapabilityName, string]> = [
  ['session', 'getAuthorization'],
  ['session', 'setTokens'],
  ['session', 'refresh'],
  ['session', 'clear'],
  ['secureStorage', 'get'],
  ['secureStorage', 'set'],
  ['secureStorage', 'remove'],
  ['openExternal', 'open'],
  ['permissions', 'check'],
  ['permissions', 'request'],
  ['files', 'select'],
  ['files', 'download'],
  ['camera', 'capture'],
  ['push', 'register'],
  ['biometric', 'isAvailable'],
  ['biometric', 'authenticate'],
];
/** Abonnements : leur signature n'est pas une Promise, ils ne peuvent donc pas « rejeter » : ils lèvent. */
const SYNC_METHODS: Array<[CapabilityName, string]> = [
  ['lifecycle', 'onResume'],
  ['lifecycle', 'onPause'],
  ['push', 'onMessage'],
];
const CAPABILITIES: CapabilityName[] = [
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

const call = (platform: Platform, capability: CapabilityName, method: string) =>
  (platform[capability] as unknown as AnyRecord)[method]('x', 'y');

afterEach(() => {
  const w = window as unknown as Record<string, unknown>;
  delete w.egenTarget;
  delete w.egenHostBridge;
  delete w.Capacitor;
});

/**
 * Le mock est testé contre LES MÊMES tests de contrat que l'implémentation (règle C9) : il ne peut pas diverger.
 */
describe.each([
  [
    'getPlatform() (natif sans adaptateur)',
    () => {
      window.egenTarget = 'android';
      return getPlatform();
    },
  ],
  ['createMockPlatform()', () => createMockPlatform()],
])('contrat de capacités indisponibles — %s', (_label, make) => {
  it('expose exactement les capacités v1 comme objets, et aucune autre', () => {
    const platform = make() as unknown as Record<string, unknown>;
    const exposed = Object.keys(platform).filter((key) => !['environment', 'ready', 'has'].includes(key));
    expect(exposed.sort()).toEqual([...CAPABILITIES].sort());
    for (const name of CAPABILITIES) {
      expect(typeof platform[name]).toBe('object');
    }
  });

  it('le tableau de méthodes couvre toutes les méthodes de chaque capacité', () => {
    const platform = make();
    const covered = [...ASYNC_METHODS, ...SYNC_METHODS];
    for (const name of CAPABILITIES) {
      const methods = Object.keys(platform[name] as object).sort();
      expect(
        covered
          .filter(([cap]) => cap === name)
          .map(([, m]) => m)
          .sort(),
      ).toEqual(methods);
    }
  });

  it.each(CAPABILITIES)('has("%s") est faux : rien n’est simulé', (name) => {
    expect(make().has(name)).toBe(false);
  });

  it.each(ASYNC_METHODS)(
    '%s.%s rejette PlatformError UNAVAILABLE (jamais null, jamais Error générique)',
    async (cap, method) => {
      const promise = call(make(), cap, method) as Promise<unknown>;
      expect(promise).toBeInstanceOf(Promise);
      const error = await promise.then(
        () => {
          throw new Error('devait rejeter');
        },
        (e: unknown) => e,
      );
      expect(isPlatformError(error)).toBe(true);
      expect(error).toMatchObject({
        name: 'PlatformError',
        code: 'UNAVAILABLE',
        capability: cap,
        method,
        retryable: false,
      });
    },
  );

  it.each(SYNC_METHODS)('%s.%s (abonnement) lève PlatformError UNAVAILABLE', (cap, method) => {
    const platform = make();
    expect(() => call(platform, cap, method)).toThrow(PlatformError);
    try {
      call(platform, cap, method);
    } catch (error) {
      expect(error).toMatchObject({ code: 'UNAVAILABLE', capability: cap, method });
    }
  });

  it('les messages d’erreur ne contiennent pas les arguments (aucune fuite de jeton ou de clé)', async () => {
    const error = (await (make().session.setTokens as (t: unknown) => Promise<void>)({
      access: 'SECRET-TOKEN-123',
    }).catch((e: Error) => e)) as Error;
    expect(error.message).not.toContain('SECRET-TOKEN-123');
    expect(String(error.stack)).not.toContain('SECRET-TOKEN-123');
  });
});

describe('getPlatform() — environnement et handshake', () => {
  it('web par défaut : ready se résout immédiatement', async () => {
    const platform = getPlatform();
    expect(platform.environment).toBe('web');
    await expect(platform.ready).resolves.toBeUndefined();
  });

  it.each(['android', 'ios'] as const)(
    '%s sans Host : ready rejette INCOMPATIBLE « Host manquant »',
    async (target) => {
      window.egenTarget = target;
      const platform = getPlatform();
      expect(platform.environment).toBe(target);
      const error = await platform.ready.then(
        () => {
          throw new Error('devait rejeter');
        },
        (e: unknown) => e,
      );
      expect(error).toBeInstanceOf(PlatformError);
      expect(error).toMatchObject({ code: 'INCOMPATIBLE' });
      expect((error as Error).message).toContain('Host manquant');
      expect((error as Error).message).toContain(target);
    },
  );

  it('natif avec un pont conforme ({ send, subscribe }) : ready se résout', async () => {
    window.egenTarget = 'android';
    (window as unknown as Record<string, unknown>).egenHostBridge = { send: () => {}, subscribe: () => {} };
    await expect(getPlatform().ready).resolves.toBeUndefined();
  });

  it.each([
    ['sans subscribe', { send: () => {} }],
    ['sans send', { subscribe: () => {} }],
    ['send non fonction', { send: 'x', subscribe: () => {} }],
    ['null', null],
    ['chaîne', 'bridge'],
  ])('natif avec un pont non conforme (%s) : ready rejette INCOMPATIBLE', async (_label, bridge) => {
    window.egenTarget = 'ios';
    (window as unknown as Record<string, unknown>).egenHostBridge = bridge;
    expect(hasHostBridge()).toBe(false);
    await expect(getPlatform().ready).rejects.toMatchObject({ code: 'INCOMPATIBLE' });
  });

  it('en Web, un pont présent ne change rien (la cible vient du build, pas de la détection)', async () => {
    (window as unknown as Record<string, unknown>).egenHostBridge = { send: () => {}, subscribe: () => {} };
    expect(getPlatform().environment).toBe('web');
  });

  it('ne détecte ni Capacitor ni le User-Agent (N2, N4)', () => {
    (window as unknown as Record<string, unknown>).Capacitor = { isNativePlatform: () => true };
    Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (Linux; Android 14)', configurable: true });
    expect(getPlatform().environment).toBe('web');
  });

  it('lire ready ne crée aucun rejet tant que personne ne l’attend', () => {
    window.egenTarget = 'android';
    // Aucune lecture de `ready` : construire la plateforme native sans Host ne doit rien rejeter.
    expect(() => getPlatform()).not.toThrow();
  });
});

describe('createMockPlatform()', () => {
  it('fournit seulement les capacités demandées ; le reste reste UNAVAILABLE', async () => {
    const platform = createMockPlatform({
      environment: 'android',
      capabilities: { secureStorage: { get: async (key) => `valeur-de-${key}` } },
    });
    expect(platform.environment).toBe('android');
    expect(platform.has('secureStorage')).toBe(true);
    expect(platform.has('session')).toBe(false);
    await expect(platform.secureStorage.get('k')).resolves.toBe('valeur-de-k');
    // Même dans une capacité fournie, une méthode non simulée reste UNAVAILABLE (pas de faux succès).
    await expect(platform.secureStorage.set('k', 'v')).rejects.toMatchObject({ code: 'UNAVAILABLE', method: 'set' });
    await expect(platform.session.getAuthorization()).rejects.toMatchObject({ code: 'UNAVAILABLE' });
  });

  it('ready peut être contrôlé par le test', async () => {
    const failing = createMockPlatform({
      environment: 'ios',
      ready: Promise.reject(new PlatformError('TIMEOUT', 'x')),
    });
    await expect(failing.ready).rejects.toMatchObject({ code: 'TIMEOUT' });
  });
});
