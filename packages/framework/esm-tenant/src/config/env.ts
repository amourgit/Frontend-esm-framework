// ============================================================================
//  @egen/esm-tenant — Résolution de la configuration depuis l'environnement
// ============================================================================
//
//  Ce projet est construit avec rspack (pas Vite) : il n'y a pas
//  d'`import.meta.env` réellement peuplé dans le bundle produit, et un accès
//  dynamique par clé (`import.meta.env[key]`) ne serait de toute façon pas
//  remplaçable par un `DefinePlugin` (qui ne fait que du remplacement
//  textuel statique d'expressions littérales). C'est le même principe déjà
//  documenté pour `process.env[key]` dans `esm-ai-config/src/defaults.ts`.
//
//  La configuration passe donc par un unique canal : des variables globales
//  `window.egenTenant*`, injectées côté serveur/build dans `index.html` par
//  le shell (`esm-app-shell/rspack.config.js` + `src/index.ejs`), sur le
//  modèle exact du pont déjà utilisé pour `EGEN_AI_*` → `window.egenAi*`.
//
//  VARIABLE D'ENVIRONNEMENT (.env, lue côté build par le shell)  →  GLOBAL RUNTIME
//  ──────────────────────────────────────────────────────────────────────────────
//  EGEN_TENANT_MODE               → window.egenTenantMode
//    "off" | "single" | "multi" — contrôle global du système. "off" = désactivé.
//
//  EGEN_TENANT_ID                 → window.egenTenantId
//    string — en mode "single", identifiant du tenant forcé.
//
//  EGEN_TENANT_PERSIST            → window.egenTenantPersist
//    "true" | "false" — persistance localStorage du tenant actif. Défaut: "true".
//
//  EGEN_TENANT_RESOLUTION_ORDER   → window.egenTenantResolutionOrder
//    string (CSV) ex: "subdomain,jwt,localStorage"
//
//  EGEN_TENANT_PATH_PREFIX        → window.egenTenantPathPrefix
//    string ex: "/t/" — préfixe de path pour la stratégie "path".
//
//  EGEN_TENANT_JWT_CLAIM          → window.egenTenantJwtClaim
//    string ex: "tenantId" | "tid" | "org"
//
//  EGEN_TENANT_ROOT_DOMAIN        → window.egenTenantRootDomain
//    string ex: "egen.gabon.gov.ga" — domaine racine explicite, utilisé par
//    toute logique de dérivation hostname ↔ tenant (voir utils/domain-utils.ts).
//
//  Voir les types `Window` étendus dans `@egen/esm-globals` pour la
//  déclaration TypeScript de chacun de ces globals.
//
//  Pas de EGEN_TENANT_REGISTRY_URL / EGEN_TENANT_THEME_APPLY ici : il n'y a
//  plus de registry de tenants ni de thème piloté par tenant côté frontend
//  (voir types.ts pour la philosophie de cette refonte).
// ============================================================================

import type { TenantMode, TenantResolutionStrategy, TenantSystemConfig } from '../types';

/** Lit une valeur de config depuis `window.<key>`, ou `undefined` si absente/vide. */
function win(key: string): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const v = (window as unknown as Record<string, unknown>)[key];
  if (v !== undefined && v !== null && v !== '') return String(v);
  return undefined;
}

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value.toLowerCase() !== 'false' && value !== '0';
}

function parseTenantMode(value: string | undefined): TenantMode {
  if (value === 'single' || value === 'multi' || value === 'off') return value;
  return 'off';
}

function parseResolutionOrder(value: string | undefined): TenantResolutionStrategy[] | undefined {
  if (!value) return undefined;
  const valid: TenantResolutionStrategy[] = ['subdomain', 'path', 'query', 'jwt', 'header', 'localStorage', 'static'];
  const parsed = value
    .split(',')
    .map((s) => s.trim() as TenantResolutionStrategy)
    .filter((s) => valid.includes(s));
  return parsed.length > 0 ? parsed : undefined;
}

/**
 * Résout la configuration du système tenant depuis les globals `window.egenTenant*`
 * (voir en-tête de fichier). Les valeurs lues ici sont des valeurs par défaut
 * qui peuvent être surchargées par la config passée explicitement à
 * `setupTenantSystem({...})` (priorité maximale, voir setup.ts).
 */
export function resolveConfigFromEnv(): Partial<TenantSystemConfig> {
  const mode = parseTenantMode(win('egenTenantMode'));
  const defaultTenantId = win('egenTenantId');
  const persistActive = parseBool(win('egenTenantPersist'), true);
  const resolutionOrder = parseResolutionOrder(win('egenTenantResolutionOrder'));
  const pathPrefix = win('egenTenantPathPrefix');
  const jwtClaim = win('egenTenantJwtClaim');
  const rootDomain = win('egenTenantRootDomain');

  const config: Partial<TenantSystemConfig> = {
    mode,
    persistActive,
  };

  if (defaultTenantId) config.defaultTenantId = defaultTenantId;
  if (resolutionOrder) config.resolutionOrder = resolutionOrder;
  if (pathPrefix) config.pathConfig = { prefix: pathPrefix };
  if (jwtClaim) config.jwtConfig = { claim: jwtClaim };
  if (rootDomain) config.rootDomain = rootDomain;

  return config;
}

/**
 * Retourne true si le système tenant est activé selon la configuration
 * d'environnement (avant même que `setupTenantSystem()` ait été appelé).
 * Utile pour des décisions de branching très précoces (ex: dans index.html).
 */
export function isTenantModeEnabledFromEnv(): boolean {
  return parseTenantMode(win('egenTenantMode')) !== 'off';
}
