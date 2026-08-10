/** @module @category API */
import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { fetchCurrentEntity } from '@egen/esm-data-api';

export type NullableEntity = fhir.Patient | null;

function getEntityUuidFromUrl() {
  const match = /\/entity\/([a-zA-Z0-9\-]+)\/?/.exec(location.pathname);
  return match && match[1];
}

/**
 * This React hook returns an entity object. If the `entityUuid` is provided
 * as a parameter, then the entity for that UUID is returned. If the parameter
 * is not provided, the entity UUID is obtained from the current route, and
 * a route listener is set up to update the entity whenever the route changes.
 *
 * @param entityUuid Optional UUID of the entity to fetch. If not provided,
 *   the UUID is extracted from the current URL path (`/entity/:uuid/`).
 * @returns An object containing the entity data, loading state, current entity UUID, and any error.
 *
 * @example
 * ```tsx
 * import { useEntity } from '@egen/esm-framework';
 * function EntityDetail({ entityUuid }) {
 *   const { entity, isLoading } = useEntity(entityUuid);
 *   if (isLoading) return <Spinner />;
 *   return <div>{entity?.name?.[0]?.text}</div>;
 * }
 * ```
 */
export function useEntity(entityUuid?: string) {
  const [currentEntityUuid, setCurrentEntityUuid] = useState(entityUuid ?? getEntityUuidFromUrl());

  const {
    data: entity,
    error,
    isValidating,
  } = useSWR<NullableEntity, Error | null>(currentEntityUuid ? ['entity', currentEntityUuid] : null, () =>
    fetchCurrentEntity(currentEntityUuid!, {}),
  );

  useEffect(() => {
    const handleRouteUpdate = () => {
      const newEntityUuid = getEntityUuidFromUrl();
      if (newEntityUuid !== currentEntityUuid) {
        setCurrentEntityUuid(newEntityUuid);
      }
    };

    window.addEventListener('single-spa:routing-event', handleRouteUpdate);
    return () => window.removeEventListener('single-spa:routing-event', handleRouteUpdate);
  }, [currentEntityUuid]);

  return useMemo(
    () => ({
      isLoading: isValidating && !error && !entity,
      entity,
      entityUuid: currentEntityUuid,
      error,
    }),
    [isValidating, error, entity, currentEntityUuid],
  );
}
