// =============================================================================
//  @egen-civitas/esm-ai-memory — Modèle de données
//
//  TOUT est conservé, sans exception : chaque message, chaque appel de tool
//  ET son résultat brut complet (pas un résumé) — voir StoredToolCall.result.
//  Le résumé lisible affiché dans la bulle de chat (AssistantToolCall côté
//  esm-ai-assistant-app) reste un problème d'UI séparé ; ce package, lui,
//  ne perd jamais rien.
// =============================================================================

/** Résultat brut d'un appel de tool — même structure que ToolExecutionResult de @egen-civitas/esm-ai-tools, dupliquée ici volontairement pour ne créer AUCUNE dépendance vers esm-ai-tools (ce package doit rester utilisable seul). */
export interface StoredToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  durationMs?: number;
}

export interface StoredToolCall {
  id: string;
  tool: string;
  arguments: Record<string, unknown>;
  status: 'pending' | 'success' | 'error';
  /** Résultat brut COMPLET — jamais tronqué ni résumé ici. */
  result?: StoredToolResult;
  startedAt: string;
  completedAt?: string;
}

export interface StoredMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  status?: 'streaming' | 'done' | 'error';
  toolCalls?: StoredToolCall[];
}

/** État de synchronisation d'une conversation avec le backend (voir sync-orchestrator.ts). */
export type SyncStatus = 'local-only' | 'synced' | 'dirty' | 'syncing' | 'sync-error';

export interface StoredConversation {
  id: string;
  /** Propriétaire — TOUJOURS l'utilisateur authentifié courant, jamais partagé entre utilisateurs. */
  userId: string;
  /** Tenant courant au moment de la conversation (métadonnée, pas une contrainte d'accès). */
  tenantId: string | null;
  /** Dérivé automatiquement du premier message utilisateur si non fourni. */
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: StoredMessage[];
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
}

/** Version allégée pour lister les conversations sans charger tous les messages. */
export interface ConversationSummary {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  syncStatus: SyncStatus;
}

// =============================================================================
// CONTRAT D'ADAPTATEUR DE STOCKAGE
//
// C'EST le point d'extension central : toute la logique du reste du package
// (sync-orchestrator, store) parle UNIQUEMENT à travers cette interface,
// jamais directement à IndexedDB ou à une API REST. Changer de backend de
// stockage = écrire un nouvel adaptateur qui l'implémente, sans toucher au
// reste. Voir adapters/indexeddb-adapter.ts (aujourd'hui) et
// adapters/backend-adapter.ts (prêt pour quand le backend existera).
// =============================================================================

export interface ConversationStorageAdapter {
  /** Nom court pour les logs/diagnostics (ex: "indexeddb", "backend"). */
  readonly name: string;

  /** Liste les conversations d'un utilisateur, triées par updatedAt décroissant. */
  listConversations(userId: string): Promise<ConversationSummary[]>;

  /** Charge une conversation complète (tous les messages). `null` si absente. */
  getConversation(userId: string, conversationId: string): Promise<StoredConversation | null>;

  /** Insère ou remplace intégralement une conversation. */
  saveConversation(conversation: StoredConversation): Promise<void>;

  deleteConversation(userId: string, conversationId: string): Promise<void>;
}
