// =============================================================================
//  @egen-civitas/esm-ai-config — Validation de la configuration
// =============================================================================

import type { AIConfig, PartialAIConfig, DeepPartial } from './types.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const VALID_LOG_LEVELS = ['error', 'warn', 'info', 'debug'] as const;

/** Valide la configuration AI complète et retourne les erreurs/avertissements */
export function validateAIConfig(config: AIConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ── Backend ─────────────────────────────────────────────────────────────────
  if (!config.backend.baseUrl || config.backend.baseUrl.trim() === '') {
    errors.push('backend.baseUrl: ne peut pas être vide');
  }

  if (config.backend.requestTimeoutMs < 1000) {
    warnings.push(
      `backend.requestTimeoutMs: valeur très basse (${config.backend.requestTimeoutMs}ms). Recommandé : ≥ 5000ms`,
    );
  }

  if (config.backend.maxRetries > 10) {
    warnings.push(
      `backend.maxRetries: valeur élevée (${config.backend.maxRetries}). Peut ralentir l'UX en cas d'erreur.`,
    );
  }

  // ── Context ─────────────────────────────────────────────────────────────────
  if (config.context.maxContextSize < 1000) {
    warnings.push(
      `context.maxContextSize: valeur très basse (${config.context.maxContextSize}). Le contexte sera tronqué de façon agressive.`,
    );
  }

  if (config.context.serializationDepth < 1 || config.context.serializationDepth > 10) {
    errors.push(`context.serializationDepth: doit être entre 1 et 10 (reçu: ${config.context.serializationDepth})`);
  }

  // ── Security ────────────────────────────────────────────────────────────────
  if (config.security.toolTimeoutMs < 500) {
    warnings.push(
      `security.toolTimeoutMs: valeur très basse (${config.security.toolTimeoutMs}ms). Des tools légitimes pourraient timeout.`,
    );
  }

  // ── Observability ───────────────────────────────────────────────────────────
  if (!VALID_LOG_LEVELS.includes(config.observability.logLevel as any)) {
    errors.push(
      `observability.logLevel: valeur invalide "${
        config.observability.logLevel
      }". Valeurs acceptées : ${VALID_LOG_LEVELS.join(', ')}`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Deep merge d'une config partielle sur la config de base.
 * Les valeurs `undefined` dans l'override sont ignorées.
 */
export function mergeConfig(base: AIConfig, override: PartialAIConfig): AIConfig {
  return deepMerge(base, override) as AIConfig;
}

function deepMerge<T extends object>(target: T, source: DeepPartial<T>): T {
  const result = { ...target };

  for (const key of Object.keys(source) as (keyof T)[]) {
    const sourceVal = source[key];
    const targetVal = target[key];

    if (sourceVal === undefined || sourceVal === null) continue;

    if (
      typeof sourceVal === 'object' &&
      !Array.isArray(sourceVal) &&
      typeof targetVal === 'object' &&
      !Array.isArray(targetVal) &&
      targetVal !== null
    ) {
      result[key] = deepMerge(targetVal as object, sourceVal as object) as T[typeof key];
    } else {
      result[key] = sourceVal as T[typeof key];
    }
  }

  return result;
}
