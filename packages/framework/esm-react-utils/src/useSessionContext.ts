/** @module @category API */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import useSWR from 'swr';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday.js';
import { egenFetch, restBaseUrl } from '@egen/esm-api';
import { defaultWorkSessionCustomRepresentation, type WorkSession } from '@egen/esm-data-api';
import { useSessionContextStore } from './useSessionContextStore';

dayjs.extend(isToday);

export interface SessionContextReturnType {
  error: Error;
  mutate: () => void;
  isValidating: boolean;
  activeSession: WorkSession | null;
  currentSession: WorkSession | null;
  currentSessionIsRetrospective: boolean;
  isLoading: boolean;
}

/**
 * This React hook returns session information for an entity. There are
 * potentially two relevant sessions at a time: "active" and "current".
 *
 * The active session is the most recent session without an end date, meaning
 * the entity is currently in an open session.
 *
 * The current session is the active session, unless a retrospective session
 * has been manually selected. `currentSessionIsRetrospective` indicates this.
 *
 * @param entityUuid Unique entity identifier string
 * @param representation The custom representation of the session
 *
 * @example
 * ```tsx
 * import { useSessionContext } from '@egen/esm-framework';
 * function EntityWorkSessionStatus({ entityUuid }) {
 *   const { activeSession, isLoading } = useSessionContext(entityUuid);
 *   if (isLoading) return <Spinner />;
 *   return <div>{activeSession ? 'In active session' : 'No active session'}</div>;
 * }
 * ```
 */
export function useSessionContext(
  entityUuid: string,
  representation = defaultWorkSessionCustomRepresentation,
): SessionContextReturnType {
  const { entityUuid: sessionStoreEntityUuid, manuallySetSessionUuid, setSessionContext } = useSessionContextStore();

  const retrospectiveSessionUuid = entityUuid && sessionStoreEntityUuid == entityUuid ? manuallySetSessionUuid : null;
  const activeSessionUrlSuffix = `?entity=${entityUuid}&v=${representation}&includeInactive=false`;
  const retrospectiveSessionUrlSuffix = `/${retrospectiveSessionUuid}?v=${representation}`;

  const {
    data: activeData,
    error: activeError,
    mutate: activeMutate,
    isValidating: activeIsValidating,
  } = useSWR<{
    data: { results: Array<WorkSession> };
  }>(entityUuid ? `${restBaseUrl}/session${activeSessionUrlSuffix}` : null, egenFetch);

  const {
    data: retroData,
    error: retroError,
    mutate: retroMutate,
    isValidating: retroIsValidating,
  } = useSWR<{
    data: WorkSession;
  }>(
    entityUuid && retrospectiveSessionUuid ? `${restBaseUrl}/session${retrospectiveSessionUrlSuffix}` : null,
    egenFetch,
  );

  const activeSession = useMemo(
    () => activeData?.data.results.find((s) => s.stopDatetime === null) ?? null,
    [activeData],
  );

  const currentSession = useMemo(
    () => (retrospectiveSessionUuid && retroData ? retroData.data : null),
    [retroData, retrospectiveSessionUuid],
  );

  const previousCurrentSession = useRef<WorkSession | null>(null);

  useEffect(() => {
    if (
      !activeIsValidating &&
      activeSession &&
      sessionStoreEntityUuid === entityUuid &&
      manuallySetSessionUuid === null
    ) {
      setSessionContext(activeSession);
    }
    if (!retroIsValidating) {
      if (
        previousCurrentSession.current &&
        currentSession &&
        previousCurrentSession.current.uuid === currentSession.uuid &&
        !previousCurrentSession.current.stopDatetime &&
        currentSession.stopDatetime
      ) {
        setSessionContext(null);
      }
      previousCurrentSession.current = currentSession;
    }
  }, [
    currentSession,
    manuallySetSessionUuid,
    activeSession,
    activeIsValidating,
    retroIsValidating,
    sessionStoreEntityUuid,
  ]);

  const mutateSession = useCallback(() => {
    activeMutate();
    retroMutate();
  }, [activeMutate, retroMutate]);

  useSessionContextStore(mutateSession);

  const waitingForData = Boolean(!activeData || (retrospectiveSessionUuid && !retroData));
  const hasRelevantError = Boolean(retrospectiveSessionUuid ? retroError : activeError);
  const isLoading = waitingForData && !hasRelevantError;

  return {
    error: activeError || retroError,
    mutate: mutateSession,
    isValidating: activeIsValidating || retroIsValidating,
    activeSession,
    currentSession,
    currentSessionIsRetrospective: Boolean(retrospectiveSessionUuid),
    isLoading,
  };
}
