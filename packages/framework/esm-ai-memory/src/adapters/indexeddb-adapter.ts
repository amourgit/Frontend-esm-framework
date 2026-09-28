// =============================================================================
//  @egen-civitas/esm-ai-memory — Adaptateur de stockage local (IndexedDB)
//
//  POURQUOI IndexedDB et pas localStorage :
//  localStorage est limité à ~5-10 Mo PAR ORIGINE (partagé avec tout le
//  reste de l'app) et son API est synchrone/bloquante. Avec la consigne
//  "TOUT" (chaque appel de tool ET son résultat brut complet — voir
//  types.ts), et des tools qui peuvent légitimement renvoyer des rapports
//  volumineux (ex: inspect_interface de @egen-civitas/esm-ai-tools, des centaines
//  de Ko par appel), localStorage saturerait vite (QuotaExceededError).
//  IndexedDB est asynchrone, structuré, et dispose d'un quota bien plus
//  large (typiquement des centaines de Mo à plusieurs Go selon le
//  navigateur/disque) — le bon choix technique pour "le stockage local du
//  navigateur" tel que demandé, au sens large (client-side, pas
//  serveur), pas au sens strict de l'API `localStorage`.
//
//  ROBUSTESSE : si IndexedDB est indisponible (navigateur très ancien,
//  restrictions de confidentialité strictes) TOUTES les méthodes dégradent
//  silencieusement (retour vide/null, écriture ignorée) — jamais d'erreur
//  qui casse la conversation en cours, qui reste fonctionnelle en mémoire
//  vive pour la session (voir store.ts).
// =============================================================================

import type { ConversationStorageAdapter, ConversationSummary, StoredConversation } from '../types.js';

const DB_NAME = 'egen-ai-memory';
const DB_VERSION = 1;
const STORE_NAME = 'conversations';
const USER_ID_INDEX = 'by-userId';
const USER_UPDATED_INDEX = 'by-userId-updatedAt';

function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex(USER_ID_INDEX, 'userId', { unique: false });
          store.createIndex(USER_UPDATED_INDEX, ['userId', 'updatedAt'], { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
}

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function toSummary(conversation: StoredConversation): ConversationSummary {
  return {
    id: conversation.id,
    userId: conversation.userId,
    title: conversation.title,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    messageCount: conversation.messages.length,
    syncStatus: conversation.syncStatus,
  };
}

export function createIndexedDBAdapter(): ConversationStorageAdapter {
  if (!isIndexedDBAvailable()) {
    if (typeof console !== 'undefined') {
      console.warn('[egen-civitas/esm-ai-memory] IndexedDB indisponible — persistance locale désactivée pour cette session.');
    }
    return {
      name: 'indexeddb (indisponible)',
      listConversations: async () => [],
      getConversation: async () => null,
      saveConversation: async () => {},
      deleteConversation: async () => {},
    };
  }

  return {
    name: 'indexeddb',

    async listConversations(userId: string): Promise<ConversationSummary[]> {
      try {
        const db = await openDatabase();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const index = tx.objectStore(STORE_NAME).index(USER_ID_INDEX);
        const all = await promisifyRequest(index.getAll(IDBKeyRange.only(userId)));
        return (all as StoredConversation[]).map(toSummary).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      } catch (err) {
        console.warn('[egen-civitas/esm-ai-memory] listConversations() a échoué, dégradation en liste vide:', err);
        return [];
      }
    },

    async getConversation(userId: string, conversationId: string): Promise<StoredConversation | null> {
      try {
        const db = await openDatabase();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const result = await promisifyRequest<StoredConversation | undefined>(tx.objectStore(STORE_NAME).get(conversationId));
        // Vérification défensive de propriété : ne jamais retourner la conversation d'un autre utilisateur
        // même en cas d'erreur de logique appelante (l'id seul ne suffit pas comme garantie d'isolation).
        if (!result || result.userId !== userId) return null;
        return result;
      } catch (err) {
        console.warn('[egen-civitas/esm-ai-memory] getConversation() a échoué:', err);
        return null;
      }
    },

    async saveConversation(conversation: StoredConversation): Promise<void> {
      try {
        const db = await openDatabase();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        await promisifyRequest(tx.objectStore(STORE_NAME).put(conversation));
      } catch (err) {
        console.warn('[egen-civitas/esm-ai-memory] saveConversation() a échoué (quota dépassé ?), non bloquant:', err);
      }
    },

    async deleteConversation(userId: string, conversationId: string): Promise<void> {
      try {
        const db = await openDatabase();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const existing = await promisifyRequest<StoredConversation | undefined>(store.get(conversationId));
        if (existing && existing.userId === userId) {
          await promisifyRequest(store.delete(conversationId));
        }
      } catch (err) {
        console.warn('[egen-civitas/esm-ai-memory] deleteConversation() a échoué:', err);
      }
    },
  };
}

/** @internal Réservé aux tests — force la réouverture de la base à la prochaine opération. */
export function _resetIndexedDBConnection(): void {
  dbPromise = null;
}

/** @internal Réservé aux tests — supprime TOUTES les conversations de la base (cleanup entre tests). */
export async function _clearAllData(): Promise<void> {
  if (!isIndexedDBAvailable()) return;
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    await promisifyRequest(tx.objectStore(STORE_NAME).clear());
  } catch (err) {
    console.warn('[egen-civitas/esm-ai-memory] _clearAllData() a échoué:', err);
  }
}
