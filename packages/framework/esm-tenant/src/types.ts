// ============================================================================
//  @egen/esm-tenant — Types publics
// ============================================================================
//
//  PHILOSOPHIE DU SYSTÈME (refonte du 8 août 2026) :
//  ─────────────────────────────────────────────────
//  Ce package a UNE seule responsabilité : CAPTURER l'identifiant du tenant
//  depuis l'URL (ou une autre source côté client) et le RENDRE DISPONIBLE
//  globalement (store Zustand + window) pour que le reste du frontend
//  (et notamment le client HTTP central, `@egen/esm-api`) puisse le
//  consulter et l'envoyer au backend.
//
//  Ce package NE FAIT AUCUNE VALIDATION. Il ne sait pas si un tenant
//  "existe", s'il est "suspendu", ni quelles apps/permissions/thème lui
//  sont associés — il n'y a plus de registry locale de tenants connus.
//  TOUTE validation (existence, statut, permissions, thème, données
//  métier associées au tenant) est une responsabilité BACKEND. Le frontend
//  fait des appels API normaux avec le header `X-Tenant-ID` déjà injecté
//  (voir `@egen/esm-api`) ; si le tenant n'existe pas ou n'est pas
//  autorisé, c'est une réponse HTTP d'erreur normale, gérée comme
//  n'importe quelle autre erreur API — pas une branche spéciale ici.
//
//  Ancienne architecture (registry statique `TenantDefinition[]`,
//  vérifications `suspended`/`allowedApps`/`permissions`/`featureFlags`
//  côté frontend) : SUPPRIMÉE. Elle imposait de maintenir une liste
//  figée de tenants connus (fichier JSON à éditer manuellement à chaque
//  nouvel enregistrement), ce qui est incompatible avec un enregistrement
//  dynamique des tenants côté backend. Voir docs/analyse-esm-tenant.md
//  pour l'historique complet de cette décision.
//
//  RÉSOLUTION DU TENANT (par ordre de priorité décroissante, configurable) :
//  ─────────────────────────────────────────────────────────────
//  1. URL subdomain  : acme.egen.gabon.gov.ga → tenantId = "acme"
//  2. URL path       : /t/acme/dashboard → tenantId = "acme"
//  3. Query param    : ?tenant=acme
//  4. JWT claim      : token.tenantId ou token.tid
//  5. header         : report post-login (voir storeHeaderTenantId())
//  6. localStorage   : egen:tenant:active (survie aux rechargements)
//  7. static         : window.egenTenantId (config statique)
//
//  Chaque stratégie retourne la valeur BRUTE trouvée, telle quelle, sans
//  aucune vérification qu'elle correspond à un tenant "connu" — il n'y a
//  justement plus rien de tel à consulter côté frontend.
// ============================================================================

// ---------------------------------------------------------------------------
// Identité d'un tenant
// ---------------------------------------------------------------------------

/** Identifiant du tenant — valeur brute capturée (slug URL-safe attendu, non vérifié) */
export type TenantId = string;

/**
 * État du système tenant.
 * - `"off"`    : mode "off", système désactivé
 * - `"idle"`   : mode actif mais aucun tenant capturé pour l'instant (ex: URL globale sans sous-domaine)
 * - `"active"` : un tenant est actuellement capturé
 */
export type TenantStatus = 'off' | 'idle' | 'active';

// ---------------------------------------------------------------------------
// Configuration du système tenant
// ---------------------------------------------------------------------------

/**
 * Mode de fonctionnement du système tenant.
 *
 * - `"off"`    : système désactivé, aucune logique tenant, apps fonctionnent normalement
 * - `"single"` : un seul tenant actif, forcé par `defaultTenantId` (pas de résolution dynamique)
 * - `"multi"`  : résolution dynamique du tenant au runtime (URL, storage, JWT…)
 */
export type TenantMode = 'off' | 'single' | 'multi';

/**
 * Stratégies de capture du tenant actif, triées par priorité.
 * Chaque stratégie est essayée dans l'ordre jusqu'à ce qu'une réussisse.
 * Chacune retourne une valeur BRUTE (non vérifiée) — voir en-tête de fichier.
 */
