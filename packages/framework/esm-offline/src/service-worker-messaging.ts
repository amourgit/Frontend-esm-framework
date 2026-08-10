/** @module @category Offline */
import type { ImportMap } from '@egen/esm-globals';
import type { EgenOfflineCachingStrategy } from './service-worker-http-headers';
import { getEgenServiceWorker } from './service-worker';

/**
 * Sends the specified message to the application's service worker.
 * @param message The message to be sent.
 * @returns A promise which completes when the message has been successfully processed by the Service Worker.
 */
export async function messageEgenServiceWorker(
  message: KnownEgenServiceWorkerMessages,
): Promise<MessageServiceWorkerResult<any>> {
  const sw = await getEgenServiceWorker();
  return sw
    ? await sw.messageSW(message)
    : {
        success: false,
        result: undefined,
        error:
          'No service worker has been registered. This is typically the case when the application has been built without offline-related features.',
      };
}

export interface EgenServiceWorkerMessage<MessageTypeTypeIdentifier extends string> {
  type: MessageTypeTypeIdentifier;
}

export interface OnImportMapChangedMessage extends EgenServiceWorkerMessage<'onImportMapChanged'> {
  importMap: ImportMap;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ClearDynamicRoutesMessage extends EgenServiceWorkerMessage<'clearDynamicRoutes'> {}

export interface RegisterDynamicRouteMessage extends EgenServiceWorkerMessage<'registerDynamicRoute'> {
  pattern?: string;
  url?: string;
  strategy?: EgenOfflineCachingStrategy;
}

export type KnownEgenServiceWorkerMessages =
  | OnImportMapChangedMessage
  | ClearDynamicRoutesMessage
  | RegisterDynamicRouteMessage;

export interface MessageServiceWorkerResult<T> {
  success: boolean;
  result?: T;
  error?: string;
}
