import type { CapabilityName } from '@egen-civitas/esm-globals';
import { unavailable } from './errors.js';
import type { Platform, PlatformEnvironment } from './types.js';

/** Les capacités d'une plateforme, indexées par leur nom (`CapabilityName` = clés de `Platform`). */
export type CapabilityMap = Pick<Platform, CapabilityName>;

/** Implémentations (éventuellement partielles) fournies par un adaptateur ; ce qui manque reste `UNAVAILABLE`. */
export type CapabilityOverrides = { [K in CapabilityName]?: Partial<CapabilityMap[K]> };

/** Méthode asynchrone d'une capacité absente : REJETTE `UNAVAILABLE` (jamais de `null` ambigu). */
const rejecting = (capability: string, method: string) => () => Promise.reject(unavailable(capability, method));

/**
 * Méthode d'une capacité absente dont la signature n'est pas une `Promise` (abonnements `onResume`, `onMessage`) :
 * lève `UNAVAILABLE` immédiatement, faute de pouvoir rejeter. L'appelant teste `platform.has(…)` avant de s'abonner.
 */
const throwing = (capability: string, method: string) => () => {
  throw unavailable(capability, method);
};

/**
 * Toutes les capacités, sous forme d'objets dont chaque méthode échoue en `UNAVAILABLE`. Une capacité absente EXISTE
 * donc toujours comme objet (règle C2) ; c'est `has()` qui dit si elle est réellement fournie.
 */
export function createUnavailableCapabilities(): CapabilityMap {
  return {
    session: {
      getAuthorization: rejecting('session', 'getAuthorization'),
      setTokens: rejecting('session', 'setTokens'),
      refresh: rejecting('session', 'refresh'),
      clear: rejecting('session', 'clear'),
    },
    secureStorage: {
      get: rejecting('secureStorage', 'get'),
      set: rejecting('secureStorage', 'set'),
      remove: rejecting('secureStorage', 'remove'),
    },
    openExternal: { open: rejecting('openExternal', 'open') },
    lifecycle: {
      onResume: throwing('lifecycle', 'onResume'),
      onPause: throwing('lifecycle', 'onPause'),
    },
    permissions: {
      check: rejecting('permissions', 'check'),
      request: rejecting('permissions', 'request'),
    },
    files: {
      select: rejecting('files', 'select'),
      download: rejecting('files', 'download'),
    },
    camera: { capture: rejecting('camera', 'capture') },
    push: {
      register: rejecting('push', 'register'),
      onMessage: throwing('push', 'onMessage'),
    },
    biometric: {
      isAvailable: rejecting('biometric', 'isAvailable'),
      authenticate: rejecting('biometric', 'authenticate'),
    },
  };
}

export interface AssemblePlatformOptions {
  environment: PlatformEnvironment;
  /** Capacités réellement fournies (adaptateur Web, client de pont natif, mock de test…). */
  capabilities?: CapabilityOverrides;
  /** Appelée à CHAQUE lecture de `platform.ready` (évite un rejet non observé si personne ne l'attend). */
  ready: () => Promise<void>;
}

/**
 * Assemble un objet `Platform` : les capacités fournies remplacent celles indisponibles, et `has()` n'est vrai que pour
 * elles. Point unique de construction, partagé par `getPlatform()`, les adaptateurs (C4, C5) et les mocks (C9) : ils
 * ne peuvent donc pas diverger du contrat.
 */
export function assemblePlatform({ environment, capabilities = {}, ready }: AssemblePlatformOptions): Platform {
  const base = createUnavailableCapabilities();
  const provided = new Set(Object.keys(capabilities) as CapabilityName[]);
  const merged = {} as Record<CapabilityName, unknown>;
  for (const name of Object.keys(base) as CapabilityName[]) {
    merged[name] = { ...base[name], ...capabilities[name] };
  }

  return {
    environment,
    get ready() {
      return ready();
    },
    has: (capability) => provided.has(capability),
    ...(merged as CapabilityMap),
  };
}
