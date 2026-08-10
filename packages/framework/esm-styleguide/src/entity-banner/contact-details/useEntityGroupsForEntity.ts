import { restBaseUrl } from '@egen/esm-api';
import useSWRImmutable from 'swr/immutable';

interface EntityGroup {
  uuid: string;
  name: string;
  startDate: string;
}

export function useEntityGroupsForEntity(entityUuid: string) {
  const { data, isLoading } = useSWRImmutable<{ data: { results: EntityGroup[] } }>(
    entityUuid ? `${restBaseUrl}/cohort?v=custom:(uuid,name,startDate)&member=${entityUuid}` : null,
    (url: string) => fetch(url).then((res) => res.json()),
  );

  return { groups: data?.data?.results ?? [], isLoading };
}
