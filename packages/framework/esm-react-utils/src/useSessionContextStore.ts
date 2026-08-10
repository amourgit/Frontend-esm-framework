import { useEffect, useId } from 'react';
import { getWorkSessionStore, type WorkSession, type WorkSessionStoreState } from '@egen/esm-data-api';
import { type Actions, useStoreWithActions } from './useStore';

const sessionContextStoreActions = {
  setSessionContext(_: WorkSessionStoreState, newSelectedSession: WorkSession | null) {
    if (newSelectedSession == null) {
      return { manuallySetSessionUuid: null };
    }
    return {
      manuallySetSessionUuid: newSelectedSession.uuid,
      entityUuid: newSelectedSession.entity?.uuid,
    };
  },
  mutateSession(currState: WorkSessionStoreState) {
    for (const mutateCallback of Object.values(currState.mutateSessionCallbacks ?? {})) {
      mutateCallback();
    }
    return {};
  },
} satisfies Actions<WorkSessionStoreState>;

/**
 * A hook to return the session context store and corresponding actions.
 *
 * @param mutateSessionCallback An optional mutate callback to register. If provided, the
 * store action's `mutateSession` function will invoke this callback (along with any other
 * callbacks also registered into the store).
 *
 * @example
 * ```tsx
 * import { useSessionContextStore } from '@egen/esm-framework';
 * function SessionManager() {
 *   const { currentSession, setSessionContext } = useSessionContextStore();
 *   return <div>Current: {currentSession?.uuid}</div>;
 * }
 * ```
 */
export function useSessionContextStore(mutateSessionCallback?: () => void) {
  const id = useId();

  useEffect(() => {
    const sessionStore = getWorkSessionStore();

    if (mutateSessionCallback) {
      sessionStore.setState({
        mutateSessionCallbacks: {
          ...sessionStore.getState().mutateSessionCallbacks,
          [id]: mutateSessionCallback,
        },
      });
    }

    return () => {
      if (mutateSessionCallback) {
        const mutateSessionCallbacks = { ...sessionStore.getState().mutateSessionCallbacks };
        delete mutateSessionCallbacks[id];
        sessionStore.setState({ mutateSessionCallbacks });
      }
    };
  }, [id, mutateSessionCallback]);

  return useStoreWithActions(getWorkSessionStore(), sessionContextStoreActions);
}
