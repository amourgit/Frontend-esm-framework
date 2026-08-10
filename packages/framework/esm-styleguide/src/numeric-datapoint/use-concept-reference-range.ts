/** @module @category UI */
import useSWRImmutable from 'swr/immutable';
import { egenFetch, restBaseUrl } from '@egen/esm-api';
import type { DataPointReferenceRanges } from './interpretation-utils';

export interface UseConceptReferenceRangeResult {
  referenceRange: DataPointReferenceRanges | undefined;
  error?: Error;
  isLoading: boolean;
}

interface ConceptReferenceRangeResponse {
  results: Array<{
    concept: string;
    display: string;
    hiNormal?: number | null;
    hiAbsolute?: number | null;
    hiCritical?: number | null;
    lowNormal?: number | null;
    lowAbsolute?: number | null;
    lowCritical?: number | null;
    units?: string | null;
  }>;
}

/**
 * Hook to fetch concept reference range from Egen REST API
 * @param conceptUuid - The UUID of the concept to fetch reference range for
 * @returns Reference range data, loading state, and error
 */
export function useConceptReferenceRange(
  conceptUuid: string | undefined,
  entityUuid: string | undefined,
): UseConceptReferenceRangeResult {
  let apiUrl: string | null = null;
  if (conceptUuid) {
    if (entityUuid) {
      apiUrl = `${restBaseUrl}/conceptreferencerange/?entity=${entityUuid}&concept=${conceptUuid}&v=full`;
    } else {
      apiUrl = `${restBaseUrl}/conceptreferencerange/?concept=${conceptUuid}&v=full`;
    }
  }

  const { data, error, isLoading } = useSWRImmutable<{ data: ConceptReferenceRangeResponse }, Error>(
    apiUrl,
    egenFetch,
  );

  const conceptData = data?.data?.results?.[0];

  const referenceRange: DataPointReferenceRanges | undefined = conceptData
    ? {
        hiNormal: conceptData.hiNormal ?? null,
        hiAbsolute: conceptData.hiAbsolute ?? null,
        hiCritical: conceptData.hiCritical ?? null,
        lowNormal: conceptData.lowNormal ?? null,
        lowAbsolute: conceptData.lowAbsolute ?? null,
        lowCritical: conceptData.lowCritical ?? null,
      }
    : undefined;

  return {
    referenceRange,
    error,
    isLoading,
  };
}
