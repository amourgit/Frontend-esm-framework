/** @module @category Offline */
import { createGlobalStore } from '@egen/esm-state';
import { setupDynamicOfflineDataHandler, syncDynamicOfflineData } from './dynamic-offline-data';

/** @deprecated Will be removed once all modules have been migrated to the new dynamic offline data API. */
export interface OfflineEntityDataSyncStore {
  offlineEntityDataSyncState: Record<string, OfflineEntityDataSyncState>;
  handlers: Record<string, OfflineEntityDataSyncHandler>;
}

/** @deprecated Will be removed once all modules have been migrated to the new dynamic offline data API. */
export interface OfflineEntityDataSyncState {
  readonly timestamp: Date;
  readonly syncingHandlers: Array<string>;
  readonly syncedHandlers: Array<string>;
  readonly failedHandlers: Array<string>;
  readonly errors: Record<string, string>;
  abort(): boolean;
}

/** @deprecated Will be removed once all modules have been migrated to the new dynamic offline data API. */
export interface OfflineEntityDataSyncHandler {
  readonly displayName: string;
  onOfflineEntityAdded(args: OfflineEntityArgs): Promise<void>;
}

/** @deprecated Will be removed once all modules have been migrated to the new dynamic offline data API. */
export interface OfflineEntityArgs {
  entityUuid: string;
  signal: AbortSignal;
}

const store = createGlobalStore<OfflineEntityDataSyncStore>('offline-entities', {
  offlineEntityDataSyncState: {},
  handlers: {},
});

/** @deprecated Will be removed once all modules have been migrated to the new dynamic offline data API. */
export function getOfflineEntityDataStore() {
  printDeprecationWarning();
  return store;
}

/** @deprecated Will be removed once all modules have been migrated to the new dynamic offline data API. */
export function registerOfflineEntityHandler(identifier: string, handler: OfflineEntityDataSyncHandler) {
  printDeprecationWarning();

  setupDynamicOfflineDataHandler({
    type: 'entity',
    displayName: handler.displayName,
    id: identifier,
    isSynced: () => Promise.resolve(true),
    sync: (entityUuid, signal) =>
      handler.onOfflineEntityAdded({
        entityUuid,
        signal: signal ?? new AbortController().signal,
      }),
  });
}

/** @deprecated Will be removed once all modules have been migrated to the new dynamic offline data API. */
export async function syncOfflineEntityData(entityUuid: string) {
  printDeprecationWarning();
  await syncDynamicOfflineData('entity', entityUuid);
}

function printDeprecationWarning() {
  console.warn(
    'The offline entity API has been deprecated and will be removed in a future release. ' +
      'To prevent future crashes, the functions remain available for the moment, but any invocations should be migrated ASAP.',
  );
}
