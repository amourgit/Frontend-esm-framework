// ============================================================================
//  @egen/esm-tenant — Stratégies de capture du tenant actif
// ============================================================================
//
//  Chaque stratégie tente d'extraire un TenantId BRUT depuis une source.
//  Retourne undefined si la source est absente ou vide. AUCUNE stratégie
//  ne vérifie la valeur trouvée contre une liste de tenants "connus" — ce
//  concept n'existe plus côté frontend (voir types.ts). On capture, un
//  point c'est tout ; la validité du tenant est une question backend.
//
//  ORDRE PAR DÉFAUT (du plus déterministe au plus générique) :
//  1. subdomain  — le plus déterministe, sans ambiguïté
//  2. path       — clair mais nécessite une config de routing côté app
//  3. query      — utile pour le dev / preview
//  4. jwt        — lecture du claim dans le token de session
//  5. header     — reprend en localStorage le tenant déjà connu côté
//                   client au moment du login (ne lit PAS un header HTTP
//                   réel — voir TenantResolutionStrategy dans types.ts)
//  6. localStorage — survie aux rechargements
//  7. static     — config globale window / env
// ============================================================================

import type { TenantId, TenantResolutionStrategy, TenantSystemConfig } from '../types';
import { isLocalhostOrIp, inferRootDomain, extractSubdomain } from '../utils/domain-utils';

// ---------------------------------------------------------------------------
// Stratégies individuelles
// ---------------------------------------------------------------------------

/** Capture par subdomain de window.location.hostname, par rapport à un rootDomain. */
function resolveBySubdomain(rootDomain?: string): TenantId | undefined {
  if (typeof window === 'undefined') return undefined;
  const hostname = window.location.hostname;
  if (isLocalhostOrIp(hostname)) return undefined;

  const effectiveRoot = inferRootDomain(hostname, rootDomain);
  const subdomain = extractSubdomain(hostname, effectiveRoot);

  // Diagnostic : un rootDomain a été EXPLICITEMENT configuré mais ne
  // correspond pas du tout au hostname courant (ni égal, ni suffixe) — la
  // stratégie "subdomain" ne pourra JAMAIS rien capturer tant que ce n'est
  // pas corrigé, quel que soit le sous-domaine réellement utilisé dans
  // l'URL. Sans ce warning, ce cas échoue en silence (retourne juste
  // undefined) et passe pour "aucun tenant dans l'URL" au lieu d'être
  // identifié comme une erreur de configuration.
  if (
    process.env.NODE_ENV !== 'production' &&
    rootDomain &&
    hostname !== effectiveRoot &&
    !hostname.endsWith(`.${effectiveRoot}`)
  ) {
    // eslint-disable-next-line no-console
    console.warn(
      `[egen/esm-tenant] ⚠️ EGEN_TENANT_ROOT_DOMAIN="${effectiveRoot}" configuré, mais le hostname ` +
        `courant "${hostname}" n'en est pas un sous-domaine. La stratégie "subdomain" ne capturera ` +
        `jamais rien ici tant que rootDomain n'est pas corrigé (ou retiré pour utiliser la détection ` +
        `automatique).`,
    );
  }

  return subdomain ?? undefined;
}

/**
 * Capture par segment de path URL. Ne capture QUE si un `prefix` explicite
 * est configuré (ex: "/t/") — sans convention connue, cette stratégie
 * retourne undefined plutôt que de deviner un "premier segment" générique.
 *
 * Une ancienne variante devinait le premier segment du path en l'absence de
 * préfixe configuré (ex: `parts[0]`) — dangereux dans une app single-spa où
 * TOUT pathname a un premier segment "significatif" qui n'est presque
 * jamais un tenant (ex: "/egen/spa/home" → aurait capturé "egen", le SPA
 * base lui-même, comme si c'était un tenant). Corrigé le 9 août 2026.
 */
function resolveByPath(config?: TenantSystemConfig['pathConfig']): TenantId | undefined {
  if (typeof window === 'undefined') return undefined;
  const prefix = config?.prefix;
  if (!prefix) return undefined;

  const spaBase =
    typeof (window as unknown as { getEgenSpaBase?: () => string }).getEgenSpaBase === 'function'
      ? (window as unknown as { getEgenSpaBase: () => string }).getEgenSpaBase()
      : '';
  let pathname = window.location.pathname;
  if (spaBase && pathname.startsWith(spaBase)) {
    pathname = pathname.slice(spaBase.length) || '/';
  }

  if (!pathname.startsWith(prefix)) return undefined;
  const rest = pathname.slice(prefix.length);
  const slug = rest.split('/')[0];
  return slug || undefined;
}

