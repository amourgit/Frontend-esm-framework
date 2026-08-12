import { describe, it, expect } from 'vitest';
import { createIndexedDBAdapter } from './indexeddb-adapter';
import type { StoredConversation } from '../types';

function makeConversation(id: string, userId: string, updatedAt = '2026-01-01T00:00:00Z'): StoredConversation {
  return {
    id,
    userId,
    tenantId: null,
    title: `Conv ${id}`,
    createdAt: updatedAt,
    updatedAt,
    messages: [{ id: 'm1', role: 'user', content: 'bonjour', createdAt: updatedAt }],
    syncStatus: 'local-only',
    lastSyncedAt: null,
  };
}

describe('indexeddb-adapter — CRUD', () => {
  it('sauvegarde puis relit une conversation intégralement (messages inclus)', async () => {
    const adapter = createIndexedDBAdapter();
    await adapter.saveConversation(makeConversation('c1', 'user-a'));

    const loaded = await adapter.getConversation('user-a', 'c1');
    expect(loaded?.id).toBe('c1');
    expect(loaded?.messages).toHaveLength(1);
  });
});

describe('indexeddb-adapter — isolation stricte par utilisateur', () => {
  it("un utilisateur ne peut jamais lire la conversation d'un autre, même en connaissant l'id", async () => {
    const adapter = createIndexedDBAdapter();
    await adapter.saveConversation(makeConversation('c2', 'user-a'));

    const wrongUser = await adapter.getConversation('user-b', 'c2');
    expect(wrongUser).toBeNull();
  });

  it('listConversations() ne retourne que les conversations du userId demandé, triées par updatedAt décroissant', async () => {
    const adapter = createIndexedDBAdapter();
    await adapter.saveConversation(makeConversation('c3', 'user-x', '2026-01-01T00:00:00Z'));
    await adapter.saveConversation(makeConversation('c4', 'user-x', '2026-01-03T00:00:00Z'));
    await adapter.saveConversation(makeConversation('c5', 'user-x', '2026-01-02T00:00:00Z'));
    await adapter.saveConversation(makeConversation('c6', 'user-y', '2026-01-09T00:00:00Z'));

    const list = await adapter.listConversations('user-x');
    expect(list).toHaveLength(3);
    expect(list.map((c) => c.id)).toEqual(['c4', 'c5', 'c3']);
  });

  it("deleteConversation() ignore silencieusement une tentative par un autre utilisateur", async () => {
    const adapter = createIndexedDBAdapter();
    await adapter.saveConversation(makeConversation('c7', 'user-a'));

    await adapter.deleteConversation('user-b', 'c7');
    expect(await adapter.getConversation('user-a', 'c7')).not.toBeNull();

    await adapter.deleteConversation('user-a', 'c7');
    expect(await adapter.getConversation('user-a', 'c7')).toBeNull();
  });
});

describe('indexeddb-adapter — persistance', () => {
  it('les données survivent à une nouvelle instance d\'adaptateur (≈ rechargement de page)', async () => {
    const adapter1 = createIndexedDBAdapter();
    await adapter1.saveConversation(makeConversation('c8', 'user-a'));

    const adapter2 = createIndexedDBAdapter();
    const reloaded = await adapter2.getConversation('user-a', 'c8');
    expect(reloaded).not.toBeNull();
  });
});
