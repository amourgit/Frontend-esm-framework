// =============================================================================
//  @egen/esm-ai-context — Context Builder
//
//  Agrège tous les stores EGEN dans une représentation sérialisable stable.
//  N'expose JAMAIS les stores internes directement.
//  Accède aux stores via leurs APIs publiques (getState(), not subscribe).
// =============================================================================

import { sessionStore, getTenantId, isMultiTenant } from '@egen/esm-api';
import { getAIConfig } from '@egen/esm-ai-config';
import { AI_EVENTS, dispatchAIEvent } from '@egen/esm-ai-events';
import { collectProviderData } from './provider-registry';
import type { AIContext, AINavigationContext, AIPermissionsContext, AIExtensionContext } from './types';

const SCHEMA_VERSION = '1.0.0';

// ─── Helpers de sérialisation sûre ───────────────────────────────────────────

/**
 * Tronque récursivement un objet pour respecter la profondeur maximale.
 * Évite la sérialisation de références circulaires ou de structures profondes.
 */
function truncateDepth(obj: unknown, maxDepth: number, currentDepth = 0): unknown {
  if (currentDepth >= maxDepth) return '[truncated]';
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.slice(0, 20).map((item) => truncateDepth(item, maxDepth, currentDepth + 1));
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as object).slice(0, 30)) {
    result[key] = truncateDepth(value, maxDepth, currentDepth + 1);
  }
  return result;
}

/**
 * Sérialise en JSON et tronque si nécessaire.
 */
function safeSerialize(context: AIContext, maxSize: number): { json: string; truncated: boolean } {
  const json = JSON.stringify(context, null, 0);
  if (json.length <= maxSize) return { json, truncated: false };

  // Tronquer progressivement les parties les plus volumineuses
  const truncated = {
    ...context,
    appContext: { _truncated: true, _originalSize: json.length },
    extensions: { activeSlots: {} },
    navigation: {
      ...context.navigation,
      recentRoutes: context.navigation.recentRoutes.slice(0, 3),
    },
  };

  return { json: JSON.stringify(truncated, null, 0), truncated: true };
}

// ─── Lecture des stores EGEN ─────────────────────────────────────────────────

function buildUserContext(): AIContext['user'] {
  const state = sessionStore.getState();
  if (!state.loaded || !state.session?.authenticated || !state.session.user) {
    return null;
  }
  const user = state.session.user;
  return {
    uuid: user.uuid,
    display: user.display,
    username: user.username,
    locale: user.locale ?? 'fr',
    roles: user.roles?.map((r) => r.name) ?? [],
    privileges: user.privileges?.map((p) => p.display) ?? [],
    properties: (() => {
      const props = user.userProperties ?? {};
      // Exclure les données sensibles
      const { recentlyViewed, bookmarkedGroups, defaultLocation, ...safe } = props;
      return safe as Record<string, string>;
    })(),
  };
}

function buildPermissionsContext(): AIPermissionsContext {
  const state = sessionStore.getState();
  const session = state.loaded ? state.session : null;
  const user = session?.user;

  // Lire les feature flags depuis localStorage (même pattern que esm-feature-flags)
  const featureFlags: Record<string, boolean> = {};
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('egen:feature-flag:')) {
        const flagName = key.replace('egen:feature-flag:', '');
        featureFlags[flagName] = localStorage.getItem(key) === 'true';
      }
    }
  } catch {
    // localStorage non disponible (tests, SSR)
  }

  return {
    authenticated: session?.authenticated ?? false,
    roles: user?.roles?.map((r) => r.name) ?? [],
    privileges: user?.privileges?.map((p) => p.display) ?? [],
    featureFlags,
  };
}

