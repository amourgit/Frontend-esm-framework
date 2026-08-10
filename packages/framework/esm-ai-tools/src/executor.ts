// =============================================================================
//  @egen/esm-ai-tools — Pipeline d'exécution
//
//  Ordre pour chaque requête de tool :
//    1. Résoudre le tool dans le registre
//    2. Valider les arguments (schéma + coercion)
//    3. Vérifier les permissions (sessionStore)
//    4. Appliquer les décorateurs (chaîne)
//    5. Exécuter avec timeout
//    6. Émettre les événements
//    7. Retourner AIToolResult
// =============================================================================

import { dispatchAIEvent, AI_EVENTS } from '@egen/esm-ai-events';
import { getAIConfig } from '@egen/esm-ai-config';
import { sessionStore } from '@egen/esm-api';
import { getTool } from './registry';
import { validateToolArgs, checkToolPermissions } from './validation';
import type { AIToolRequest, AIToolResult, AIToolExecutionContext, AIToolDefinition, AIToolDecorator } from './types';

// AIContext est importé dynamiquement pour éviter la dépendance circulaire
// esm-ai-tools → esm-ai-context → esm-ai-tools
import type { AIContext } from '@egen/esm-ai-context';
type AIContextLazy = AIContext | null | undefined;

let _executionCounter = 0;
function generateExecutionId(): string {
  return `exec-${Date.now()}-${++_executionCounter}`;
}

/** Supprime les données sensibles des logs */
function sanitizeForLog(args: Record<string, unknown>): Record<string, unknown> {
  const SENSITIVE = new Set(['password', 'token', 'secret', 'key', 'credential', 'apiKey']);
  const sanitized: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(args)) {
    sanitized[k] = SENSITIVE.has(k.toLowerCase()) ? '[REDACTED]' : v;
  }
  return sanitized;
}

/** Durée écoulée depuis `start` en millisecondes */
function elapsed(start: number): number {
  return Math.round(performance.now() - start);
}

function fail(error: string, start: number): AIToolResult {
  return { success: false, error, durationMs: elapsed(start) };
}

/** Compose la chaîne de décorateurs autour de la fonction principale */
async function executeWithDecorators(
  execute: AIToolDefinition['execute'],
  decorators: AIToolDecorator[],
  ctx: AIToolExecutionContext,
): Promise<AIToolResult> {
  if (decorators.length === 0) return execute(ctx);

  let composed: (c: AIToolExecutionContext) => Promise<AIToolResult> = execute;
  for (const decorator of [...decorators].reverse()) {
    const next = composed;
    composed = (c) => decorator(next, c);
  }
  return composed(ctx);
}

/** Enveloppe une Promise avec un timeout */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, toolId: string, executionId: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      dispatchAIEvent(AI_EVENTS.TOOL_TIMEOUT, {
        toolId,
        toolName: toolId,
        executionId,
        timeoutMs,
      });
      reject(new Error(`Tool "${toolId}" a dépassé le timeout de ${timeoutMs}ms`));
    }, timeoutMs);

    promise.then(
      (result) => {
        clearTimeout(timer);
        resolve(result);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/**
 * Exécute un tool via le pipeline complet.
 * Le contexte IA est optionnel et passé en référence — jamais sérialisé ici.
 */
export async function executeTool(request: AIToolRequest, aiContext?: AIContextLazy): Promise<AIToolResult> {
  const startTime = performance.now();
  const executionId = generateExecutionId();
  const config = getAIConfig();

  // ── 1. Résoudre ───────────────────────────────────────────────────────────
  const entry = getTool(request.tool);
  if (!entry) {
    return fail(`Tool inconnu : "${request.tool}"`, startTime);
  }
  const { definition, decorators } = entry;

  dispatchAIEvent(AI_EVENTS.TOOL_EXECUTING, {
    toolId: definition.id,
    toolName: definition.name,
    executionId,
    args: sanitizeForLog(request.arguments),
  });

  // ── 2. Valider les arguments ──────────────────────────────────────────────
  let resolvedArgs = request.arguments;
  if (config.security.validateToolsClient) {
    const validation = validateToolArgs(request.arguments, definition.parameters);
    if (!validation.valid) {
      const error = `Arguments invalides pour "${definition.id}" : ${validation.errors.join(' | ')}`;
      dispatchAIEvent(AI_EVENTS.TOOL_FAILED, {
        toolId: definition.id,
        toolName: definition.name,
        executionId,
        error,
        durationMs: elapsed(startTime),
      });
      return fail(error, startTime);
    }
    resolvedArgs = validation.coercedArgs ?? request.arguments;
  }

  // ── 3. Vérifier les permissions ───────────────────────────────────────────
  const sessionState = sessionStore.getState();
  const session = sessionState.loaded ? sessionState.session : null;
  const userPrivileges = session?.user?.privileges?.map((p) => p.display) ?? [];

  const permCheck = checkToolPermissions(definition.requiredPrivileges ?? [], userPrivileges);
  if (!permCheck.allowed) {
    dispatchAIEvent(AI_EVENTS.TOOL_PERMISSION_DENIED, {
      toolId: definition.id,
      requiredPrivileges: definition.requiredPrivileges ?? [],
      userPrivileges,
    });
    return fail(
      `Permission refusée pour "${definition.id}". Privilèges manquants : ${permCheck.missing.join(', ')}`,
      startTime,
    );
  }

  // ── 4. Contexte d'exécution ───────────────────────────────────────────────
  const ctx: AIToolExecutionContext = {
    executionId,
    args: resolvedArgs,
    aiContext: aiContext ?? null,
    session,
  };

  // ── 5. Exécuter avec décorateurs + timeout ────────────────────────────────
  try {
    const result = await withTimeout(
      executeWithDecorators(definition.execute, decorators, ctx),
      config.security.toolTimeoutMs,
      definition.id,
      executionId,
    );

    const durationMs = elapsed(startTime);
    dispatchAIEvent(AI_EVENTS.TOOL_EXECUTED, {
      toolId: definition.id,
      toolName: definition.name,
      executionId,
      durationMs,
      success: result.success,
    });

    return { ...result, durationMs };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    const durationMs = elapsed(startTime);
    dispatchAIEvent(AI_EVENTS.TOOL_FAILED, {
      toolId: definition.id,
      toolName: definition.name,
      executionId,
      error,
      durationMs,
    });
    return { success: false, error, durationMs };
  }
}
