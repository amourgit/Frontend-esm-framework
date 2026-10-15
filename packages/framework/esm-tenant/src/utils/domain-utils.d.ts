/**
 * Détermine si un hostname est un localhost ou une IP privée — dans ce cas,
 * la logique de sous-domaine tenant doit être court-circuitée (dev local).
 */
export declare function isLocalhostOrIp(hostname: string): boolean;
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
export declare function inferRootDomain(hostname: string, explicitRootDomain?: string): string;
/**
 * Extrait le premier segment (sous-domaine) d'un hostname par rapport à un
 * domaine racine donné.
 *
 * @returns Le sous-domaine (ex: "lycee-lb"), ou `null` si `hostname` est
 *   exactement `rootDomain` ou n'en est pas un sous-domaine.
 */
export declare function extractSubdomain(hostname: string, rootDomain: string): string | null;
/**
 * Construit l'URL complète d'un sous-domaine tenant, en conservant le
 * protocole et le port courants.
 *
 * @example
 * buildTenantSubdomainUrl('lycee-lb', 'egen.gabon.gov.ga', '/egen-civitas/spa/home')
 * // → 'https://lycee-lb.egen.gabon.gov.ga/egen-civitas/spa/home'
 */
export declare function buildTenantSubdomainUrl(tenantSlug: string, rootDomain: string, path: string): string;
//# sourceMappingURL=domain-utils.d.ts.map