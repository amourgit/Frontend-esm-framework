// =============================================================================
//  @egen/esm-ai-memory — Hooks React
// =============================================================================

import { useState, useEffect } from 'react';
import { conversationMemoryStore, type ConversationMemoryState } from './store';
import type { StoredMessage, ConversationSummary } from './types';

function useMemoryStoreSelector<T>(select: (state: ConversationMemoryState) => T): T {
  const [value, setValue] = useState<T>(() => select(conversationMemoryStore.getState()));

  useEffect(() => {
    setValue(select(conversationMemoryStore.getState()));
    return conversationMemoryStore.subscribe((state) => setValue(select(state)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return value;
}

/** Messages de la conversation active — réactif, survit à un démontage/remontage du composant appelant. */
export function useConversationMessages(): StoredMessage[] {
  return useMemoryStoreSelector((s) => s.activeConversation?.messages ?? []);
}

/** Statut de chargement de la mémoire de conversation. */
export function useConversationMemoryStatus(): ConversationMemoryState['status'] {
  return useMemoryStoreSelector((s) => s.status);
}

/** Id de la conversation active, ou `null`. */
export function useActiveConversationId(): string | null {
  return useMemoryStoreSelector((s) => s.activeConversation?.id ?? null);
}

/** Résumés de TOUTES les conversations de l'utilisateur courant — base pour un futur sélecteur de conversation. */
export function useConversationSummaries(): ConversationSummary[] {
  return useMemoryStoreSelector((s) => s.conversationSummaries);
}
