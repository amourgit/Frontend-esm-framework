// =============================================================================
//  @egen-civitas/esm-ai-memory — Store réactif de la mémoire de conversation
//
//  RÔLE : la SEULE source de vérité pour "quelle conversation est affichée
//  en ce moment" côté UI. Vit dans le store global (@egen-civitas/esm-state,
//  singleton Module Federation comme tout le reste du framework) — donc
//  SURVIT à un démontage de composant (fermeture de modal). La persistance
//  IndexedDB + backend (voir sync-orchestrator.ts) survit en plus à un
//  rechargement de page.
//
//  TOUJOURS scopé à l'utilisateur COURANT — jamais aux autres :
//  s'abonne à sessionStore (@egen-civitas/esm-api) et recharge intégralement
//  dès que l'identité change (connexion, déconnexion, changement
//  d'utilisateur). Voir initConversationMemory().
// =============================================================================

import { createGlobalStore } from '@egen-civitas/esm-state';
import { sessionStore } from '@egen-civitas/esm-api';
import { AI_EVENTS, dispatchAIEvent } from '@egen-civitas/esm-ai-events';
import { createIndexedDBAdapter } from './adapters/indexeddb-adapter.js';
import { createBackendAdapter } from './adapters/backend-adapter.js';
import { createSyncOrchestrator, type ConversationSyncOrchestrator } from './sync-orchestrator.js';
import type { ConversationStorageAdapter, StoredConversation, StoredMessage, StoredToolCall, ConversationSummary } from './types.js';

export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Repli très défensif (environnements très anciens/non-sécurisés — pas cryptographiquement fort, mais suffisant comme identifiant local)
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function deriveTitle(firstUserMessage: string | undefined): string {
  if (!firstUserMessage) return 'Nouvelle conversation';
  const trimmed = firstUserMessage.trim().replace(/\s+/g, ' ');
  return trimmed.length > 60 ? `${trimmed.slice(0, 60)}…` : trimmed || 'Nouvelle conversation';
}

// ---------------------------------------------------------------------------
// État du store
// ---------------------------------------------------------------------------

export interface ConversationMemoryState {
  userId: string | null;
  tenantId: string | null;
  status: 'idle' | 'loading' | 'ready';
  activeConversation: StoredConversation | null;
  /** Résumés de TOUTES les conversations de l'utilisateur courant (pas seulement l'active) — voir types.ts, "historique de toutes les conversations sans exception". */
  conversationSummaries: ConversationSummary[];
}

const INITIAL_STATE: ConversationMemoryState = {
  userId: null,
  tenantId: null,
  status: 'idle',
  activeConversation: null,
  conversationSummaries: [],
};

export const conversationMemoryStore = createGlobalStore<ConversationMemoryState>('ai-conversation-memory', INITIAL_STATE);

// ---------------------------------------------------------------------------
// Adaptateurs + orchestrateur — instances de module, un seul jeu pour toute
// l'app (cohérent avec le store global lui-même étant un singleton).
// ---------------------------------------------------------------------------

let localAdapter: ConversationStorageAdapter = createIndexedDBAdapter();
let backendAdapter: ConversationStorageAdapter = createBackendAdapter();
let orchestrator: ConversationSyncOrchestrator = createSyncOrchestrator({ local: localAdapter, backend: backendAdapter });
let initialized = false;
let sessionUnsubscribe: (() => void) | null = null;

/**
 * @internal Point d'extension pour les tests (et pour une éventuelle
 * substitution future d'adaptateur sans toucher au reste du package — voir
 * ConversationStorageAdapter dans types.ts).
 */
export function _configureAdapters(local: ConversationStorageAdapter, backend: ConversationStorageAdapter): void {
  localAdapter = local;
  backendAdapter = backend;
  orchestrator.stop();
  orchestrator = createSyncOrchestrator({ local: localAdapter, backend: backendAdapter });
}

