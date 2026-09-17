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
} from './store';
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

beforeEach(async () => {
  await _clearAllData();
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
