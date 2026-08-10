// =============================================================================
//  @egen/esm-ai-config — Types de configuration IA
//
//  Toutes les valeurs proviennent de :
//    1. Variables d'environnement (EGEN_AI_*)
//    2. window.egenAi* (overrides runtime injectés par le serveur)
//    3. Valeurs par défaut sécurisées
//
//  Aucune valeur n'est codée en dur dans le code applicatif.
// =============================================================================

// ─── Provider ──────────────────────────────────────────────────────────────────

/** Fournisseurs LLM supportés par le backend EGEN IA */
export type AIProvider = 'gemini' | 'claude' | 'openai' | 'ollama' | 'custom';

// ─── Configuration principale ─────────────────────────────────────────────────

export interface AIProviderConfig {
  /** Identifiant du fournisseur LLM */
  provider: AIProvider;
  /** Identifiant du modèle (ex: "gemini-2.5-pro", "claude-3-5-sonnet") */
  model: string;
  /** Température de génération [0.0 – 2.0] */
  temperature: number;
  /** Top-p nucleus sampling [0.0 – 1.0] */
  topP: number;
  /** Top-k sampling */
  topK: number;
  /** Nombre maximum de tokens en sortie */
  maxTokens: number;
  /** Activer le streaming de la réponse */
  stream: boolean;
  /**
   * Clé API du provider (EGEN_AI_API_KEY), utilisée UNIQUEMENT en mode direct
   * (voir `directMode`). En production, la clé doit vivre côté backend
   * (`AIBackendConfig.baseUrl`) — jamais dans un bundle navigateur. Ce champ
   * n'existe que pour permettre un démarrage rapide en développement/
   * prototypage, sans devoir déployer/configurer un backend proxy au
   * préalable.
   */
  apiKey: string;
  /**
   * Si `true` (ou si `apiKey` est renseignée), le frontend appelle le
   * provider LLM directement depuis le navigateur au lieu de passer par
   * `AIBackendConfig` — voir l'avertissement de sécurité sur `apiKey`.
   */
  directMode: boolean;
}

export interface AIBackendConfig {
  /**
   * URL du backend proxy IA.
   * Le backend reçoit le contexte sérialisé + le message utilisateur
   * et communique avec le LLM de façon sécurisée (la clé API n'est
   * jamais exposée côté frontend).
   */
  baseUrl: string;
  /** Endpoint pour les completions (chat) */
  chatEndpoint: string;
  /** Endpoint pour les completions en streaming */
  streamEndpoint: string;
  /** Timeout par requête en millisecondes */
  requestTimeoutMs: number;
  /** Nombre maximum de tentatives en cas d'erreur réseau */
  maxRetries: number;
  /** Délai entre les tentatives (ms) */
  retryDelayMs: number;
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

export interface AIMemoryConfig {
  /** Activer la mémoire de conversation (historique des messages) */
  enabled: boolean;
  /** Nombre maximum de messages conservés en mémoire */
  maxMessages: number;
  /** Clé de stockage localStorage pour la mémoire */
  storageKey: string;
  /** Persister la mémoire entre les sessions */
  persist: boolean;
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
  /** Configuration du fournisseur LLM */
  provider: AIProviderConfig;
  /** Configuration du backend proxy */
  backend: AIBackendConfig;
  /** Configuration du contexte global */
  context: AIContextConfig;
  /** Configuration de la mémoire de conversation */
  memory: AIMemoryConfig;
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
