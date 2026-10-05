import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sessionStore } from '@egen-civitas/esm-api';
import {
  initConversationMemory,
  _resetConversationMemory,
  _configureAdapters,
  addUserMessage,
  addAssistantMessage,
  recordToolCall,
  startNewConversation,
  getConversationMemoryState,
  mergeActiveConversation,
} from './store';
import type { StoredConversation, StoredMessage } from './types';
import { createIndexedDBAdapter, _clearAllData } from './adapters/indexeddb-adapter';
import { createBackendAdapter } from './adapters/backend-adapter';

// =============================================================================
//  Reproduit le scénario exact rapporté : fermeture du widget (le store est
//  un singleton module-level, donc "fermer" un composant qui le lit ne le
//  détruit jamais), actualisation de page (reset + réinitialisation, la
//  persistance IndexedDB doit survivre), et changement d'utilisateur
//  (isolation stricte — jamais l'historique d'un autre).
// =============================================================================

function login(uuid: string, username: string) {
  sessionStore.setState({ loaded: true, session: { authenticated: true, user: { uuid, username, display: username }, sessionId: 's' } }, true);
}
function logout() {
  sessionStore.setState({ loaded: true, session: { authenticated: false } }, true);
}
async function waitFor(predicate: () => boolean, timeout = 2000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (predicate()) return true;
    await new Promise((r) => setTimeout(r, 10));
  }
  return false;
}

// fake-indexeddb garde son contenu en mémoire pour toute la durée du process
// de test (aucun reset automatique entre les `it()`). Sans purge explicite,
// les messages écrits par un test précédent pour le même userId fuitent vers
// le test suivant. On purge via les méthodes de l'adapter lui-même (pas de
// manipulation IndexedDB brute) : un open() manuel avec sa propre gestion
// d'onupgradeneeded court-circuiterait la création du schéma par
// indexeddb-adapter.ts (dbPromise est mis en cache au niveau module — le
// PREMIER open() qui déclenche la mise à niveau de version fixe le schéma
// pour toute la suite du fichier de test).
const KNOWN_TEST_USER_IDS = ['user-samuel', 'user-amina'];

async function purgeMemoryDatabase(): Promise<void> {
  const adapter = createIndexedDBAdapter();
  for (const userId of KNOWN_TEST_USER_IDS) {
    const summaries = await adapter.listConversations(userId);
    for (const summary of summaries) {
      await adapter.deleteConversation(userId, summary.id);
    }
  }
}

beforeEach(async () => {
  await purgeMemoryDatabase();
  _resetConversationMemory();
  _configureAdapters(createIndexedDBAdapter(), createBackendAdapter());
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  logout();
});