// ---------------------------------------------------------------------------
// Chargement / bascule d'utilisateur
// ---------------------------------------------------------------------------

async function loadForUser(userId: string, tenantId: string | null): Promise<void> {
  conversationMemoryStore.setState((s) => ({ ...s, status: 'loading' }));

  const summaries = await localAdapter.listConversations(userId);
  let active: StoredConversation | null = summaries.length > 0 ? await localAdapter.getConversation(userId, summaries[0].id) : null;

  if (!active) {
    active = {
      id: generateId(),
      userId,
      tenantId,
      title: 'Nouvelle conversation',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
      syncStatus: 'local-only',
      lastSyncedAt: null,
    };
    await localAdapter.saveConversation(active);
  }

  conversationMemoryStore.setState({
    userId,
    tenantId,
    status: 'ready',
    activeConversation: active,
    conversationSummaries: await localAdapter.listConversations(userId),
  });

  dispatchAIEvent(AI_EVENTS.MEMORY_CONVERSATION_LOADED, {
    userId,
    conversationId: active.id,
    messageCount: active.messages.length,
  });

  // Hydratation backend en arrière-plan — ne bloque pas l'affichage de
  // l'historique local, déjà disponible immédiatement. Une fois terminée,
  // recharge silencieusement si le backend avait quelque chose de plus récent.
  void orchestrator.hydrateFromBackend(userId).then(async () => {
    if (conversationMemoryStore.getState().userId !== userId) return; // l'utilisateur a changé entre-temps, on n'écrase rien
    const refreshedSummaries = await localAdapter.listConversations(userId);
    const activeId = conversationMemoryStore.getState().activeConversation?.id;
    const refreshedActive = activeId ? await localAdapter.getConversation(userId, activeId) : null;

    // IMPORTANT : l'état est relu DANS le setState, après les lectures asynchrones ci-dessus.
    // Les mutations (persistActive) mettent l'état à jour AVANT d'écrire en base : la copie lue
    // dans IndexedDB peut donc être plus ancienne que l'état en mémoire (message envoyé pendant
    // le rafraîchissement). On fusionne au lieu de remplacer, sinon ces messages disparaissent.
    conversationMemoryStore.setState((s) => {
      if (s.userId !== userId) return s;
      const activeConversation = mergeActiveConversation(s.activeConversation, refreshedActive);
      return {
        ...s,
        activeConversation,
        conversationSummaries: reconcileSummaries(refreshedSummaries, activeConversation),
      };
    });
  });
}

/**
 * Fusionne la conversation active en mémoire avec sa copie relue en base après une hydratation.
 * - la version en mémoire l'emporte pour un même message (ex. message encore en streaming) ;
 * - les messages présents seulement en mémoire (pas encore écrits en base) sont conservés, à la fin ;
 * - les messages rapatriés du backend (présents seulement en base) sont ajoutés.
 * Si l'utilisateur a changé de conversation entre-temps, l'état en mémoire n'est pas touché.
 *
 * @internal Exporté pour les tests.
 */
export function mergeActiveConversation(current: StoredConversation | null, stored: StoredConversation | null): StoredConversation | null {
  if (!current) return stored;
  if (!stored || stored.id !== current.id) return current;

  const currentById = new Map(current.messages.map((m) => [m.id, m]));
  const storedIds = new Set(stored.messages.map((m) => m.id));
  const messages = [...stored.messages.map((m) => currentById.get(m.id) ?? m), ...current.messages.filter((m) => !storedIds.has(m.id))];
  const newer = current.updatedAt >= stored.updatedAt ? current : stored;

  return { ...stored, title: newer.title, updatedAt: newer.updatedAt, syncStatus: newer.syncStatus, messages };
}

