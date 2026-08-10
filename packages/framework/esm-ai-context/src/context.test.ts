/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  registerAIContextProvider,
  removeAIContextProvider,
  getAIContextProviders,
  collectProviderData,
  getProviderCount,
  _clearProviderRegistry,
  type AIContextProvider,
} from '.';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeProvider(overrides: Partial<AIContextProvider> = {}): AIContextProvider {
  return {
    id: `test-provider-${Math.random().toString(36).slice(2)}`,
    name: 'Test Provider',
    priority: 0,
    provide: () => ({ testKey: 'testValue' }),
    ...overrides,
  };
}

// ─── Tests Provider Registry ─────────────────────────────────────────────────

describe('AIContextProvider Registry', () => {
  beforeEach(() => _clearProviderRegistry());
  afterEach(() => _clearProviderRegistry());

  describe('registerAIContextProvider', () => {
    it('enregistre un provider et l\'inclut dans le registre', () => {
      const provider = makeProvider({ id: 'p1' });
      registerAIContextProvider(provider);
      expect(getProviderCount()).toBe(1);
      expect(getAIContextProviders().find((p) => p.id === 'p1')).toBeDefined();
    });

    it('retourne une fonction de désinscription fonctionnelle', () => {
      const provider = makeProvider({ id: 'p2' });
      const unsub = registerAIContextProvider(provider);
      expect(getProviderCount()).toBe(1);
      unsub();
      expect(getProviderCount()).toBe(0);
    });

    it('remplace un provider existant avec le même id', () => {
      const v1 = makeProvider({ id: 'p3', name: 'V1', provide: () => ({ v: 1 }) });
      const v2 = makeProvider({ id: 'p3', name: 'V2', provide: () => ({ v: 2 }) });

      registerAIContextProvider(v1);
      registerAIContextProvider(v2);

      expect(getProviderCount()).toBe(1);
      expect(getAIContextProviders()[0].name).toBe('V2');
    });

    it('appelle unsubscribe de l\'ancien provider lors du remplacement', () => {
      const oldUnsub = vi.fn();
      const v1 = makeProvider({
        id: 'p4',
        subscribe: (cb) => { cb(); return oldUnsub; },
      });
      const v2 = makeProvider({ id: 'p4' });

      registerAIContextProvider(v1);
      registerAIContextProvider(v2);

      expect(oldUnsub).toHaveBeenCalledOnce();
    });

    it('s\'abonne aux changements internes du provider si subscribe() est fourni', () => {
      const changeCallback = vi.fn();
      let providerSubscribeCallback: (() => void) | null = null;

      const provider = makeProvider({
        id: 'p5',
        subscribe: (cb) => {
          providerSubscribeCallback = cb;
          return () => {};
        },
      });

      // S'abonner aux changements du registre
      const { onProviderRegistryChange } = require('./provider-registry');
      const unsub = onProviderRegistryChange(changeCallback);

      registerAIContextProvider(provider);
      changeCallback.mockClear(); // Reset après l'enregistrement initial

      // Simuler un changement interne du provider
      providerSubscribeCallback?.();
      expect(changeCallback).toHaveBeenCalledOnce();

      unsub();
    });
  });

  describe('removeAIContextProvider', () => {
    it('retire le provider du registre', () => {
      const provider = makeProvider({ id: 'r1' });
      registerAIContextProvider(provider);
      removeAIContextProvider('r1');
      expect(getProviderCount()).toBe(0);
    });

    it('ne throw pas pour un id inexistant', () => {
      expect(() => removeAIContextProvider('nonexistent')).not.toThrow();
    });
  });

  describe('collectProviderData', () => {
    it('collecte les données de tous les providers', () => {
      registerAIContextProvider(makeProvider({ id: 'c1', provide: () => ({ a: 1 }) }));
      registerAIContextProvider(makeProvider({ id: 'c2', provide: () => ({ b: 2 }) }));

      const data = collectProviderData();
      expect(data.a).toBe(1);
      expect(data.b).toBe(2);
    });

    it('le provider de plus haute priorité gagne en cas de conflit de clé', () => {
      registerAIContextProvider(makeProvider({
        id: 'low',
        priority: 1,
        provide: () => ({ shared: 'low-priority' }),
      }));
      registerAIContextProvider(makeProvider({
        id: 'high',
        priority: 10,
        provide: () => ({ shared: 'high-priority' }),
      }));

      const data = collectProviderData();
      expect(data.shared).toBe('high-priority');
    });

    it('ne throw pas si un provider lève une erreur', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      registerAIContextProvider(makeProvider({
        id: 'failing',
        provide: () => { throw new Error('Provider error'); },
      }));
      registerAIContextProvider(makeProvider({
        id: 'ok',
        provide: () => ({ ok: true }),
      }));

      expect(() => collectProviderData()).not.toThrow();
      const data = collectProviderData();
      expect(data.ok).toBe(true);

      consoleSpy.mockRestore();
    });

    it('retourne un objet vide si aucun provider', () => {
      const data = collectProviderData();
      expect(data).toEqual({});
    });
  });

  describe('getAIContextProviders', () => {
    it('retourne les providers triés par priorité décroissante', () => {
      registerAIContextProvider(makeProvider({ id: 'a', priority: 5, name: 'A' }));
      registerAIContextProvider(makeProvider({ id: 'b', priority: 15, name: 'B' }));
      registerAIContextProvider(makeProvider({ id: 'c', priority: 1, name: 'C' }));

      const providers = getAIContextProviders();
      expect(providers[0].name).toBe('B');
      expect(providers[1].name).toBe('A');
      expect(providers[2].name).toBe('C');
    });

    it('utilise 0 comme priorité par défaut', () => {
      registerAIContextProvider(makeProvider({ id: 'no-priority', priority: undefined }));
      const providers = getAIContextProviders();
      expect(providers[0].priority ?? 0).toBe(0);
    });
  });
});
