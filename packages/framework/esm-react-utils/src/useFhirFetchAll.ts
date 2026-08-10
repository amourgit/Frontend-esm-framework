import { type UseServerInfiniteReturnObject } from './useEgenInfinite';
import { getFhirServerPaginationHandlers } from './useFhirPagination';
import { useServerFetchAll, type UseServerFetchAllOptions } from './useEgenFetchAll';

/**
 * This hook handles fetching results from *all* pages of a paginated FHIR REST endpoint, making multiple requests
 * as needed.
 * This function is the FHIR counterpart of `useEgenPagination`.
 *
 * @see `useFhirPagination`
 * @see `useFhirInfinite`
 * @see `useEgenFetchAll``
 *
 * @param url The URL of the paginated rest endpoint.
 *            Similar to useSWRInfinite, this param can be null to disable fetching.
 * @param options The options object
 * @returns a UseFhirInfiniteReturnObject object
 */
export function useFhirFetchAll<T extends fhir.ResourceBase>(
  url,
  options: UseServerFetchAllOptions<fhir.Bundle> = {},
): UseServerInfiniteReturnObject<T, fhir.Bundle> {
  return useServerFetchAll<T, fhir.Bundle>(url, getFhirServerPaginationHandlers(), options);
}