export type TenantResolutionStrategy =
  | 'subdomain' // Lit le subdomain de window.location.hostname
  | 'path' // Lit un segment /t/{id}/ ou /{id}/ dans window.location.pathname
  | 'query' // Lit ?tenant= dans window.location.search
  | 'jwt' // Lit le claim tenantId/tid dans le JWT de session
  | 'header' // Relit en localStorage le tenant déjà connu côté client au moment
  // du login (voir storeHeaderTenantId()). ATTENTION : malgré son nom, cette
  // stratégie ne lit JAMAIS un en-tête HTTP réel renvoyé par le backend —
  // c'est un simple report post-login d'une valeur déjà connue côté client
  // (utile pour survivre à un rechargement quand aucune autre stratégie ne
  // s'applique).
  | 'localStorage' // Lit egen:tenant:active depuis localStorage
  | 'static'; // Lit window.egenTenantId (voir config/env.ts)

/** Configuration du chemin URL pour la stratégie "path" */
export interface TenantPathConfig {
  /**
   * Préfixe de path attendu (ex: "/t/" pour /t/acme/...), après retrait du
   * SPA base (window.getEgenSpaBase()). Si absent, la stratégie "path" ne
   * capture RIEN — voir context/resolver.ts pour la justification : deviner
   * un "premier segment" sans convention explicite confondrait un vrai
   * segment de route (ex: "/home", "/patient") avec un slug de tenant.
   */
  prefix?: string;
}

/** Configuration de la capture JWT */
export interface TenantJwtConfig {
  /** Nom du claim JWT contenant l'ID tenant (ex: "tenantId", "tid", "org") */
  claim: string;
}

/** Configuration complète du système tenant */
export interface TenantSystemConfig {
  /**
   * Mode de fonctionnement du système.
   * Peut être surchargé par `EGEN_TENANT_MODE` (.env), relayé au runtime via
   * `window.egenTenantMode` — voir `config/env.ts`.
   *
   * @default "off"
   */
  mode: TenantMode;

  /**
   * Ordre des stratégies de capture du tenant actif.
   * Seule la première stratégie ayant trouvé une valeur est utilisée.
   *
   * @default ["subdomain", "path", "query", "jwt", "header", "localStorage", "static"]
   */
  resolutionOrder?: TenantResolutionStrategy[];

  /** Configuration pour la stratégie "path" */
  pathConfig?: TenantPathConfig;

  /** Configuration pour la stratégie "jwt" */
  jwtConfig?: TenantJwtConfig;

  /**
   * En mode "single", identifiant du tenant forcé.
   * Si non défini, cherché dans `window.egenTenantId` (EGEN_TENANT_ID).
   */
  defaultTenantId?: TenantId;

  /**
   * Domaine racine explicite utilisé pour extraire un sous-domaine tenant
   * (ex: "egen.gabon.gov.ga"). Sert de source unique de vérité pour toute
   * dérivation hostname → tenant ailleurs dans le système (guard de
   * routage, sélecteur de tenant) — voir `utils/domain-utils.ts`.
   *
   * Si absent, une heuristique best-effort est utilisée (retire le premier
   * label du hostname), imprécise sur les TLD à plusieurs niveaux
   * (ex: "gov.ga"). Recommandé en production.
   *
   * Surchargé par `window.egenTenantRootDomain` (EGEN_TENANT_ROOT_DOMAIN).
   */
  rootDomain?: string;

  /**
   * Si true, persist le tenant actif en localStorage pour survie aux rechargements.
   * @default true
   */
  persistActive?: boolean;

  /**
   * Clé localStorage utilisée pour la persistence.
   * @default "egen:tenant:active"
   */
  storageKey?: string;

  /**
   * Callback appelé à chaque changement de tenant actif (y compris la
   * capture initiale et le passage à `null`).
   */
  onTenantChange?: (tenantId: TenantId | null, source: TenantResolutionStrategy | null) => void;
}

// ---------------------------------------------------------------------------
// Store state
// ---------------------------------------------------------------------------

/** État du store global du système tenant */
export interface TenantStore {
  /** Mode actif résolu au runtime */
  mode: TenantMode;

  /** Statut courant */
  status: TenantStatus;

  /** Identifiant du tenant actuellement capturé (null si aucun ou mode "off") */
  tenantId: TenantId | null;

  /** Stratégie ayant permis la capture (null si aucun tenant capturé) */
  source: TenantResolutionStrategy | null;

  /** Timestamp de la dernière capture réussie */
  resolvedAt: number | null;

  /** Configuration active du système */
  config: TenantSystemConfig;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/** Payload de l'événement DOM `esm:tenant-changed`, émis à chaque capture/changement. */
export interface TenantChangedEvent {
  tenantId: TenantId | null;
  previousTenantId: TenantId | null;
  source: TenantResolutionStrategy | null;
}
