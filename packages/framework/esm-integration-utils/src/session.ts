import { getSessionStore, type Session } from '@egen-civitas/esm-api';
import type { Unsubscribe } from './types.js';

/** Observe la session ; n'émet qu'une fois la session chargée (comme `useSession`). */
export function watchSession(onChange: (session: Session) => void): Unsubscribe {
  const handle = ({ loaded, session }: { loaded: boolean; session: Session }) => {
    if (loaded) onChange(session);
  };
  const store = getSessionStore();
  handle(store.getState() as any);
  return store.subscribe(handle as any);
}

export function whenSessionLoaded(): Promise<Session> {
  return new Promise((resolve) => {
    let done = false;
    let stop: Unsubscribe | undefined;
    stop = watchSession((s) => {
      done = true;
      resolve(s);
      stop?.();
    });
    if (done) stop();
  });
}
