/** @module @category UI */
import { useEffect } from 'react';
import {
  useServerInfinite,
  type UseServerInfiniteOptions,
  type UseServerInfiniteReturnObject,
} from './useEgenInfinite';
import {
  type EgenPaginatedResponse,
  egenServerPaginationHandlers,
  type ServerPaginationHandlers,
} from './useEgenPagination';

export interface UseServerFetchAllOptions<R> extends UseServerInfiniteOptions<R> {
  /**
   * If true, the data of any page is returned as soon as they are fetched.
   * This is useful when you want to display data as soon as possible, even if not all pages are fetched.
   * If false, the returned data will be undefined until all pages are fetched. This is useful when you want to
   * display all data at once or reduce the number of re-renders (to avoid confusing users).
   */
  partialData?: boolean;
}

/**
 * Most Egen REST endpoints that return a list of objects, such as getAll or search, are server-side paginated.
 * This hook handles fetching results from *all* pages of a paginated Egen REST endpoint, making multiple requests
 * as needed.
 *
 * @see `useEgenPagination`
 * @see `useEgenInfinite`
 * @see `useFhirFetchAll`
 *
 * @param url The URL of the paginated Egen REST endpoint. Note that the `limit` GET param can be set to specify
 *            the page size; if not set, the page size defaults to the `webservices.rest.maxResultsDefault` value defined
 *            server-side.
 *            Similar to useSWRInfinite, this param can be null to disable fetching.
 * @param options The options object
 * @returns a UseEgenInfiniteReturnObject object
 */
export function useEgenFetchAll<T>(
  url: string | URL,
  options: UseServerFetchAllOptions<EgenPaginatedResponse<T>> = {},
): UseServerInfiniteReturnObject<T, EgenPaginatedResponse<T>> {
  return useServerFetchAll<T, EgenPaginatedResponse<T>>(url, egenServerPaginationHandlers, options);
}

export function useServerFetchAll<T, R>(
  url: string | URL,
  serverPaginationHandlers: ServerPaginationHandlers<T, R>,
  options: UseServerFetchAllOptions<R> = {},
): UseServerInfiniteReturnObject<T, R> {
  const response = useServerInfinite<T, R>(url, serverPaginationHandlers, options);
  const { hasMore, error, data, loadMore, isLoading, nextUri } = response;

  useEffect(() => {
    if (hasMore && !error) {
      loadMore();
    }
  }, [hasMore, nextUri]);

  if (options.partialData) {
    return response;
  } else {
    return {
      ...response,
      data: hasMore || error ? undefined : data,
      isLoading: isLoading || hasMore,
    };
  }
}
