// =============================================================================
//  @egen/esm-ai-config — Valeurs par défaut
//
//  PRIORITÉ DE RÉSOLUTION :
//    1. window.egenAi* (overrides runtime injectés par le serveur HTML)
//    2. import.meta.env.EGEN_AI_* (variables de build Vite/Rspack)
//    3. process.env.EGEN_AI_* (variables Node/CI)
//    4. Ces valeurs par défaut
//
//  AUCUNE valeur ne doit être codée en dur dans le code applicatif.
// =============================================================================

import type { AIConfig } from './types';

/** Lit une variable d'env depuis toutes les sources disponibles */
function readEnv(key: string, fallback: string): string {
  return (
    (typeof window !== 'undefined' &&
      (window as any)[`egenAi${key.replace(/^EGEN_AI_/, '').replace(/_([A-Z])/g, (_, l) => l.toUpperCase())}`]) ??
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.[key]) ??
    (typeof process !== 'undefined' && process.env?.[key]) ??
    fallback
  );
}

function readEnvBool(key: string, fallback: boolean): boolean {
  const val = readEnv(key, String(fallback));
  return val === 'true' || val === '1';
}

function readEnvNumber(key: string, fallback: number): number {
  const val = readEnv(key, String(fallback));
  const parsed = parseFloat(val);
  return isNaN(parsed) ? fallback : parsed;
}

function readEnvArray(key: string, fallback: string[]): string[] {
  const val = readEnv(key, '');
  if (!val) return fallback;
  return val
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Construit la configuration par défaut en lisant toutes les sources disponibles.
 * Appelé une seule fois au chargement du module.
 */
export function buildDefaultConfig(): AIConfig {
  return {
    enabled: readEnvBool('EGEN_AI_ENABLED', false),
    schemaVersion: '1.0.0',

    provider: {
      provider: readEnv('EGEN_AI_PROVIDER', 'gemini') as AIConfig['provider']['provider'],
      model: readEnv('EGEN_AI_MODEL', 'gemini-3.1-flash-lite'),
      temperature: readEnvNumber('EGEN_AI_TEMPERATURE', 0.7),
      topP: readEnvNumber('EGEN_AI_TOP_P', 0.95),
      topK: readEnvNumber('EGEN_AI_TOP_K', 40),
      maxTokens: readEnvNumber('EGEN_AI_MAX_TOKENS', 8192),
      stream: readEnvBool('EGEN_AI_STREAM', true),
      apiKey: readEnv('EGEN_AI_API_KEY', ''),
      directMode: readEnvBool('EGEN_AI_DIRECT_MODE', false),
    },

    backend: {
      baseUrl: readEnv('EGEN_AI_BACKEND_URL', '${egenBase}/api/ai'),
      chatEndpoint: readEnv('EGEN_AI_CHAT_ENDPOINT', '/chat'),
      streamEndpoint: readEnv('EGEN_AI_STREAM_ENDPOINT', '/chat/stream'),
      requestTimeoutMs: readEnvNumber('EGEN_AI_REQUEST_TIMEOUT', 30000),
      maxRetries: readEnvNumber('EGEN_AI_MAX_RETRIES', 3),
      retryDelayMs: readEnvNumber('EGEN_AI_RETRY_DELAY', 1000),
    },

    context: {
      maxContextSize: readEnvNumber('EGEN_AI_CONTEXT_MAX_SIZE', 100000),
      includeActiveExtensions: readEnvBool('EGEN_AI_CONTEXT_EXTENSIONS', true),
      includeNavigation: readEnvBool('EGEN_AI_CONTEXT_NAVIGATION', true),
      includeModuleConfig: readEnvBool('EGEN_AI_CONTEXT_CONFIG', false),
      includeFeatureFlags: readEnvBool('EGEN_AI_CONTEXT_FLAGS', true),
      serializationDepth: readEnvNumber('EGEN_AI_CONTEXT_DEPTH', 4),
    },

    memory: {
      enabled: readEnvBool('EGEN_AI_MEMORY_ENABLED', true),
      maxMessages: readEnvNumber('EGEN_AI_MEMORY_MAX_MESSAGES', 50),
      storageKey: readEnv('EGEN_AI_MEMORY_KEY', 'egen:ai:memory'),
      persist: readEnvBool('EGEN_AI_MEMORY_PERSIST', false),
    },

    security: {
      requiredPrivileges: readEnvArray('EGEN_AI_REQUIRED_PRIVILEGES', []),
      validateToolsClient: readEnvBool('EGEN_AI_VALIDATE_TOOLS', true),
      toolTimeoutMs: readEnvNumber('EGEN_AI_TOOL_TIMEOUT', 30000),
      auditLog: readEnvBool('EGEN_AI_AUDIT_LOG', false),
    },

    observability: {
      debug: readEnvBool('EGEN_AI_DEBUG', false),
      eventsEnabled: readEnvBool('EGEN_AI_EVENTS_ENABLED', true),
      analyticsEnabled: readEnvBool('EGEN_AI_ANALYTICS_ENABLED', false),
      logLevel: readEnv('EGEN_AI_LOG_LEVEL', 'warn') as AIConfig['observability']['logLevel'],
    },
  };
}

export const DEFAULT_AI_CONFIG: AIConfig = buildDefaultConfig();
