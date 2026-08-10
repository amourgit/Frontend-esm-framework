// =============================================================================
//  @egen/esm-ai-context — Types du contexte IA
// =============================================================================

// ─── Représentations stables (sérialisables) ──────────────────────────────────

export interface AIUserContext {
  uuid: string;
  display: string;
  username: string;
  locale: string;
  roles: string[];
  privileges: string[];
  /** Propriétés utilisateur (sans données sensibles) */
  properties: Record<string, string>;
}

/**
 * Contexte tenant — refonte du 8 août 2026 : le frontend ne connaît plus
 * QUE l'ID brut du tenant capturé (URL/JWT/storage…), sans aucune
 * métadonnée locale (nom, locale, timezone, feature flags). Ce concept de
 * registry de tenants a été supprimé — voir @egen/esm-tenant/src/types.ts.
 * `mode` ne peut valoir que "single" | "multi" ici : en mode "off" ou sans
 * tenant capturé, `AIContext.tenant` est `null` (voir buildTenantContext()).
 */
export interface AITenantContext {
  id: string;
  mode: 'single' | 'multi';
}

export interface AINavigationContext {
  /** Route courante (chemin relatif au SPA base) */
  currentRoute: string;
  /** URL complète */
  currentUrl: string;
  /** Fil d'Ariane textuel (fourni par les apps via providers) */
  breadcrumb: string[];
  /** Nom de l'app active (moduleName Single-SPA) */
  activeAppName?: string;
  /** Historique de navigation récent (5 dernières routes) */
  recentRoutes: string[];
}

export interface AIExtensionContext {
  /** Extensions actives dans les slots */
  activeSlots: Record<string, string[]>;
}

export interface AIPermissionsContext {
  /** L'utilisateur est-il authentifié ? */
  authenticated: boolean;
  /** Rôles de l'utilisateur */
  roles: string[];
  /** Privilèges de l'utilisateur */
  privileges: string[];
  /** Feature flags actifs */
  featureFlags: Record<string, boolean>;
}

/**
 * Contexte global EGEN sérialisé, envoyé au backend IA.
 * Toutes les valeurs sont sûres à sérialiser en JSON.
 * Aucune référence circulaire, aucune fonction, aucun store exposé directement.
 */
export interface AIContext {
  /** Version du schéma de contexte */
  schemaVersion: string;
  /** Timestamp de construction */
  builtAt: string;
  /** Contexte utilisateur */
  user: AIUserContext | null;
  /** Contexte tenant */
  tenant: AITenantContext | null;
  /** Contexte de navigation */
  navigation: AINavigationContext;
  /** Contexte des permissions */
  permissions: AIPermissionsContext;
  /** Contexte des extensions actives */
  extensions: AIExtensionContext;
  /** Données injectées par les Context Providers des apps */
  appContext: Record<string, unknown>;
}

// ─── Context Providers ────────────────────────────────────────────────────────

/**
 * Contrat d'un Context Provider.
 * Les apps enregistrent des providers pour enrichir le contexte IA.
 *
 * @example
 * ```ts
 * registerAIContextProvider({
 *   id: 'grades-app:current-student',
 *   name: 'Étudiant courant',
 *   priority: 10,
 *   provide: () => ({
 *     student: { uuid: '...', name: 'Alice', group: '3eB' }
 *   }),
 *   subscribe: (callback) => {
 *     return studentStore.subscribe((s) => callback({ student: s.current }));
 *   }
 * });
 * ```
 */
export interface AIContextProvider {
  /** Identifiant unique du provider */
  id: string;
  /** Nom lisible pour le debugging */
  name: string;
  /**
   * Priorité d'exécution (plus élevé = exécuté en premier).
   * En cas de conflit de clé, le provider de plus haute priorité gagne.
   */
  priority?: number;
  /**
   * Retourne les données à injecter dans `AIContext.appContext`.
   * Doit être synchrone et ne jamais throw.
   */
  provide: () => Record<string, unknown>;
  /**
   * Optionnel — s'abonne aux changements et notifie le context builder.
   * @returns Fonction de désinscription.
   */
  subscribe?: (onChange: () => void) => () => void;
}

// ─── Store du contexte ────────────────────────────────────────────────────────

export interface AIContextStore {
  /** Contexte IA construit (null avant la première construction) */
  context: AIContext | null;
  /**
   * Version JSON du contexte, DÉJÀ tronquée selon `config.context.maxContextSize`
   * (voir `buildAIContext()` → `safeSerialize()`). C'est cette valeur — et
   * jamais un `JSON.stringify(context)` ad hoc — qui doit être envoyée au
   * backend IA, pour que la troncature soit réellement effective.
   */
  contextJson: string;
  /** En cours de construction */
  building: boolean;
  /** Nombre de providers enregistrés */
  providerCount: number;
  /** Taille du contexte sérialisé (en caractères) */
  contextSize: number;
  /** Le contexte a-t-il été tronqué ? */
  truncated: boolean;
}
