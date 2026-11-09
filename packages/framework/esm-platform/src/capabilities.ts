import type { CapabilityName } from '@egen-civitas/esm-globals';
import { unavailable } from './errors.js';
import { getCapabilityDefinition, listCapabilityNames } from './registry.js';
import type { CapabilityInterfaces, Platform, PlatformEnvironment } from './types.js';

/** Les capacités d'une plateforme, indexées par leur nom (clés de `CapabilityInterfaces`). */
export type CapabilityMap = { [K in keyof CapabilityInterfaces]: CapabilityInterfaces[K] };

/** Implémentations (éventuellement partielles) fournies par un adaptateur ; ce qui manque reste `UNAVAILABLE`. */
export type CapabilityOverrides = { [K in keyof CapabilityInterfaces]?: Partial<CapabilityInterfaces[K]> };

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
 * Toutes les capacités DU REGISTRE, sous forme d'objets dont chaque méthode échoue en `UNAVAILABLE`. Une capacité
 * absente EXISTE donc toujours comme objet (règle C2) ; c'est `has()` qui dit si elle est réellement fournie.
 * Dérivé de `registry.ts` : ajouter une capacité au registre l'ajoute ici sans rien modifier.
 */
export function createUnavailableCapabilities(): CapabilityMap {
  const capabilities: Record<string, Record<string, () => unknown>> = {};
  for (const name of listCapabilityNames()) {
    const methods = getCapabilityDefinition(name)?.methods ?? {};
    capabilities[name] = Object.fromEntries(
      Object.entries(methods).map(([method, kind]) => [
        method,
        kind === 'subscribe' ? throwing(name, method) : rejecting(name, method),
      ]),
    );
  }
  return capabilities as unknown as CapabilityMap;
}

export interface AssemblePlatformOptions {
  environment: PlatformEnvironment;
  /** Capacités réellement fournies (adaptateur Web, client de pont natif, mock de test…). */
  capabilities?: CapabilityOverrides;
  /** Appelée à CHAQUE lecture de `platform.ready` (évite un rejet non observé si personne ne l'attend). */
  ready: () => Promise<void>;
  /**
   * Filtre dynamique en plus de la présence d'un adaptateur : une capacité n'est disponible que si elle est fournie
   * ET que ce prédicat l'accepte (natif : le Host l'a annoncée au handshake). Défaut : toujours vrai.
   */
  available?: (capability: CapabilityName) => boolean;
}

/**
 * Assemble un objet `Platform` : les capacités fournies remplacent celles indisponibles, et `has()` n'est vrai que pour
 * elles. Point unique de construction, partagé par `getPlatform()`, les adaptateurs (C4, C5) et les mocks (C9) : ils
 * ne peuvent donc pas diverger du contrat.
 */
export function assemblePlatform({
  environment,
  capabilities = {},
  ready,
  available,
}: AssemblePlatformOptions): Platform {
  const base = createUnavailableCapabilities();
  const provided = new Set<string>(Object.keys(capabilities));
  const merged: Record<string, unknown> = {};
  for (const name of Object.keys(base)) {
    merged[name] = { ...base[name as keyof CapabilityMap], ...capabilities[name as keyof CapabilityMap] };
  }

  return {
    environment,
    get ready() {
      return ready();
    },
    has: (capability) => provided.has(capability) && (available?.(capability) ?? true),
    ...(merged as unknown as CapabilityMap),
  };
}
