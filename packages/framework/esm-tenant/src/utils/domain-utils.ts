// ============================================================================
//  @egen/esm-tenant — Utilitaires de domaine (hostname ↔ tenant)
// ============================================================================
//
//  Source UNIQUE de vérité pour toute logique de dérivation "hostname ↔
//  sous-domaine tenant ↔ domaine racine" dans le système EGEN.
//
//  Avant ce module, la même heuristique (imprécise sur les TLD à plusieurs
//  niveaux comme "gov.ga") était réimplémentée indépendamment à 3 endroits :
//  `esm-tenant/context/resolver.ts` (résolution), `esm-tenant-routing-app`
//  (garde de routage) et `esm-primary-navigation-app` (sélecteur de tenant).
//  Un `rootDomain` configuré explicitement (voir `TenantSystemConfig.rootDomain`
//  / `EGEN_TENANT_ROOT_DOMAIN`) ne se propageait donc qu'à l'un des trois.
//
//  Toute nouvelle logique de dérivation de domaine doit vivre ici, jamais
//  être réimplémentée localement dans une app.
// ============================================================================

/** Hôtes toujours considérés comme "localhost" (pas de logique tenant). */
const LOCALHOST_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

/**
 * Détermine si un hostname est un localhost ou une IP privée — dans ce cas,
 * la logique de sous-domaine tenant doit être court-circuitée (dev local).
 */
export function isLocalhostOrIp(hostname: string): boolean {
  if (LOCALHOST_HOSTNAMES.has(hostname)) return true;
  // IPv4 : 192.168.x.x, 10.x.x.x, 172.16-31.x.x, etc.
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) return true;
  return false;
}

/**
 * Déduit le domaine racine depuis un hostname, si aucun `rootDomain`
 * explicite n'est fourni.
 *
 * Règle par défaut (best-effort) : retire le premier segment du hostname.
 * Ex: "lycee-lb.egen.gabon.gov.ga" → "egen.gabon.gov.ga"
 * Pour un domaine à 2 segments ou moins (ex: "egen.gabon.gov.ga" sans
 * sous-domaine), retourne le hostname lui-même.
 *
 * ATTENTION : cette heuristique par défaut est imprécise pour les TLD à
 * plusieurs niveaux (gov.ga, co.uk…) — un hostname comme
 * "mef.egen.gabon.gov.ga" produit correctement "egen.gabon.gov.ga", mais un
 * hostname à un seul niveau de sous-domaine sur un TLD à 2 segments (ex:
 * "acme.co.uk") serait mal découpé. C'est pourquoi un `explicitRootDomain`
 * (résolu depuis `TenantSystemConfig.rootDomain` / `EGEN_TENANT_ROOT_DOMAIN`,
 * voir `config/env.ts`) doit toujours avoir la priorité en production — cette
 * fonction ne sert que de repli quand rien n'est configuré.
 *
 * @param hostname Le hostname à analyser (ex: `window.location.hostname`).
 * @param explicitRootDomain Domaine racine configuré explicitement. S'il est
 *   fourni (non vide), il est retourné tel quel sans heuristique.
 */
export function inferRootDomain(hostname: string, explicitRootDomain?: string): string {
  const trimmed = explicitRootDomain?.trim();
  if (trimmed) return trimmed;

  // Cas spécial : *.localhost (RFC 6761) — convention standard pour tester
  // le multi-tenant par sous-domaine en local sans configuration DNS ni
  // /etc/hosts (les navigateurs résolvent automatiquement tout <x>.localhost
  // vers 127.0.0.1). "localhost" est alors le domaine racine, quel que soit
  // le nombre de labels (ex: "civitas.localhost" → racine "localhost").
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    return 'localhost';
  }

  const parts = hostname.split('.');
  if (parts.length <= 2) return hostname;
  return parts.slice(1).join('.');
}

/**
 * Extrait le premier segment (sous-domaine) d'un hostname par rapport à un
 * domaine racine donné.
 *
 * @returns Le sous-domaine (ex: "lycee-lb"), ou `null` si `hostname` est
 *   exactement `rootDomain` ou n'en est pas un sous-domaine.
 */
export function extractSubdomain(hostname: string, rootDomain: string): string | null {
  if (hostname === rootDomain) return null;
  const suffix = `.${rootDomain}`;
  if (!hostname.endsWith(suffix)) return null;
  const subdomainPart = hostname.slice(0, hostname.length - suffix.length);
  return subdomainPart.split('.')[0] || null;
}

/**
 * Construit l'URL complète d'un sous-domaine tenant, en conservant le
 * protocole et le port courants.
 *
 * @example
 * buildTenantSubdomainUrl('lycee-lb', 'egen.gabon.gov.ga', '/egen/spa/home')
 * // → 'https://lycee-lb.egen.gabon.gov.ga/egen/spa/home'
 */
export function buildTenantSubdomainUrl(tenantSlug: string, rootDomain: string, path: string): string {
  if (typeof window === 'undefined') {
    return `https://${tenantSlug}.${rootDomain}${path}`;
  }
  const protocol = window.location.protocol;
  const port = window.location.port ? `:${window.location.port}` : '';
  return `${protocol}//${tenantSlug}.${rootDomain}${port}${path}`;
}
