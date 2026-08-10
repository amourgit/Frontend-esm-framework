// =============================================================================
//  @egen/esm-ai-framework — API publique de la couche 1 IA EGEN
//
//  Point d'entrée unique pour tous les consommateurs de la couche IA.
//  Re-exporte l'ensemble des primitives avec une API stable et versionnée.
//
//  Usage (Layer 2 — app agent) :
//  ```ts
//  import {
//    initAIFramework,
//    useAIContext,
//    useExecuteTool,
//    useAIEnabled,
//  } from '@egen/esm-ai-framework';
//  ```
//
//  Usage (microfrontend — extension) :
//  ```ts
//  import { defineAIModule } from '@egen/esm-ai-framework';
//  ```
// =============================================================================

// ─── Orchestrateur ────────────────────────────────────────────────────────────
export { initAIFramework, cleanupAIFramework, isAIFrameworkInitialized } from './orchestrator';

// ─── Configuration ────────────────────────────────────────────────────────────
export {
  getAIConfig,
  overrideAIConfig,
  resetAIConfig,
  subscribeToAIConfig,
  aiConfigStore,
  useAIConfig,
  useAIEnabled,
  useAIConfigStore,
  type AIConfig,
  type AIProviderConfig,
  type AIBackendConfig,
  type AIContextConfig,
  type AIMemoryConfig,
  type AISecurityConfig,
  type AIObservabilityConfig,
  type PartialAIConfig,
} from '@egen/esm-ai-config';

// ─── Événements ───────────────────────────────────────────────────────────────
export {
  dispatchAIEvent,
  subscribeToAIEvent,
  subscribeToAllAIEvents,
  observeAIEvent,
  enableAIEventDebugLogger,
  aiEvents$,
  AI_EVENTS,
  type AIEventName,
  type AIEventPayloadMap,
} from '@egen/esm-ai-events';

// ─── Contexte ─────────────────────────────────────────────────────────────────
export {
  buildAIContext,
  getAIContext,
  getAIContextJson,
  aiContextStore,
  scheduleContextRebuild,
  registerAIContextProvider,
  removeAIContextProvider,
  getAIContextProviders,
  type AIContext,
  type AIUserContext,
  type AITenantContext,
  type AINavigationContext,
  type AIPermissionsContext,
  type AIExtensionContext,
  type AIContextProvider,
} from '@egen/esm-ai-context';

// ─── Tools ────────────────────────────────────────────────────────────────────
export {
  registerTool,
  overrideTool,
  decorateTool,
  removeTool,
  getTool,
  getAllTools,
  hasTool,
  registerCapability,
  removeCapability,
  getAllCapabilities,
  getToolsSchemaForLLM,
  executeTool,
  validateToolArgs,
  checkToolPermissions,
  NATIVE_TOOLS,
  registerRoute,
  removeRoute,
  getAllRoutes,
  getRoutesCatalogForLLM,
  type AIToolDefinition,
  type AIToolParam,
  type AIToolResult,
  type AIToolRequest,
  type AIToolExecutionContext,
  type AIToolDecorator,
  type AICapability,
  type AIToolValidationResult,
  type AIRouteDefinition,
  type AIRouteParam,
  registerUIAction,
  getVisibleUIActions,
  getUIActionElement,
  subscribeToUIActions,
  type AIUIActionDefinition,
  type AIUIActionKind,
  registerObservable,
  getObservablesCatalogForLLM,
  subscribeToObservables,
  type AIObservableDefinition,
  type AIObservableKind,
  type AIObservableSnapshot,
  type DescribedElement,
  type DescribedHeading,
  type ScreenDescription,
} from '@egen/esm-ai-tools';

// ─── Extensions (API haut niveau pour microfrontends) ─────────────────────────
export { defineAIModule, type AIModuleDefinition } from '@egen/esm-ai-extensions';

// ─── React hooks ──────────────────────────────────────────────────────────────
export {
  useAIContext,
  useAIContextJson,
  useExecuteTool,
  useAvailableToolsSchema,
  useAIActionable,
  useAIObservable,
  type UseExecuteToolResult,
} from './hooks';
