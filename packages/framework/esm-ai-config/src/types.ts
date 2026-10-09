// =============================================================================
//  @egen-civitas/esm-ai-config — Types de configuration IA
//
//  Toutes les valeurs proviennent de :
//    1. Variables d'environnement (EGEN_AI_*)
//    2. window.egenAi* (overrides runtime injectés par le serveur)
//    3. Valeurs par défaut sécurisées
//
//  Aucune valeur n'est codée en dur dans le code applicatif.
// =============================================================================

// ─── Configuration principale ─────────────────────────────────────────────────
//
//  Le moteur IA (LLM, modèle, prompt, mémoire, STT/TTS) vit ENTIÈREMENT dans le
//  backend. Le frontend n'est qu'une interface : il ne porte que l'adresse du
//  backend, les réglages de transport et ceux de l'exécution des tools frontend.

export interface AIBackendConfig {
  /**
   * URL du canal temps réel (WebSocket) vers le backend IA.
   * Accepte `ws(s)://…`, `http(s)://…` (converti en ws(s)) ou un chemin relatif
   * (`/api/ai/ws`, résolu sur l'origine courante). `${egenBase}` est substitué.
   * C'est le SEUL point de contact avec le backend IA : conversation, audio,
   * provisionnement des tools frontend, appels de tools et contexte y transitent.
   */
  channelUrl: string;
  /** Intervalle de heartbeat applicatif (ms) — une coupure silencieuse est détectée après 2,5 intervalles */
  heartbeatMs: number;
  /** Délai minimal de reconnexion (ms), croissance exponentielle avec jitter */
  reconnectMinMs: number;
  /** Délai maximal de reconnexion (ms) */
  reconnectMaxMs: number;
  /** Timeout des requêtes sur le canal (ms) */
  requestTimeoutMs: number;
}

export interface AIContextConfig {
  /** Taille maximale du contexte sérialisé envoyé au LLM (en caractères) */
  maxContextSize: number;
  /** Inclure les extensions actives dans le contexte */
  includeActiveExtensions: boolean;
  /** Inclure la navigation (route courante, breadcrumb) dans le contexte */
  includeNavigation: boolean;
  /** Inclure la configuration du module courant dans le contexte */
  includeModuleConfig: boolean;
  /** Inclure les feature flags dans le contexte */
  includeFeatureFlags: boolean;
  /** Profondeur maximale de sérialisation des objets imbriqués */
  serializationDepth: number;
}

export interface AISecurityConfig {
  /** Liste de permissions EGEN requises pour accéder à l'IA */
  requiredPrivileges: string[];
  /** Activer la validation des tools côté client avant exécution */
  validateToolsClient: boolean;
  /** Timeout d'exécution des tools en millisecondes */
  toolTimeoutMs: number;
  /** Activer le logging des actions IA */
  auditLog: boolean;
}

export interface AIObservabilityConfig {
  /** Activer le mode debug (logs verbeux) */
  debug: boolean;
  /** Activer le système d'événements IA */
  eventsEnabled: boolean;
  /** Activer les analytics IA */
  analyticsEnabled: boolean;
  /** Niveau de log ('error' | 'warn' | 'info' | 'debug') */
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

/**
 * Configuration complète du système IA EGEN.
 * Agrégation de tous les sous-groupes de configuration.
 */
export interface AIConfig {
  /** Le système IA est-il activé ? */
  enabled: boolean;
  /** Version du schema de configuration (pour la migration) */
  schemaVersion: string;
  /** Configuration du backend IA */
  backend: AIBackendConfig;
  /** Configuration du contexte global */
  context: AIContextConfig;
  /** Configuration de sécurité et permissions */
  security: AISecurityConfig;
  /** Configuration d'observabilité */
  observability: AIObservabilityConfig;
}

// ─── Config partielle pour les overrides ─────────────────────────────────────

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export type PartialAIConfig = DeepPartial<AIConfig>;

// ─── Store ────────────────────────────────────────────────────────────────────

export interface AIConfigStore {
  /** Configuration résolue et validée */
  config: AIConfig;
  /** Configuration chargée ? */
  loaded: boolean;
  /** Erreurs de validation */
  errors: string[];
  /** Source de la configuration ('env' | 'runtime' | 'override') */
  source: 'env' | 'runtime' | 'override' | 'default';
}
