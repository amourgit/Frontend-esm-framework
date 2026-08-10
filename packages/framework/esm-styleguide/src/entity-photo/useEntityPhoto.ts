/** @module @category UI */
import useSWR from 'swr';
import { egenFetch, restBaseUrl } from '@egen/esm-api';
import { useConfig } from '@egen/esm-react-utils';
import { type StyleguideConfigObject } from '../config-schema';

export interface UseEntityPhotoResult {
  data: { dateTime: string; imageSrc: string } | null;
  error?: Error;
  isLoading: boolean;
}

interface DataPointFetchResponse {
  results: Array<PhotoDataPoint>;
}

interface PhotoDataPoint {
  display: string;
  recordedDatetime: string;
  uuid: string;
  value: {
    display: string;
    links: {
      rel: string;
      uri: string;
    };
  };
}

/**
 * React hook to fetch the profile photo for an entity.
 *
 * The photo concept UUID is read from the styleguide config (`entityPhotoConceptUuid`).
 * If not configured, no request is made.
 *
 * @param entityUuid The UUID of the entity.
 * @returns An object with `data` (imageSrc + dateTime), `error`, and `isLoading`.
 *
 * @example
 * ```tsx
 * import { useEntityPhoto } from '@egen/esm-framework';
 * function ProfilePhoto({ entityUuid }) {
 *   const { data, isLoading } = useEntityPhoto(entityUuid);
 *   if (isLoading) return <Spinner />;
 *   return data ? <img src={data.imageSrc} /> : <AvatarIcon />;
 * }
 * ```
 */
export function useEntityPhoto(entityUuid: string): UseEntityPhotoResult {
  const { entityPhotoConceptUuid } = useConfig<StyleguideConfigObject>({
    externalModuleName: '@egen/esm-styleguide',
  });

  const url = entityPhotoConceptUuid
    ? `${restBaseUrl}/datapoint?entity=${entityUuid}&concept=${entityPhotoConceptUuid}&v=full`
    : null;

  const { data, error, isLoading } = useSWR<{ data: DataPointFetchResponse }, Error>(
    entityUuid ? url : null,
    egenFetch,
  );

  const item = data?.data?.results[0];

  return {
    data: item
      ? {
          dateTime: item?.recordedDatetime,
          imageSrc: item?.value?.links?.uri,
        }
      : null,
    error,
    isLoading,
  };
}
