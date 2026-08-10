/** @module @category API */
import { egenFetch, restBaseUrl, type FetchResponse } from '@egen/esm-api';
import { getGlobalStore } from '@egen/esm-state';
import { BehaviorSubject } from 'rxjs';
import { type NewWorkSessionPayload, type UpdateWorkSessionPayload, type WorkSession } from './types';

export interface WorkSessionItem {
  mode: WorkSessionMode;
  sessionData?: WorkSession;
  status: WorkSessionStatus;
  anythingElse?: any;
}

export enum WorkSessionMode {
  NEW = 'startSession',
  EDIT = 'editSession',
  LOADING = 'loadingSession',
}

export enum WorkSessionStatus {
  NOTSTARTED = 'notStarted',
  ONGOING = 'ongoing',
}

export interface WorkSessionStoreState {
  entityUuid: string | null;
  manuallySetSessionUuid: string | null;

  /**
   * Stores a record of SWR mutate callbacks that should be called when
   * the WorkSession with the specified uuid is modified. The callbacks are keyed
   * by unique component IDs.
   */
  mutateSessionCallbacks: {
    [componentId: string]: () => void;
  };
}

/**
 * The default custom representation string for fetching session data from the REST API.
 */
export const defaultWorkSessionCustomRepresentation =
  'custom:(uuid,display,voided,indication,startDatetime,stopDatetime,' +
  'interactions:(uuid,display,interactionDatetime,' +
  'form:(uuid,name),location:ref,' +
  'interactionType:ref,' +
  'interactionHandlers:(uuid,display,' +
  'handler:(uuid,display))),' +
  'entity:(uuid,display),' +
  'sessionType:(uuid,name,display),' +
  'attributes:(uuid,display,attributeType:(name,datatypeClassname,uuid),value),' +
  'location:(uuid,name,display))';

const initialState: WorkSessionStoreState = getSessionSessionStorage() || {
  entityUuid: null,
  manuallySetSessionUuid: null,
  mutateSessionCallbacks: {},
};

/**
 * Returns the global session store that manages the current session state.
 *
 * @example
 * ```ts
 * import { getWorkSessionStore } from '@egen/esm-framework';
 * const store = getWorkSessionStore();
 * const unsubscribe = store.subscribe((state) => {
 *   console.log('Current entity:', state.entityUuid);
 * });
 * ```
 */
export function getWorkSessionStore() {
  return getGlobalStore<WorkSessionStoreState>('session', initialState);
}

/**
 * Sets the current session for an entity in the global session store.
 *
 * @param entityUuid The UUID of the entity.
 * @param sessionUuid The UUID of the session to set as current.
 */
export function setCurrentWorkSession(entityUuid: string, sessionUuid: string) {
  getWorkSessionStore().setState({ entityUuid, manuallySetSessionUuid: sessionUuid });
}

getWorkSessionStore().subscribe((state) => {
  setSessionSessionStorage(state);
});

function setSessionSessionStorage(value: WorkSessionStoreState) {
  sessionStorage.setItem('egen:sessionStoreState', JSON.stringify(value));
}

function getSessionSessionStorage(): WorkSessionStoreState | null {
  try {
    return JSON.parse(sessionStorage.getItem('egen:sessionStoreState') || 'null');
  } catch (e) {
    return null;
  }
}

/**
 * Creates a new session by sending a POST request to the REST API.
 *
 * @param payload The session data to create.
 * @param abortController An AbortController to allow cancellation of the request.
 */
export function saveWorkSession(payload: NewWorkSessionPayload, abortController: AbortController): Promise<FetchResponse<WorkSession>> {
  return egenFetch(`${restBaseUrl}/session`, {
    signal: abortController.signal,
    method: 'POST',
    headers: {
      'Content-type': 'application/json',
    },
    body: payload,
  });
}

/**
 * Updates an existing session by sending a POST request to the REST API.
 *
 * @param uuid The UUID of the session to update.
 * @param payload The session data to update.
 * @param abortController An AbortController to allow cancellation of the request.
 */
export function updateWorkSession(
  uuid: string,
  payload: UpdateWorkSessionPayload,
  abortController: AbortController,
): Promise<FetchResponse<WorkSession>> {
  return egenFetch(`${restBaseUrl}/session/${uuid}`, {
    signal: abortController.signal,
    method: 'POST',
    headers: {
      'Content-type': 'application/json',
    },
    body: payload,
  });
}

/**
 * @deprecated Use the `useSession` hook instead.
 */
export function getWorkSessionsForEntity(
  entityUuid: string,
  abortController: AbortController,
  v?: string,
): Promise<FetchResponse<{ results: Array<WorkSession> }>> {
  const custom = v ?? defaultWorkSessionCustomRepresentation;

  return egenFetch(`${restBaseUrl}/session?entity=${entityUuid}&v=${custom}`, {
    signal: abortController.signal,
    method: 'GET',
    headers: {
      'Content-type': 'application/json',
    },
  });
}

/** @deprecated */
export const getStartedWorkSession = new BehaviorSubject<WorkSessionItem | null>(null);
