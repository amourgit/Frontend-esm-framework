// =============================================================================
//  @egen/esm-ai-tools — Types des tools IA
// =============================================================================

// ─── Schéma de paramètre ──────────────────────────────────────────────────────

export type AIToolParamType = 'string' | 'number' | 'boolean' | 'object' | 'array';

export interface AIToolParam {
  type: AIToolParamType;
  description: string;
  required?: boolean;
  default?: unknown;
  enum?: unknown[];
  /** Pour type 'array' : type des éléments */
  items?: { type: AIToolParamType };
  /** Pour type 'object' : propriétés */
  properties?: Record<string, AIToolParam>;
}

// ─── Résultat d'exécution ─────────────────────────────────────────────────────

export interface AIToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  /** Durée d'exécution en ms */
  durationMs: number;
}

// ─── Contexte d'exécution passé à chaque tool ────────────────────────────────

export interface AIToolExecutionContext {
  /** ID unique de cette exécution */
  executionId: string;
  /** Arguments validés et typés */
  args: Record<string, unknown>;
  /**
   * Snapshot du contexte IA au moment de l'exécution.
   * Typé de manière permissive pour éviter une dépendance circulaire esm-ai-tools → esm-ai-context.
   * Les tools accèdent aux données via ctx.aiContext?.user, ctx.aiContext?.tenant, etc.
   */
  aiContext?: unknown | null;
  /**
   * Session utilisateur (sessionStore snapshot).
   * Typé loosement pour éviter une dépendance circulaire sur @egen/esm-api.
   */
  session?: {
    authenticated: boolean;
    user?: {
      uuid: string;
      display: string;
      username: string;
      privileges?: Array<{ display: string; uuid: string }>;
      roles?: Array<{ name: string; display: string; uuid: string }>;
    } | null;
    sessionId?: string;
    locale?: string;
  } | null;
}

// ─── Définition d'un tool ─────────────────────────────────────────────────────

export interface AIToolDefinition<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> {
  /** Identifiant unique du tool (snake_case recommandé) */
  id: string;
  /** Nom lisible pour le LLM */
  name: string;
  /** Description précise de ce que fait le tool (utilisée dans le prompt système) */
  description: string;
  /** Schéma de paramètres (JSON Schema simplifié) */
  parameters: Record<string, AIToolParam>;
  /** Privilèges EGEN requis pour exécuter ce tool */
  requiredPrivileges?: string[];
  /** Nom du module qui enregistre ce tool (pour le debugging et l'audit) */
  moduleName?: string;
  /**
   * Fonction d'exécution principale.
   * Doit être idempotente si possible.
   * Ne jamais lancer d'exception — retourner AIToolResult.success=false à la place.
   */
  execute: (ctx: AIToolExecutionContext) => Promise<AIToolResult<TResult>>;
  /** Métadonnées libres (catégorie, version, deprecated, etc.) */
  metadata?: Record<string, unknown>;
}

// ─── Capacité déclarative (pour le LLM) ──────────────────────────────────────

export interface AICapability {
  id: string;
  name: string;
  description: string;
  requiredPrivileges?: string[];
  parameters?: Record<string, AIToolParam>;
  metadata?: Record<string, unknown>;
}

// ─── Résultat de validation ───────────────────────────────────────────────────

export interface AIToolValidationResult {
  valid: boolean;
  errors: string[];
  coercedArgs?: Record<string, unknown>;
}

// ─── Registry entry ───────────────────────────────────────────────────────────

export interface AIToolRegistryEntry {
  definition: AIToolDefinition;
  decorators: AIToolDecorator[];
  overridden: boolean;
  registeredAt: string;
}

// ─── Decorator ───────────────────────────────────────────────────────────────

export type AIToolDecorator = (
  execute: AIToolDefinition['execute'],
  ctx: AIToolExecutionContext,
) => Promise<AIToolResult>;

// ─── Demande d'exécution du LLM ──────────────────────────────────────────────

export interface AIToolRequest {
  tool: string;
  arguments: Record<string, unknown>;
  /** ID de message provenant du backend */
  messageId?: string;
}
