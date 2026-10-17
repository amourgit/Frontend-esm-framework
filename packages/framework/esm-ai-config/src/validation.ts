// =============================================================================
//  @egen-civitas/esm-ai-config — Validation de la configuration
// =============================================================================

import type { AIConfig, PartialAIConfig, DeepPartial } from './types.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/** Valide la configuration AI complète et retourne les erreurs/avertissements */
export function validateAIConfig(config: AIConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ── Backend (canal temps réel) ───────────────────────────────────────────────
  if (!config.backend.channelUrl || config.backend.channelUrl.trim() === '') {
    errors.push('backend.channelUrl: ne peut pas être vide');
  }

  if (config.backend.heartbeatMs < 1000) {
    errors.push(`backend.heartbeatMs: doit être ≥ 1000ms (reçu: ${config.backend.heartbeatMs})`);
  }

  if (config.backend.reconnectMinMs < 50 || config.backend.reconnectMaxMs < config.backend.reconnectMinMs) {
    errors.push(
      `backend.reconnectMinMs/reconnectMaxMs: invalides (min=${config.backend.reconnectMinMs}, max=${config.backend.reconnectMaxMs})`,
    );
  }

  if (config.backend.requestTimeoutMs < 1000) {
    warnings.push(
      `backend.requestTimeoutMs: valeur très basse (${config.backend.requestTimeoutMs}ms). Recommandé : ≥ 5000ms`,
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

  validateChannelAuthentication(config, errors, warnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/** Algorithmes de signature acceptés pour authentifier les appels : asymétriques uniquement (jamais `none` ni HS*). */
export const SUPPORTED_CHANNEL_ALGORITHMS = ['ES256', 'ES384', 'ES512', 'EdDSA', 'PS256', 'PS384', 'PS512', 'RS256'];

/** Membres JWK qui trahissent une clé privée ou symétrique : leur présence dans le build est une fuite. */
const PRIVATE_JWK_MEMBERS = ['d', 'p', 'q', 'dp', 'dq', 'qi', 'k'];

function validateChannelAuthentication(config: AIConfig, errors: string[], warnings: string[]): void {
  const { signedToolCalls: mode, channelJwks, channelJwksUrl, channelAlgorithms } = config.security;

  if (!['off', 'warn', 'enforce'].includes(mode)) {
    errors.push(`security.signedToolCalls: valeur invalide « ${mode} » (attendu : off | warn | enforce)`);
  }

  const hasJwks = channelJwks.trim() !== '';
  const hasJwksUrl = channelJwksUrl.trim() !== '';

  if (mode !== 'off' && !hasJwks && !hasJwksUrl) {
    (mode === 'enforce' ? errors : warnings).push(
      `security.signedToolCalls=${mode} sans clé publique : renseigner security.channelJwks ou security.channelJwksUrl` +
        (mode === 'enforce' ? ' (en mode enforce, aucun appel ne pourrait être authentifié)' : ''),
    );
  }
  if (hasJwks && hasJwksUrl) {
    warnings.push('security.channelJwks et security.channelJwksUrl sont tous deux définis : seul channelJwks (épinglé) est utilisé');
  }

  if (hasJwks) {
    try {
      const parsed = JSON.parse(channelJwks) as { keys?: unknown };
      if (!parsed || !Array.isArray(parsed.keys) || parsed.keys.length === 0) {
        errors.push('security.channelJwks: doit être un JWKS JSON non vide ({"keys":[…]})');
      } else if (
        parsed.keys.some((key) => key && typeof key === 'object' && PRIVATE_JWK_MEMBERS.some((m) => m in (key as object)))
      ) {
        errors.push(
          'security.channelJwks: contient une clé PRIVÈRE ou symétrique — elle serait publiée dans le bundle. Ne fournir que des clés publiques.',
        );
      }
    } catch {
      errors.push('security.channelJwks: JSON invalide');
    }
  }

  if (hasJwksUrl) {
    try {
      const url = new URL(channelJwksUrl);
      const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
      if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) {
        errors.push('security.channelJwksUrl: doit être en https (http toléré uniquement vers localhost)');
      }
    } catch {
      errors.push('security.channelJwksUrl: URL invalide');
    }
  }

  const unsupported = channelAlgorithms.filter((alg) => !SUPPORTED_CHANNEL_ALGORITHMS.includes(alg));
  if (channelAlgorithms.length === 0 || unsupported.length > 0) {
    errors.push(
      `security.channelAlgorithms: ${
        channelAlgorithms.length === 0 ? 'liste vide' : `algorithme(s) non autorisé(s) : ${unsupported.join(', ')}`
      } (autorisés : ${SUPPORTED_CHANNEL_ALGORITHMS.join(', ')})`,
    );
  }
  if (channelAlgorithms.includes('EdDSA')) {
    warnings.push('security.channelAlgorithms: EdDSA (Ed25519) n\'est pas supporté par WebCrypto sur les navigateurs anciens ; ES256 est le choix le plus compatible');
  }
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