/**
 * Construit le contexte tenant à partir de l'API synchrone canonique de
 * @egen/esm-api (getTenantId/isMultiTenant) — le même point d'accès que
 * celui utilisé par egenFetch pour injecter X-Tenant-ID. Zéro dépendance
 * directe sur @egen/esm-tenant, zéro accès spéculatif à des globals window
 * non garantis (voir historique de cette fonction avant le 8 août 2026).
 *
 * `null` en mode "off" ET quand aucun tenant n'est encore capturé (ex: URL
 * sur le domaine racine, sans sous-domaine) — dans les deux cas, il n'y a
 * simplement rien à exposer au LLM.
 */
function buildTenantContext(): AIContext['tenant'] {
  const tenantId = getTenantId();
  if (!tenantId) return null;

  return {
    id: tenantId,
    mode: isMultiTenant() ? 'multi' : 'single',
  };
}

function buildNavigationContext(): AINavigationContext {
  const spaBase = typeof window !== 'undefined' ? (window as any).getEgenSpaBase?.() ?? '/' : '/';
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
  const currentRoute = pathname.startsWith(spaBase) ? pathname.slice(spaBase.length) || '/' : pathname;

  // Lire l'historique de navigation depuis sessionStorage
  const recentRoutes: string[] = [];
  try {
    const history: string[] = JSON.parse(sessionStorage.getItem('egen:history') ?? '[]');
    recentRoutes.push(
      ...history.slice(-5).map((url) => {
        try {
          return new URL(url).pathname;
        } catch {
          return url;
        }
      }),
    );
  } catch {
    // sessionStorage non disponible
  }

  return {
    currentRoute,
    currentUrl: typeof window !== 'undefined' ? window.location.href : '',
    breadcrumb: [], // Enrichi par les Context Providers
    activeAppName: undefined, // Enrichi par les Context Providers
    recentRoutes,
  };
}

function buildExtensionsContext(): AIExtensionContext {
  // Lire les extensions actives depuis le store global (si disponible)
  try {
    const stores = (window as any).stores;
    const extStore = stores?.['extensions'];
    if (extStore) {
      const state = extStore.value.getState();
      const activeSlots: Record<string, string[]> = {};
      for (const [slotName, slot] of Object.entries(state.slots ?? {})) {
        const assigned = (slot as any).assignedExtensions ?? [];
        if (assigned.length > 0) {
          activeSlots[slotName] = assigned.map((e: any) => e.name);
        }
      }
      return { activeSlots };
    }
  } catch {
    // Store extensions non disponible
  }
  return { activeSlots: {} };
}

// ─── Builder principal ────────────────────────────────────────────────────────

/**
 * Construit le contexte IA complet depuis tous les stores EGEN.
 * Cette fonction est pure — elle n'a aucun effet de bord.
 * Elle peut être appelée à tout moment pour obtenir un snapshot du contexte.
 */
export function buildAIContext(): { context: AIContext; contextJson: string; truncated: boolean; size: number } {
  const config = getAIConfig();
  const appContext = collectProviderData();

  const emptyNavigation: AINavigationContext = {
    currentRoute: '',
    currentUrl: '',
    breadcrumb: [],
    activeAppName: undefined,
    recentRoutes: [],
  };

  const permissions = buildPermissionsContext();

  const context: AIContext = {
    schemaVersion: SCHEMA_VERSION,
    builtAt: new Date().toISOString(),
    user: buildUserContext(),
    tenant: buildTenantContext(),
    navigation: config.context.includeNavigation ? buildNavigationContext() : emptyNavigation,
    permissions: config.context.includeFeatureFlags ? permissions : { ...permissions, featureFlags: {} },
    extensions: config.context.includeActiveExtensions ? buildExtensionsContext() : { activeSlots: {} },
    appContext: truncateDepth(appContext, config.context.serializationDepth) as Record<string, unknown>,
  };

  const { json, truncated } = safeSerialize(context, config.context.maxContextSize);

  dispatchAIEvent(AI_EVENTS.CONTEXT_BUILT, {
    contextSize: json.length,
    providerCount: Object.keys(appContext).length,
    truncated,
  });

  return { context, contextJson: json, truncated, size: json.length };
}