/** Capture par query param ?tenant= */
function resolveByQuery(): TenantId | undefined {
  if (typeof window === 'undefined') return undefined;
  const params = new URLSearchParams(window.location.search);
  const value = params.get('tenant') ?? params.get('tenantId') ?? params.get('tid');
  return value || undefined;
}

/** Capture depuis la valeur reportée en localStorage lors du login (voir storeHeaderTenantId) */
function resolveByHeader(storageKey: string): TenantId | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const value = window.localStorage.getItem(`${storageKey}:header`);
    return value || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Capture depuis un claim JWT.
 * Le JWT est lu depuis le localStorage/sessionStorage (clé : "egen:session:token").
 * On ne fait QUE lire le payload — aucune vérification de signature côté frontend
 * (c'est le rôle du backend, à chaque requête authentifiée).
 */
function resolveByJwt(jwtConfig?: TenantSystemConfig['jwtConfig']): TenantId | undefined {
  const claim = jwtConfig?.claim ?? 'tenantId';
  const token = readTokenFromStorage();
  if (!token) return undefined;

  try {
    const payload = parseJwtPayload(token);
    const value = payload?.[claim] ?? payload?.['tid'] ?? payload?.['tenant_id'];
    return value ? String(value) : undefined;
  } catch {
    return undefined;
  }
}

function readTokenFromStorage(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const candidates = [
      localStorage.getItem('egen:session:token'),
      sessionStorage.getItem('egen:session:token'),
      localStorage.getItem('token'),
    ];
    for (const candidate of candidates) {
      if (candidate) return candidate.replace(/^Bearer\s+/i, '');
    }
  } catch {
    // Accès storage refusé
  }
  return undefined;
}

function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Capture depuis localStorage (persistence entre rechargements) */
function resolveByLocalStorage(storageKey: string): TenantId | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const value = window.localStorage.getItem(storageKey);
    return value || undefined;
  } catch {
    return undefined;
  }
}

/** Capture depuis une config statique (window.egenTenantId, voir config/env.ts) */
function resolveByStatic(defaultTenantId?: string): TenantId | undefined {
  const fromWindow =
    typeof window !== 'undefined'
      ? ((window as unknown as Record<string, unknown>)['egenTenantId'] as string | undefined)
      : undefined;

  return defaultTenantId ?? fromWindow ?? undefined;
}

// ---------------------------------------------------------------------------
// Résolveur principal
// ---------------------------------------------------------------------------

const DEFAULT_RESOLUTION_ORDER: TenantResolutionStrategy[] = [
  'subdomain',
  'path',
  'query',
  'jwt',
  'header',
  'localStorage',
  'static',
];

/**
 * Tente de capturer le tenant actif en essayant les stratégies dans l'ordre
 * défini par la config. Retourne le premier couple (TenantId, stratégie)
 * trouvé, brut, sans aucune vérification de validité.
 */
export function resolveActiveTenantId(
  config: TenantSystemConfig,
): { tenantId: TenantId; source: TenantResolutionStrategy } | undefined {
  const order = config.resolutionOrder ?? DEFAULT_RESOLUTION_ORDER;
  const storageKey = config.storageKey ?? 'egen:tenant:active';

  for (const strategy of order) {
    let result: TenantId | undefined;

    switch (strategy) {
      case 'subdomain':
        result = resolveBySubdomain(config.rootDomain);
        break;
      case 'path':
        result = resolveByPath(config.pathConfig);
        break;
      case 'query':
        result = resolveByQuery();
        break;
      case 'jwt':
        result = resolveByJwt(config.jwtConfig);
        break;
      case 'header':
        result = resolveByHeader(storageKey);
        break;
      case 'localStorage':
        result = resolveByLocalStorage(storageKey);
        break;
      case 'static':
        result = resolveByStatic(config.defaultTenantId);
        break;
    }

    if (result) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.info(`[egen/esm-tenant] ✅ Tenant capturé via stratégie "${strategy}": "${result}"`);
      }
      return { tenantId: result, source: strategy };
    }
  }

  return undefined;
}

/**
 * Persiste le tenant actif en localStorage.
 * Appelé automatiquement après chaque capture si `persistActive: true`.
 */
export function persistActiveTenant(tenantId: TenantId, storageKey: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey, tenantId);
  } catch {
    // Quota dépassé, mode privé, etc. — non bloquant
  }
}

/**
 * Efface le tenant persisté en localStorage (ex: lors d'un switchTenant vers `null`).
 */
export function clearPersistedTenant(storageKey: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // ignore
  }
}

/**
 * Stocke la valeur du tenant déjà connu côté client au moment du login,
 * pour qu'elle soit relue par la stratégie "header" aux prochains chargements.
 * À appeler dans le flux de login juste après une authentification réussie.
 */
export function storeHeaderTenantId(tenantId: TenantId, storageKey: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${storageKey}:header`, tenantId);
  } catch {
    // ignore
  }
}
