// =============================================================================
//  @egen-civitas/esm-ai-memory — Orchestrateur de synchronisation local ↔ backend
//
//  RÈGLE EXACTE DEMANDÉE :
//  - Le stockage LOCAL (IndexedDB) est mis à jour à CHAQUE interaction —
//    immédiat, jamais de latence perçue par l'utilisateur.
//  - La synchronisation vers le BACKEND se fait après 3 minutes passées
//    pour une conversation qui a des changements en attente ("dirty") —
//    pas à chaque message, pour ne pas multiplier les requêtes réseau.
//  - À la connexion (changement d'utilisateur détecté par le store, voir
//    store.ts), on hydrate D'ABORD le local depuis le backend, pour repartir
//    avec l'historique le plus à jour avant de continuer la conversation
//    (ex: l'utilisateur a continué sur un autre appareil entre-temps).
//
//  STRATÉGIE DE FUSION (hydratation) : "dernière écriture gagne" par
//  comparaison de `updatedAt`, conversation par conversation. Simple,
//  prévisible, documenté comme compromis assumé (pas de fusion à la
//  granularité du message façon CRDT — inutile pour ce cas d'usage : les
//  conflits multi-appareils simultanés sur l'assistant IA sont un cas limite
//  rare, pas le chemin principal à optimiser).
//
//  ROBUSTESSE : un backend absent (le cas aujourd'hui) ne bloque JAMAIS le
//  local — voir backend-adapter.ts. Le minuteur de sync continue de tourner
//  sans effet de bord si le backend échoue systématiquement (juste des
//  tentatives régulières, silencieuses, qui laissent la conversation "dirty").
//
//  SÉQUENCEMENT AU CHANGEMENT D'UTILISATEUR (orchestré par store.ts, pas ici) :
//  1. flushNow()                    — best-effort, tente de sauver les
//                                      changements en attente de l'utilisateur
//                                      SORTANT avant de quitter son contexte
//  2. setActiveUser(newUserId)      — bascule le contexte
//  3. hydrateFromBackend(newUserId) — rapatrie l'historique à jour du nouvel
//                                      utilisateur AVANT que la conversation ne reprenne
// =============================================================================

import { AI_EVENTS, dispatchAIEvent } from '@egen-civitas/esm-ai-events';
import type { ConversationStorageAdapter } from './types';

const SYNC_DEBOUNCE_MS = 3 * 60 * 1000; // 3 minutes — voir en-tête de fichier
const SYNC_CHECK_INTERVAL_MS = 20 * 1000; // fréquence de VÉRIFICATION, pas fréquence d'ENVOI

interface DirtyEntry {
  dirtySince: number;
}

export interface SyncOrchestratorOptions {
  local: ConversationStorageAdapter;
  backend: ConversationStorageAdapter;
  /** @internal — overrides pour les tests, évite d'attendre 3 vraies minutes. */
  syncDebounceMs?: number;
  checkIntervalMs?: number;
}

export interface ConversationSyncOrchestrator {
  setActiveUser(userId: string | null): void;
  markDirty(conversationId: string): void;
  /** Nombre de conversations actuellement en attente de synchronisation (diagnostic/tests). */
  getDirtyCount(): number;
  /** Tente une synchronisation immédiate de toutes les conversations "dirty" de l'utilisateur actif. */
  flushNow(): Promise<void>;
  /** Rapatrie l'historique backend de `userId` et le fusionne dans le local (dernière écriture gagne). */
  hydrateFromBackend(userId: string): Promise<void>;
  /** Démarre le minuteur périodique (vérifie toutes les checkIntervalMs si des conversations ont dépassé syncDebounceMs). */
  start(): void;
  stop(): void;
}

export function createSyncOrchestrator(options: SyncOrchestratorOptions): ConversationSyncOrchestrator {
  const { local, backend } = options;
  const debounceMs = options.syncDebounceMs ?? SYNC_DEBOUNCE_MS;
  const checkIntervalMs = options.checkIntervalMs ?? SYNC_CHECK_INTERVAL_MS;

  const dirty = new Map<string, DirtyEntry>();
  let currentUserId: string | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;

  async function syncOne(conversationId: string): Promise<void> {
    if (!currentUserId) return;
    try {
      const conversation = await local.getConversation(currentUserId, conversationId);
      if (!conversation) {
        dirty.delete(conversationId);
        return;
      }
      await backend.saveConversation(conversation);
      dirty.delete(conversationId);
      await local.saveConversation({ ...conversation, syncStatus: 'synced', lastSyncedAt: new Date().toISOString() });
      dispatchAIEvent(AI_EVENTS.MEMORY_SYNC_SUCCEEDED, { conversationId, adapter: backend.name });
    } catch (err) {
      dispatchAIEvent(AI_EVENTS.MEMORY_SYNC_FAILED, { conversationId, adapter: backend.name, error: String(err) });
      // Reste "dirty" — nouvelle tentative au prochain cycle. Le backend-adapter
      // logue déjà l'échec une fois ; pas la peine de dupliquer le bruit ici.
    }
  }

  async function checkAndSyncDue(): Promise<void> {
    if (!currentUserId) return;
    const now = Date.now();
    const due = Array.from(dirty.entries())
      .filter(([, entry]) => now - entry.dirtySince >= debounceMs)
      .map(([id]) => id);
    await Promise.all(due.map((id) => syncOne(id)));
  }

  return {
    setActiveUser(userId: string | null) {
      currentUserId = userId;
      dirty.clear(); // le "dirty" d'un utilisateur ne doit jamais tenter de se synchroniser sous l'identité d'un autre
    },

    markDirty(conversationId: string) {
      if (!dirty.has(conversationId)) {
        dirty.set(conversationId, { dirtySince: Date.now() });
      }
    },

    getDirtyCount(): number {
      return dirty.size;
    },

    async flushNow() {
      if (!currentUserId) return;
      const ids = Array.from(dirty.keys());
      await Promise.allSettled(ids.map((id) => syncOne(id)));
    },

    async hydrateFromBackend(userId: string) {
      try {
        const remoteSummaries = await backend.listConversations(userId);
        let conversationsUpdated = 0;
        for (const summary of remoteSummaries) {
          const localConversation = await local.getConversation(userId, summary.id);
          if (!localConversation || localConversation.updatedAt < summary.updatedAt) {
            const full = await backend.getConversation(userId, summary.id);
            if (full) {
              await local.saveConversation({ ...full, syncStatus: 'synced', lastSyncedAt: new Date().toISOString() });
              conversationsUpdated++;
            }
          }
        }
        dispatchAIEvent(AI_EVENTS.MEMORY_HYDRATED, {
          userId,
          conversationId: remoteSummaries[0]?.id ?? '',
          messageCount: 0,
          conversationsUpdated,
        });
      } catch (err) {
        console.warn('[egen-civitas/esm-ai-memory] hydrateFromBackend() a échoué, historique local conservé tel quel:', err);
      }
    },

    start() {
      if (timer) return;
      timer = setInterval(() => {
        void checkAndSyncDue();
      }, checkIntervalMs);
    },

    stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    },
  };
}