/** Rend la liste des résumés cohérente avec la conversation active (compteur à jour, conversation présente). */
function reconcileSummaries(summaries: ConversationSummary[], active: StoredConversation | null): ConversationSummary[] {
  if (!active) return summaries;
  const activeSummary = summarize(active);
  return summaries.some((c) => c.id === active.id) ? summaries.map((c) => (c.id === active.id ? activeSummary : c)) : [activeSummary, ...summaries];
}

/**
 * Initialise le système de mémoire de conversation. À appeler une seule fois
 * au boot de l'app assistant (idempotent — les appels suivants sont des no-op).
 * S'abonne à la session : toute connexion/déconnexion/changement d'utilisateur
 * recharge intégralement l'historique pour le nouvel utilisateur.
 */
export function initConversationMemory(): void {
  if (initialized) return;
  initialized = true;

  orchestrator.start();

  let previousUserId: string | null = null;

  const reactToSession = async () => {
    const state = sessionStore.getState();
    const newUserId = state.loaded && state.session?.authenticated ? (state.session.user?.uuid ?? null) : null;

    if (newUserId === previousUserId) return;

    // 1. Sauvegarde best-effort de l'utilisateur SORTANT avant de quitter son contexte.
    await orchestrator.flushNow();

    // 2. Bascule.
    orchestrator.setActiveUser(newUserId);
    dispatchAIEvent(AI_EVENTS.MEMORY_USER_SWITCHED, { previousUserId, newUserId });
    previousUserId = newUserId;

    if (!newUserId) {
      conversationMemoryStore.setState({ ...INITIAL_STATE });
      return;
    }

    // 3. Charge (et hydrate depuis le backend) le nouvel utilisateur.
    const tenantId = (typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>).egenTenantId : null) as
      | string
      | null;
    await loadForUser(newUserId, tenantId ?? null);
  };

  sessionUnsubscribe = sessionStore.subscribe(() => {
    void reactToSession();
  });
  void reactToSession();

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void orchestrator.flushNow();
    });
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', () => {
      void orchestrator.flushNow();
    });
  }
}

/** @internal Réservé aux tests. */
export function _resetConversationMemory(): void {
  sessionUnsubscribe?.();
  sessionUnsubscribe = null;
  initialized = false;
  orchestrator.stop();
  conversationMemoryStore.setState({ ...INITIAL_STATE }, true);
}

// ---------------------------------------------------------------------------
// Mutations — chaque appel persiste immédiatement en local ET marque la
// conversation "dirty" pour la synchronisation différée vers le backend.
// ---------------------------------------------------------------------------

async function persistActive(conversation: StoredConversation): Promise<void> {
  const updated: StoredConversation = { ...conversation, updatedAt: new Date().toISOString(), syncStatus: 'dirty' };
  conversationMemoryStore.setState((s) => ({
    ...s,
    activeConversation: updated,
    conversationSummaries: s.conversationSummaries.some((c) => c.id === updated.id)
      ? s.conversationSummaries.map((c) => (c.id === updated.id ? summarize(updated) : c))
      : [summarize(updated), ...s.conversationSummaries],
  }));
  await localAdapter.saveConversation(updated);
  orchestrator.markDirty(updated.id);
}

function summarize(c: StoredConversation): ConversationSummary {
  return { id: c.id, userId: c.userId, title: c.title, createdAt: c.createdAt, updatedAt: c.updatedAt, messageCount: c.messages.length, syncStatus: c.syncStatus };
}

function requireActive(): StoredConversation {
  const { activeConversation } = conversationMemoryStore.getState();
  if (!activeConversation) {
    throw new Error('[egen-civitas/esm-ai-memory] Aucune conversation active — appeler initConversationMemory() (et être connecté) avant toute mutation.');
  }
  return activeConversation;
}

/** Ajoute un message utilisateur à la conversation active et le persiste immédiatement. */
export async function addUserMessage(content: string): Promise<StoredMessage> {
  const active = requireActive();
  const message: StoredMessage = { id: generateId(), role: 'user', content, createdAt: new Date().toISOString(), status: 'done' };
  const messages = [...active.messages, message];
  const title = active.messages.length === 0 ? deriveTitle(content) : active.title;
  await persistActive({ ...active, messages, title });
  return message;
}

