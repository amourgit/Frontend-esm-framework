// État observable du canal — consommé par l'UI (useSyncExternalStore).

export type ChannelStatus =
  | 'idle'
  | 'disabled'
  | 'connecting'
  | 'handshaking'
  | 'ready'
  | 'reconnecting'
  | 'unauthorized'
  | 'incompatible'
  | 'closed';

export interface ChannelState {
  status: ChannelStatus;
  sessionId: string | null;
  /** Numéro de la tentative de (re)connexion en cours (0 = première) */
  attempt: number;
  lastError: string | null;
  lastReadyAt: number | null;
}

export interface ChannelStore {
  getState(): ChannelState;
  setState(next: ChannelState | ((s: ChannelState) => ChannelState)): void;
  subscribe(listener: () => void): () => void;
}

export const INITIAL_CHANNEL_STATE: ChannelState = {
  status: 'idle',
  sessionId: null,
  attempt: 0,
  lastError: null,
  lastReadyAt: null,
};

export function createChannelStore(initial: ChannelState = INITIAL_CHANNEL_STATE): ChannelStore {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    getState: () => state,
    setState(next) {
      const value = typeof next === 'function' ? next(state) : next;
      if (shallowEqual(state, value)) return;
      state = value;
      for (const l of [...listeners]) l();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function shallowEqual(a: ChannelState, b: ChannelState): boolean {
  return (
    a.status === b.status &&
    a.sessionId === b.sessionId &&
    a.attempt === b.attempt &&
    a.lastError === b.lastError &&
    a.lastReadyAt === b.lastReadyAt
  );
}
