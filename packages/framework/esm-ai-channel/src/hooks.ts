// Hooks React du canal.

import { useSyncExternalStore } from 'react';
import { getChannelStore } from './session.js';
import type { ChannelState } from './state.js';

/** État réactif du canal temps réel (statut, tentative de reconnexion, dernière erreur). */
export function useAIChannelState(): ChannelState {
  return useSyncExternalStore(
    (listener) => getChannelStore().subscribe(listener),
    () => getChannelStore().getState(),
    () => getChannelStore().getState(),
  );
}

export function useAIChannelReady(): boolean {
  return useAIChannelState().status === 'ready';
}
