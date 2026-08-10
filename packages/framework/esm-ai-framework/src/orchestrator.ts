// =============================================================================
//  @egen/esm-ai-framework — Orchestrateur central
//
//  Point d'initialisation unique du système IA EGEN.
//  Appelé UNE SEULE FOIS depuis run.ts du shell (ou startupApp d'une app hôte).
//
//  Responsabilités :
//    1. Valider la configuration
//    2. Enregistrer les tools natifs
//    3. Initialiser la réactivité du contexte
//    4. Activer le logger de debug si nécessaire
//    5. Émettre l'événement SESSION_STARTED
// =============================================================================

import { getAIConfig, subscribeToAIConfig } from '@egen/esm-ai-config';
import { initAIContextReactivity, aiContextStore } from '@egen/esm-ai-context';
import { dispatchAIEvent, AI_EVENTS, enableAIEventDebugLogger } from '@egen/esm-ai-events';
import { registerTool, hasTool, NATIVE_TOOLS } from '@egen/esm-ai-tools';

let _initialized = false;
let _cleanupContext: (() => void) | null = null;
let _debugLoggerCleanup: (() => void) | null = null;
// Souscription à la config, créée une seule fois (voir cleanupAIFramework) —
// avant ce correctif, un nouvel abonnement était créé à chaque `force: true`
// sans jamais désabonner le précédent (fuite à chaque hot-reload/remount).
let _cleanupConfigSubscription: (() => void) | null = null;

export interface AIFrameworkInitOptions {
  /** Forcer la réinitialisation même si déjà initialisé */
  force?: boolean;
}

/**
 * Initialise la couche IA EGEN.
 *
 * Idempotente — les appels successifs sont ignorés sauf si force=true.
 * Doit être appelée depuis startupApp() ou run.ts du shell.
 *
 * @returns Fonction de nettoyage (pour les tests ou le hot-reload).
 */
export function initAIFramework(options: AIFrameworkInitOptions = {}): () => void {
  if (_initialized && !options.force) {
    return () => {};
  }

  if (_initialized && options.force) {
    cleanupAIFramework();
  }

  const config = getAIConfig();

  if (!config.enabled) {
    // Système désactivé — pas d'initialisation, pas d'overhead
    _initialized = true;
    return cleanupAIFramework;
  }

  // ── 1. Enregistrer les tools natifs ──────────────────────────────────────────
  for (const tool of NATIVE_TOOLS) {
    if (!hasTool(tool.id)) {
      registerTool(tool);
    }
  }

  // ── 2. Initialiser la réactivité du contexte ──────────────────────────────────
  _cleanupContext = initAIContextReactivity();

  // ── 3. Activer le logger debug si configuré ───────────────────────────────────
  if (config.observability.debug) {
    _debugLoggerCleanup = enableAIEventDebugLogger();
  }

  // ── 4. Se réabonner si la config change (debug on/off à chaud) ───────────────
  // Un seul abonnement vivant à la fois — cleanupAIFramework() le désinscrit.
  _cleanupConfigSubscription = subscribeToAIConfig((newConfig) => {
    if (newConfig.observability.debug && !_debugLoggerCleanup) {
      _debugLoggerCleanup = enableAIEventDebugLogger();
    } else if (!newConfig.observability.debug && _debugLoggerCleanup) {
      _debugLoggerCleanup();
      _debugLoggerCleanup = null;
    }
  });

  // ── 5. Émettre l'événement de démarrage ──────────────────────────────────────
  dispatchAIEvent(AI_EVENTS.SESSION_STARTED, {
    sessionId: `egen-ai-session-${Date.now()}`,
  });

  _initialized = true;

  return cleanupAIFramework;
}

export function cleanupAIFramework(): void {
  _cleanupContext?.();
  _cleanupContext = null;
  _debugLoggerCleanup?.();
  _debugLoggerCleanup = null;
  _cleanupConfigSubscription?.();
  _cleanupConfigSubscription = null;
  _initialized = false;
}

export function isAIFrameworkInitialized(): boolean {
  return _initialized;
}
