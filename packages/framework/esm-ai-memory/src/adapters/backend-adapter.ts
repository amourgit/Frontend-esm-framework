// =============================================================================
//  @egen-civitas/esm-ai-memory — Adaptateur de stockage backend (REST, prêt pour
//  quand le backend existera)
//
//  CONTRAT REST ATTENDU (à implémenter côté backend — voir chaque méthode) :
//    GET    /ai/conversations              → ConversationSummary[] (utilisateur authentifié implicite via session)
//    GET    /ai/conversations/:id          → StoredConversation
//    PUT    /ai/conversations/:id          → upsert intégral, body = StoredConversation
//    DELETE /ai/conversations/:id          → 204
//
//  ROBUSTESSE — CE POINT EST CRITIQUE : le backend n'existe pas encore
//  aujourd'hui. TOUTE méthode de cet adaptateur doit dégrader silencieusement
//  (jamais lever, jamais bloquer) si l'appel échoue (réseau, 404, backend
//  non déployé) — le stockage local (IndexedDB) reste alors la seule source
//  de vérité, sans aucune interruption de service pour l'utilisateur. Le
//  sync-orchestrator retente simplement au prochain cycle.
//
//  SOUVERAINETÉ : utilise egenFetch (voir @egen-civitas/esm-api), qui injecte
//  déjà l'authentification de session ET le header X-Tenant-ID — aucune
//  logique d'authentification ou de scoping tenant à dupliquer ici.
// =============================================================================

import { egenFetch } from '@egen-civitas/esm-api';
import type { ConversationStorageAdapter, ConversationSummary, StoredConversation } from '../types.js';

function warnOnce(message: string, err: unknown): void {
  if (typeof console !== 'undefined') {
    console.warn(`[egen-civitas/esm-ai-memory] ${message} (backend probablement indisponible) :`, err);
  }
}

export function createBackendAdapter(): ConversationStorageAdapter {
  return {
    name: 'backend',

    async listConversations(userId: string): Promise<ConversationSummary[]> {
      try {
        const res = await egenFetch<ConversationSummary[]>('/ai/conversations');
        if (!res.ok) return [];
        // Filtre défensif : ne fait confiance qu'au userId réellement retourné par chaque
        // enregistrement, même si le endpoint est censé déjà scoper par session.
        return (res.data ?? []).filter((c) => c.userId === userId);
      } catch (err) {
        warnOnce('listConversations() a échoué', err);
        return [];
      }
    },

    async getConversation(userId: string, conversationId: string): Promise<StoredConversation | null> {
      try {
        const res = await egenFetch<StoredConversation>(`/ai/conversations/${encodeURIComponent(conversationId)}`);
        if (!res.ok || !res.data) return null;
        if (res.data.userId !== userId) return null;
        return res.data;
      } catch (err) {
        warnOnce('getConversation() a échoué', err);
        return null;
      }
    },

    async saveConversation(conversation: StoredConversation): Promise<void> {
      try {
        await egenFetch(`/ai/conversations/${encodeURIComponent(conversation.id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(conversation),
        });
      } catch (err) {
        warnOnce('saveConversation() a échoué — restera "dirty", nouvelle tentative au prochain cycle', err);
        throw err; // le sync-orchestrator a besoin de savoir que ça a échoué pour ne PAS marquer "synced"
      }
    },

    async deleteConversation(userId: string, conversationId: string): Promise<void> {
      try {
        await egenFetch(`/ai/conversations/${encodeURIComponent(conversationId)}`, { method: 'DELETE' });
      } catch (err) {
        warnOnce('deleteConversation() a échoué', err);
      }
    },
  };
}
