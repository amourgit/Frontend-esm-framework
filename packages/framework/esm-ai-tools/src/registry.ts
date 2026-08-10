// =============================================================================
//  @egen/esm-ai-tools — Registre des tools IA
//
//  Supporte : enregistrement, override, décoration, suppression.
//  Thread-safe (synchrone — JavaScript single-threaded).
// =============================================================================

import { dispatchAIEvent, AI_EVENTS } from '@egen/esm-ai-events';
import type { AIToolDefinition, AIToolDecorator, AIToolRegistryEntry, AICapability } from './types';

const _tools = new Map<string, AIToolRegistryEntry>();
const _capabilities = new Map<string, AICapability>();

// ─── Tools ───────────────────────────────────────────────────────────────────

/**
 * Enregistre un nouveau tool.
 * Si un tool avec le même id existe, lève une erreur (utiliser overrideTool pour remplacer).
 */
export function registerTool(definition: AIToolDefinition): void {
  if (_tools.has(definition.id)) {
    throw new Error(
      `[EGEN AI Tools] Tool "${definition.id}" est déjà enregistré. Utiliser overrideTool() pour le remplacer.`,
    );
  }

  _tools.set(definition.id, {
    definition,
    decorators: [],
    overridden: false,
    registeredAt: new Date().toISOString(),
  });

  dispatchAIEvent(AI_EVENTS.TOOL_REGISTERED, {
    toolId: definition.id,
    toolName: definition.name,
    moduleName: definition.moduleName ?? 'unknown',
  });
}

/**
 * Remplace complètement un tool existant.
 * L'ancienne définition est écrasée, les décorateurs existants sont conservés.
 */
export function overrideTool(definition: AIToolDefinition): void {
  const existing = _tools.get(definition.id);

  _tools.set(definition.id, {
    definition,
    decorators: existing?.decorators ?? [],
    overridden: true,
    registeredAt: existing?.registeredAt ?? new Date().toISOString(),
  });

  dispatchAIEvent(AI_EVENTS.TOOL_OVERRIDDEN, {
    toolId: definition.id,
    toolName: definition.name,
    moduleName: definition.moduleName ?? 'unknown',
    previousModuleName: existing?.definition.moduleName ?? 'unknown',
  });
}

/**
 * Ajoute un décorateur sur un tool existant.
 * Les décorateurs sont exécutés dans l'ordre d'ajout (premier ajouté = premier exécuté).
 * Permet d'ajouter du logging, des métriques, des transformations sans modifier le tool.
 *
 * @example
 * ```ts
 * decorateTool('navigate', async (execute, ctx) => {
 *   console.log('Navigation demandée vers :', ctx.args.route);
 *   const result = await execute(ctx);
 *   console.log('Navigation terminée :', result.success);
 *   return result;
 * });
 * ```
 */
export function decorateTool(toolId: string, decorator: AIToolDecorator): () => void {
  const entry = _tools.get(toolId);
  if (!entry) {
    throw new Error(`[EGEN AI Tools] Impossible de décorer le tool "${toolId}" : non trouvé.`);
  }

  entry.decorators.push(decorator);

  dispatchAIEvent(AI_EVENTS.TOOL_DECORATED, {
    toolId,
    toolName: entry.definition.name,
    moduleName: entry.definition.moduleName ?? 'unknown',
  });

  // Retourne une fonction pour retirer le décorateur
  return () => {
    const idx = entry.decorators.indexOf(decorator);
    if (idx >= 0) entry.decorators.splice(idx, 1);
  };
}

/**
 * Retire un tool du registre.
 */
export function removeTool(toolId: string): void {
  const entry = _tools.get(toolId);
  if (!entry) return;

  _tools.delete(toolId);

  dispatchAIEvent(AI_EVENTS.TOOL_REMOVED, {
    toolId,
    toolName: entry.definition.name,
    moduleName: entry.definition.moduleName ?? 'unknown',
  });
}

export function getTool(toolId: string): AIToolRegistryEntry | undefined {
  return _tools.get(toolId);
}

export function getAllTools(): AIToolDefinition[] {
  return Array.from(_tools.values()).map((e) => e.definition);
}

export function hasTool(toolId: string): boolean {
  return _tools.has(toolId);
}

// ─── Capacités ───────────────────────────────────────────────────────────────

export function registerCapability(capability: AICapability): void {
  _capabilities.set(capability.id, capability);
  dispatchAIEvent(AI_EVENTS.CAPABILITY_REGISTERED, {
    capabilityId: capability.id,
    capabilityName: capability.name,
  });
}

export function removeCapability(capabilityId: string): void {
  const cap = _capabilities.get(capabilityId);
  if (!cap) return;
  _capabilities.delete(capabilityId);
  dispatchAIEvent(AI_EVENTS.CAPABILITY_REMOVED, {
    capabilityId,
    capabilityName: cap.name,
  });
}

export function getAllCapabilities(): AICapability[] {
  return Array.from(_capabilities.values());
}

/**
 * Génère la représentation des tools pour le prompt système du LLM.
 * Filtrée selon les privilèges de l'utilisateur.
 */
export function getToolsSchemaForLLM(userPrivileges: string[]): object[] {
  const userPrivsSet = new Set(userPrivileges);
  return getAllTools()
    .filter((tool) => {
      if (!tool.requiredPrivileges?.length) return true;
      return tool.requiredPrivileges.every((p) => userPrivsSet.has(p));
    })
    .map((tool) => ({
      name: tool.id,
      description: tool.description,
      parameters: {
        type: 'object',
        // `tool.parameters` est le format INTERNE EGEN : chaque propriété y
        // porte un champ `required: boolean` en plus de `type`/`description`/
        // `enum`/`default`. Ce booléen n'existe dans AUCUN JSON Schema standard
        // consommé par un LLM (OpenAI, Gemini, ...) — seul un tableau
        // `required: string[]` au niveau de l'objet parent y est valide (voir
        // ci-dessous). L'exposer tel quel dans le schéma public produirait un
        // schéma non conforme pour tout consommateur, donc on ne garde de
        // chaque propriété que les clés d'un JSON Schema standard.
        properties: Object.fromEntries(
          Object.entries(tool.parameters).map(([key, { required: _required, ...schema }]) => [key, schema]),
        ),
        required: Object.entries(tool.parameters)
          .filter(([, p]) => p.required)
          .map(([k]) => k),
      },
    }));
}

/** @internal — tests uniquement */
export function _clearToolRegistry(): void {
  _tools.clear();
  _capabilities.clear();
}
