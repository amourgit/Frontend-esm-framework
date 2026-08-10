/** @module @category API */
import { useMemo } from 'react';
import useSWRImmutable from 'swr/immutable';
import { type FetchResponse, type EgenResource, egenFetch, restBaseUrl } from '@egen/esm-api';

interface LocationTag extends EgenResource {
  name: string;
}

/**
 * Generic backend configuration response.
 * Implementers can extend this interface to add domain-specific configuration keys.
 *
 * Fully generic structure — domain-agnostic. All properties are optional and domain-neutral.
 */
export interface BackendConfigurationResponse {
  /** Primary identifier type used for entities */
  primaryIdentifierType?: EgenResource;
  /** Additional identifier types that can be searched */
  identifierTypesToSearch?: EgenResource;
  /** Supported location tags for login */
  supportsLoginLocationTag?: LocationTag;
  /** Supported location tags for transfers */
  supportsTransferLocationTag?: LocationTag;
  /** Supported location tags for sessions */
  supportsSessionLocationTag?: LocationTag;
  /** Phone/contact attribute type */
  telephoneAttributeType?: EgenResource;
  /** Default unknown location reference */
  unknownLocation?: EgenResource;
  /** How long (hours) before a session expires */
  sessionExpireHours?: EgenResource;
  /** Metadata concept source */
  metadataSourceName?: EgenResource;
  /** Allow additional implementer-specific properties */
  [key: string]: unknown;
}

/**
 * React hook for fetching and managing backend configuration.
 *
 * By default fetches from `${restBaseUrl}/config`. Implementers can override
 * the URL to point to their own configuration endpoint.
 *
 * @param configUrl Optional URL to fetch configuration from. Defaults to `${restBaseUrl}/config`.
 *
 * @returns An object containing:
 *   - `backendConfiguration`: The configuration data
 *   - `isLoadingBackendConfiguration`: Loading state
 *   - `mutateBackendConfiguration`: SWR mutate function for revalidation
 *   - `errorFetchingBackendConfiguration`: Error if request fails
 *
 * @example
 * ```tsx
 * import { useBackendConfiguration } from '@egen/esm-framework';
 * function ConfigDisplay() {
 *   const { backendConfiguration, isLoadingBackendConfiguration } = useBackendConfiguration();
 *   if (isLoadingBackendConfiguration) return <Spinner />;
 *   return <div>{backendConfiguration?.primaryIdentifierType?.display}</div>;
 * }
 * ```
 */
export function useBackendConfiguration(configUrl?: string) {
  const url = configUrl ?? `${restBaseUrl}/config`;
  const swrData = useSWRImmutable<FetchResponse<BackendConfigurationResponse>, Error>(url, egenFetch);

  const results = useMemo(
    () => ({
      backendConfiguration: swrData.data?.data,
      isLoadingBackendConfiguration: swrData.isLoading,
      mutateBackendConfiguration: swrData.mutate,
      errorFetchingBackendConfiguration: swrData.error,
    }),
    [swrData],
  );

  return results;
}