/** Ajoute un message assistant (éventuellement en cours de streaming) et le persiste. */
export async function addAssistantMessage(content: string, status: StoredMessage['status'] = 'done'): Promise<StoredMessage> {
  const active = requireActive();
  const message: StoredMessage = { id: generateId(), role: 'assistant', content, createdAt: new Date().toISOString(), status };
  await persistActive({ ...active, messages: [...active.messages, message] });
  return message;
}

/** Met à jour un message existant (ex: contenu final une fois le streaming terminé). */
export async function updateMessage(messageId: string, patch: Partial<StoredMessage>): Promise<void> {
  const active = requireActive();
  const messages = active.messages.map((m) => (m.id === messageId ? { ...m, ...patch } : m));
  await persistActive({ ...active, messages });
}

/** Enregistre un appel de tool (et son résultat complet, sans troncature) sur un message assistant. TOUT est conservé — voir types.ts. */
export async function recordToolCall(messageId: string, toolCall: StoredToolCall): Promise<void> {
  const active = requireActive();
  const messages = active.messages.map((m) => {
    if (m.id !== messageId) return m;
    const existing = m.toolCalls ?? [];
    const idx = existing.findIndex((t) => t.id === toolCall.id);
    const toolCalls = idx >= 0 ? existing.map((t, i) => (i === idx ? toolCall : t)) : [...existing, toolCall];
    return { ...m, toolCalls };
  });
  await persistActive({ ...active, messages });
}

/** Démarre une nouvelle conversation (l'ancienne reste dans l'historique, jamais supprimée). */
export async function startNewConversation(): Promise<StoredConversation> {
  const { userId, tenantId } = conversationMemoryStore.getState();
  if (!userId) throw new Error('[egen-civitas/esm-ai-memory] startNewConversation() nécessite un utilisateur connecté.');

  const conversation: StoredConversation = {
    id: generateId(),
    userId,
    tenantId,
    title: 'Nouvelle conversation',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [],
    syncStatus: 'local-only',
    lastSyncedAt: null,
  };
  await localAdapter.saveConversation(conversation);
  conversationMemoryStore.setState((s) => ({
    ...s,
    activeConversation: conversation,
    conversationSummaries: [summarize(conversation), ...s.conversationSummaries],
  }));
  return conversation;
}

/** Bascule sur une conversation existante de l'historique (voir conversationSummaries). */
export async function switchToConversation(conversationId: string): Promise<void> {
  const { userId } = conversationMemoryStore.getState();
  if (!userId) throw new Error('[egen-civitas/esm-ai-memory] switchToConversation() nécessite un utilisateur connecté.');
  const conversation = await localAdapter.getConversation(userId, conversationId);
  if (!conversation) throw new Error(`[egen-civitas/esm-ai-memory] Conversation "${conversationId}" introuvable.`);
  conversationMemoryStore.setState((s) => ({ ...s, activeConversation: conversation }));
}

/** Supprime définitivement une conversation (contrairement à startNewConversation, ceci EST destructif). */
export async function deleteConversation(conversationId: string): Promise<void> {
  const { userId, activeConversation } = conversationMemoryStore.getState();
  if (!userId) return;
  await localAdapter.deleteConversation(userId, conversationId);
  await backendAdapter.deleteConversation(userId, conversationId).catch(() => {});
  conversationMemoryStore.setState((s) => ({
    ...s,
    conversationSummaries: s.conversationSummaries.filter((c) => c.id !== conversationId),
  }));
  if (activeConversation?.id === conversationId) {
    await startNewConversation();
  }
}

export function getConversationMemoryState(): ConversationMemoryState {
  return conversationMemoryStore.getState();
}
