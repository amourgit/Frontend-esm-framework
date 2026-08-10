/** @module @category API */
import { fhirBaseUrl, egenFetch, type FetchConfig, type FetchResponse } from '@egen/esm-api';
import { getSynchronizationItems } from '@egen/esm-offline';

export type CurrentEntity = fhir.Patient | FetchResponse<fhir.Patient>;

export interface CurrentEntityOptions {
  includeConfig?: boolean;
}

export interface EntityWithFullResponse extends CurrentEntityOptions {
  includeConfig: true;
}

export interface OnlyTheEntity extends CurrentEntityOptions {
  includeConfig: false;
}

export type EntityUuid = string | null;

/**
 * Fetches the current entity by their UUID from the FHIR-compatible API.
 * If the server request fails and offline entities are available,
 * it will check for a matching entity in the offline registration sync queue.
 *
 * @param entityUuid The UUID of the entity to fetch, or `null`.
 * @param fetchInit Optional fetch configuration options.
 * @param includeOfflineEntities Whether to include entities from the offline
 *   registration queue if the server request fails. Defaults to `true`.
 * @returns A Promise that resolves with the entity object, or `null` if not found.
 *
 * @example
 * ```ts
 * import { fetchCurrentEntity } from '@egen/esm-framework';
 * const entity = await fetchCurrentEntity('entity-uuid');
 * if (entity) {
 *   console.log('Entity name:', entity.name?.[0]?.text);
 * }
 * ```
 */
export async function fetchCurrentEntity(
  entityUuid: EntityUuid,
  fetchInit?: FetchConfig,
  includeOfflineEntities: boolean = true,
): Promise<fhir.Patient | null> {
  if (entityUuid) {
    let err: Error | null = null;
    const [onlineEntity, offlineEntity] = await Promise.all([
      egenFetch<fhir.Patient>(`${fhirBaseUrl}/Entity/${entityUuid}`, fetchInit).catch<FetchResponse<fhir.Patient>>(
        (e) => (err = e),
      ),
      includeOfflineEntities ? getOfflineRegisteredEntityAsFhirResource(entityUuid) : Promise.resolve(null),
    ]);

    if (onlineEntity.ok) {
      return onlineEntity.data;
    }

    if (offlineEntity) {
      return offlineEntity;
    }

    if (err) {
      throw err;
    }
  }

  return null;
}

async function getOfflineRegisteredEntityAsFhirResource(entityUuid: string): Promise<fhir.Patient | null> {
  const registrationSyncItems = await getSynchronizationItems<{
    fhirEntity: fhir.Patient;
  }>('entity-registration');
  const syncItem = registrationSyncItems.find((item) => item.fhirEntity.id === entityUuid);

  return syncItem?.fhirEntity ?? null;
}