describe('conversation memory — cycle de vie complet', () => {
  it('crée automatiquement une conversation à la connexion', async () => {
    initConversationMemory();
    login('user-samuel', 'samuel');

    await waitFor(() => getConversationMemoryState().status === 'ready');

    const state = getConversationMemoryState();
    expect(state.userId).toBe('user-samuel');
    expect(state.activeConversation).not.toBeNull();
  });

  it('conserve le résultat BRUT COMPLET de chaque appel de tool, pas un résumé', async () => {
    initConversationMemory();
    login('user-samuel', 'samuel');
    await waitFor(() => getConversationMemoryState().status === 'ready');

    await addUserMessage('Nous sommes dans quel tenant ?');
    const assistantMsg = await addAssistantMessage('Je vérifie...', 'done');
    await recordToolCall(assistantMsg.id, {
      id: 'tool-1',
      tool: 'inspect_element',
      arguments: { selector: '.tenant-banner' },
      status: 'success',
      result: { success: true, data: { computedStyle: { allProperties: { color: 'red' } } }, durationMs: 42 },
      startedAt: '2026-08-11T10:00:00Z',
      completedAt: '2026-08-11T10:00:01Z',
    });

    const stored = getConversationMemoryState().activeConversation!.messages[1];
    expect(stored.toolCalls?.[0]?.tool).toBe('inspect_element');
    expect((stored.toolCalls?.[0]?.result?.data as any)?.computedStyle?.allProperties?.color).toBe('red');
  });

  it("le rafraîchissement d'arrière-plan n'efface pas les messages ajoutés pendant qu'il lit la base (course)", async () => {
    // Scénario réel : juste après la connexion, l'hydratation backend se termine et relit la
    // conversation dans IndexedDB… pendant que l'utilisateur envoie déjà un message. La lecture
    // renvoie alors une copie « d'avant » (sans les nouveaux messages) qui ne doit PAS remplacer l'état.
    const real = createIndexedDBAdapter();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let refreshReadStarted = false;
    _configureAdapters(
      {
        ...real,
        getConversation: async (userId, conversationId) => {
          const snapshot = await real.getConversation(userId, conversationId); // copie prise AVANT les ajouts
          refreshReadStarted = true;
          await gate; // la lecture « arrive » après les ajouts de l'utilisateur
          return snapshot;
        },
      },
      createBackendAdapter(),
    );

    initConversationMemory();
    login('user-samuel', 'samuel');
    await waitFor(() => getConversationMemoryState().status === 'ready');
    expect(await waitFor(() => refreshReadStarted)).toBe(true);

    await addUserMessage('Question posée pendant le rafraîchissement');
    await addAssistantMessage('Réponse streamée', 'done');
    expect(getConversationMemoryState().activeConversation!.messages).toHaveLength(2);

    release(); // le rafraîchissement termine avec sa copie périmée
    await new Promise((r) => setTimeout(r, 100));

    const messages = getConversationMemoryState().activeConversation!.messages;
    expect(messages.map((m) => m.content)).toEqual(['Question posée pendant le rafraîchissement', 'Réponse streamée']);
    // le résumé de la liste suit aussi (pas de compteur périmé)
    const summary = getConversationMemoryState().conversationSummaries.find((c) => c.id === getConversationMemoryState().activeConversation!.id);
    expect(summary?.messageCount).toBe(2);
  });

  it("survit à une 'actualisation de page' (reset du store réactif — IndexedDB doit conserver l'historique)", async () => {
    initConversationMemory();
    login('user-samuel', 'samuel');
    await waitFor(() => getConversationMemoryState().status === 'ready');

    await addUserMessage('Message avant actualisation');
    const conversationId = getConversationMemoryState().activeConversation!.id;

    // Simule une actualisation de page complète : tout l'état réactif en mémoire disparaît.
    _resetConversationMemory();
    expect(getConversationMemoryState().activeConversation).toBeNull();

    // La page se recharge : réinitialisation, la session est toujours valide (cookie).
    initConversationMemory();
    login('user-samuel', 'samuel'); // ré-émission de l'état de session courant, comme au chargement d'une page authentifiée
    await waitFor(() => getConversationMemoryState().status === 'ready');

    const restored = getConversationMemoryState();
    expect(restored.activeConversation?.id).toBe(conversationId);
    expect(restored.activeConversation?.messages).toHaveLength(1);
    expect(restored.activeConversation?.messages[0].content).toBe('Message avant actualisation');
  });

  it("isole strictement les conversations par utilisateur — jamais l'historique d'un autre", async () => {
    initConversationMemory();

    login('user-samuel', 'samuel');
    await waitFor(() => getConversationMemoryState().status === 'ready');
    await addUserMessage('Message de samuel');

    logout();
    await waitFor(() => getConversationMemoryState().userId === null);

    login('user-amina', 'amina');
    await waitFor(() => getConversationMemoryState().status === 'ready');
    expect(getConversationMemoryState().activeConversation?.messages).toHaveLength(0);
    await addUserMessage('Message d\'amina');

    logout();
    await waitFor(() => getConversationMemoryState().userId === null);
    login('user-samuel', 'samuel');
    await waitFor(() => getConversationMemoryState().status === 'ready');

    const samuelAgain = getConversationMemoryState();
    expect(samuelAgain.activeConversation?.messages).toHaveLength(1);
    expect(samuelAgain.activeConversation?.messages[0].content).toBe('Message de samuel');
  });

  it("startNewConversation() n'efface jamais l'historique précédent", async () => {
    initConversationMemory();
    login('user-samuel', 'samuel');
    await waitFor(() => getConversationMemoryState().status === 'ready');
    await addUserMessage('Première conversation');

    const countBefore = getConversationMemoryState().conversationSummaries.length;
    await startNewConversation();
    await addUserMessage('Deuxième conversation');

    const state = getConversationMemoryState();
    expect(state.conversationSummaries.length).toBe(countBefore + 1);
    expect(state.activeConversation?.messages[0].content).toBe('Deuxième conversation');
  });

  it('vide le contexte actif à la déconnexion sans supprimer les données', async () => {
    initConversationMemory();
    login('user-samuel', 'samuel');
    await waitFor(() => getConversationMemoryState().status === 'ready');
    await addUserMessage('Ne doit pas être perdu');

    logout();
    await waitFor(() => getConversationMemoryState().userId === null);
    expect(getConversationMemoryState().activeConversation).toBeNull();

    login('user-samuel', 'samuel');
    await waitFor(() => getConversationMemoryState().status === 'ready');
    expect(getConversationMemoryState().activeConversation?.messages[0].content).toBe('Ne doit pas être perdu');
  });
});

describe('mergeActiveConversation', () => {
  const msg = (id: string, content: string, status: StoredMessage['status'] = 'done'): StoredMessage => ({ id, role: 'user', content, createdAt: '2026-10-05T10:00:00Z', status });
  const conv = (messages: StoredMessage[], updatedAt = '2026-10-05T10:00:00Z', id = 'c1'): StoredConversation => ({
    id,
    userId: 'u',
    tenantId: null,
    title: 'T',
    createdAt: '2026-10-05T09:00:00Z',
    updatedAt,
    messages,
    syncStatus: 'dirty',
    lastSyncedAt: null,
  });

  it("garde les messages présents seulement en mémoire (pas encore écrits en base)", () => {
    const merged = mergeActiveConversation(conv([msg('1', 'a'), msg('2', 'b')]), conv([msg('1', 'a')]));
    expect(merged!.messages.map((m) => m.id)).toEqual(['1', '2']);
  });

  it('ajoute les messages rapatriés du backend (présents seulement en base)', () => {
    const merged = mergeActiveConversation(conv([msg('1', 'a')]), conv([msg('0', 'ancien'), msg('1', 'a')]));
    expect(merged!.messages.map((m) => m.id)).toEqual(['0', '1']);
  });

  it("la version en mémoire l'emporte pour un même message (streaming en cours)", () => {
    const merged = mergeActiveConversation(conv([msg('1', 'texte complet', 'done')]), conv([msg('1', 'tex', 'streaming')]));
    expect(merged!.messages[0]).toMatchObject({ content: 'texte complet', status: 'done' });
  });

  it("ne touche pas l'état si l'utilisateur est passé sur une autre conversation", () => {
    const current = conv([msg('1', 'a')], '2026-10-05T10:00:00Z', 'c2');
    expect(mergeActiveConversation(current, conv([msg('9', 'z')], '2026-10-05T10:00:00Z', 'c1'))).toBe(current);
  });

  it('retourne la copie de la base quand rien n\'est actif en mémoire, et rien si les deux sont absents', () => {
    const stored = conv([msg('1', 'a')]);
    expect(mergeActiveConversation(null, stored)).toBe(stored);
    expect(mergeActiveConversation(null, null)).toBeNull();
  });
});
