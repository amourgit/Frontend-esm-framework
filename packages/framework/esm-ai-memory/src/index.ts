// =============================================================================
//  @egen-civitas/esm-ai-memory — Point d'entrée public
//
//  Persistance de conversation IA, par utilisateur, avec stockage local
//  (IndexedDB) synchronisé vers un backend interchangeable (voir types.ts,
//  ConversationStorageAdapter). Voir README.md pour l'architecture complète.
// =============================================================================

// ── Types ──────────────────────────────────────────────────────────────────
export type {
  StoredConversation,
  StoredMessage,
  StoredToolCall,
  StoredToolResult,
  ConversationSummary,
  SyncStatus,
  ConversationStorageAdapter,
} from './types.js';

// ── Setup (app assistant, une seule fois au boot) ──────────────────────────
export { initConversationMemory, _resetConversationMemory, _configureAdapters } from './store.js';

// ── Mutations ───────────────────────────────────────────────────────────────
export {
  addUserMessage,
  addAssistantMessage,
  updateMessage,
  recordToolCall,
  startNewConversation,
  switchToConversation,
  deleteConversation,
  getConversationMemoryState,
  generateId,
} from './store.js';

export type { ConversationMemoryState } from './store.js';

// ── React Hooks ─────────────────────────────────────────────────────────────
export {
  useConversationMessages,
  useConversationMemoryStatus,
  useActiveConversationId,
  useConversationSummaries,
} from './hooks.js';

// ── Adaptateurs (pour composition avancée / tests) ─────────────────────────
export { createIndexedDBAdapter } from './adapters/indexeddb-adapter.js';
export { createBackendAdapter } from './adapters/backend-adapter.js';
export { createSyncOrchestrator } from './sync-orchestrator.js';
export type { ConversationSyncOrchestrator, SyncOrchestratorOptions } from './sync-orchestrator.js';
