import { describe, it, expect, beforeEach } from 'vitest';
import { createSyncOrchestrator, type ConversationSyncOrchestrator } from './sync-orchestrator';
import type { ConversationStorageAdapter, StoredConversation } from './types';

function makeInMemoryAdapter(): ConversationStorageAdapter & { _raw: Map<string, StoredConversation> } {
  const store = new Map<string, StoredConversation>();
  return {
    name: 'mem',
    async listConversations(userId) {
      return Array.from(store.values())
        .filter((c) => c.userId === userId)
        .map((c) => ({ id: c.id, userId: c.userId, title: c.title, createdAt: c.createdAt, updatedAt: c.updatedAt, messageCount: c.messages.length, syncStatus: c.syncStatus }))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    async getConversation(userId, id) {
      const c = store.get(id);
      return c && c.userId === userId ? c : null;
    },
    async saveConversation(c) {
      store.set(c.id, c);
    },
    async deleteConversation(userId, id) {
      const c = store.get(id);
      if (c && c.userId === userId) store.delete(id);
    },
    _raw: store,
  };
}

function makeConversation(id: string, userId: string, updatedAt = '2026-01-01T00:00:00Z'): StoredConversation {
  return { id, userId, tenantId: null, title: 'Test', createdAt: updatedAt, updatedAt, messages: [], syncStatus: 'dirty', lastSyncedAt: null };
}

describe('sync-orchestrator — débounce et flush', () => {
  it('flushNow() synchronise immédiatement sans attendre le débounce', async () => {
    const local = makeInMemoryAdapter();
    const backend = makeInMemoryAdapter();
    const orchestrator = createSyncOrchestrator({ local, backend, syncDebounceMs: 999999, checkIntervalMs: 999999 });
    orchestrator.setActiveUser('user-a');

    await local.saveConversation(makeConversation('conv-1', 'user-a'));
    orchestrator.markDirty('conv-1');
    expect(orchestrator.getDirtyCount()).toBe(1);

    await orchestrator.flushNow();

    expect(orchestrator.getDirtyCount()).toBe(0);
    expect(backend._raw.has('conv-1')).toBe(true);
  });

  it('le minuteur périodique ne synchronise QUE après syncDebounceMs écoulé', async () => {
    const local = makeInMemoryAdapter();
    const backend = makeInMemoryAdapter();
    const orchestrator = createSyncOrchestrator({ local, backend, syncDebounceMs: 200, checkIntervalMs: 50 });
    orchestrator.setActiveUser('user-a');

    await local.saveConversation(makeConversation('conv-2', 'user-a'));
    orchestrator.markDirty('conv-2');
    orchestrator.start();

    await new Promise((r) => setTimeout(r, 100));
    expect(backend._raw.has('conv-2')).toBe(false);

    await new Promise((r) => setTimeout(r, 200));
    expect(backend._raw.has('conv-2')).toBe(true);

    orchestrator.stop();
  });

  it("setActiveUser() efface le 'dirty' de l'ancien utilisateur (isolation)", () => {
    const local = makeInMemoryAdapter();
    const backend = makeInMemoryAdapter();
    const orchestrator = createSyncOrchestrator({ local, backend });

    orchestrator.setActiveUser('user-a');
    orchestrator.markDirty('conv-a');
    expect(orchestrator.getDirtyCount()).toBe(1);

    orchestrator.setActiveUser('user-b');
    expect(orchestrator.getDirtyCount()).toBe(0);
  });
});

describe('sync-orchestrator — hydratation (fusion "dernière écriture gagne")', () => {
  it('reprend la version backend si elle est plus récente que le local', async () => {
    const local = makeInMemoryAdapter();
    const backend = makeInMemoryAdapter();
    const orchestrator = createSyncOrchestrator({ local, backend });

    const localOld = makeConversation('conv-3', 'user-a', '2026-01-01T00:00:00Z');
    const backendNew = { ...localOld, title: 'Mis à jour ailleurs', updatedAt: '2026-01-02T00:00:00Z' };
    await local.saveConversation(localOld);
    await backend.saveConversation(backendNew);

    await orchestrator.hydrateFromBackend('user-a');

    const merged = await local.getConversation('user-a', 'conv-3');
    expect(merged?.title).toBe('Mis à jour ailleurs');
  });

  it('NE remplace PAS une version locale plus récente que le backend', async () => {
    const local = makeInMemoryAdapter();
    const backend = makeInMemoryAdapter();
    const orchestrator = createSyncOrchestrator({ local, backend });

    const localNew = makeConversation('conv-4', 'user-a', '2026-01-05T00:00:00Z');
    localNew.title = 'Version locale récente';
    const backendOld = { ...localNew, title: 'Ancienne version', updatedAt: '2026-01-01T00:00:00Z' };
    await local.saveConversation(localNew);
    await backend.saveConversation(backendOld);

    await orchestrator.hydrateFromBackend('user-a');

    const result = await local.getConversation('user-a', 'conv-4');
    expect(result?.title).toBe('Version locale récente');
  });
});

describe('sync-orchestrator — robustesse face à un backend indisponible', () => {
  it('flushNow() et hydrateFromBackend() ne lèvent jamais, même si le backend échoue systématiquement', async () => {
    const local = makeInMemoryAdapter();
    const failingBackend: ConversationStorageAdapter = {
      name: 'failing',
      listConversations: async () => {
        throw new Error('backend down');
      },
      getConversation: async () => {
        throw new Error('backend down');
      },
      saveConversation: async () => {
        throw new Error('backend down');
      },
      deleteConversation: async () => {
        throw new Error('backend down');
      },
    };
    const orchestrator: ConversationSyncOrchestrator = createSyncOrchestrator({ local, backend: failingBackend });
    orchestrator.setActiveUser('user-a');
    await local.saveConversation(makeConversation('conv-5', 'user-a'));
    orchestrator.markDirty('conv-5');

    await expect(orchestrator.flushNow()).resolves.not.toThrow();
    await expect(orchestrator.hydrateFromBackend('user-a')).resolves.not.toThrow();
    expect(orchestrator.getDirtyCount()).toBe(1); // reste dirty, retentera plus tard
  });
});
