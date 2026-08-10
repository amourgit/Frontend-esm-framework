import { restBaseUrl } from '@egen/esm-api';
import { useConfig } from '@egen/esm-react-utils';
import useSWRImmutable from 'swr/immutable';
import { type StyleguideConfigObject } from '../../config-schema';

interface AttributeType {
  display: string;
  uuid: string;
}

interface Attribute {
  attributeType: AttributeType;
  value: string;
}

interface EntityAttributes {
  attributes: Attribute[];
}

export function useEntityContactAttributes(entityUuid: string) {
  const { contactAttributeTypes } = useConfig<StyleguideConfigObject>();

  const { data, isLoading } = useSWRImmutable<{ data: EntityAttributes }>(
    entityUuid
      ? `${restBaseUrl}/entity/${entityUuid}?v=custom:(attributes:(attributeType:(display,uuid),value))`
      : null,
    (url: string) => fetch(url).then((res) => res.json()),
  );

  const contactAttributes = data?.data?.attributes?.filter(
    (attr) => contactAttributeTypes?.uuids?.includes(attr.attributeType.uuid),
  );

  return { contactAttributes, isLoading };
}
