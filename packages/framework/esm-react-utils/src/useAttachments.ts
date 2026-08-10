/** @module @category API */
import { useMemo } from 'react';
import useSWR from 'swr';
import { egenFetch, type FetchResponse } from '@egen/esm-api';
import { attachmentUrl, type AttachmentResponse } from '@egen/esm-data-api';

/**
 * A React hook that fetches attachments for an entity using SWR for caching
 * and automatic revalidation.
 *
 * @param entityUuid The UUID of the entity whose attachments should be fetched.
 * @param includeOrphan Whether to include attachments not associated with any interaction.
 * @returns An object containing:
 *   - `data`: Array of attachment objects (empty array while loading)
 *   - `isLoading`: Whether the initial fetch is in progress
 *   - `isValidating`: Whether any request (initial or revalidation) is in progress
 *   - `error`: Any error that occurred during fetching
 *   - `mutate`: Function to trigger a revalidation of the data
 *
 * @example
 * ```tsx
 * import { useAttachments } from '@egen/esm-framework';
 * function EntityAttachments({ entityUuid }) {
 *   const { data, isLoading, error } = useAttachments(entityUuid, true);
 *   if (isLoading) return <span>Loading...</span>;
 *   if (error) return <span>Error loading attachments</span>;
 *   return <AttachmentList attachments={data} />;
 * }
 * ```
 */
export function useAttachments(entityUuid: string, includeOrphan: boolean) {
  const { data, error, mutate, isLoading, isValidating } = useSWR<
    FetchResponse<{ results: Array<AttachmentResponse> }>
  >(`${attachmentUrl}?entity=${entityUuid}&includeOrphan=${includeOrphan}`, egenFetch);

  const results = useMemo(
    () => ({
      isLoading,
      data: data?.data.results ?? [],
      error,
      mutate,
      isValidating,
    }),
    [data, error, isLoading, isValidating, mutate],
  );

  return results;
}
