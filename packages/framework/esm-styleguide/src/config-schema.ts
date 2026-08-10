import { type ConfigSchema, Type, validators } from '@egen/esm-config';
import { type CarbonTagColor, carbonTagColors } from './utils';

export interface StyleguideConfigObject {
  'Brand color #1': string;
  'Brand color #2': string;
  'Brand color #3': string;
  /**
   * UUIDs of entity identifier code types to exclude from rendering in the entity banner.
   */
  excludeEntityIdentifierCodeTypes: {
    uuids: Array<string>;
  };
  /**
   * The name of this deployment/implementation, shown in the UI.
   */
  implementationName: string;
  /**
   * Concept UUID used to look up a profile photo stored as an attachment.
   * Set to `null` to disable and use only generated avatars.
   */
  entityPhotoConceptUuid: string;
  /**
   * Attribute type UUIDs to show as contact details in the entity banner.
   */
  contactAttributeTypes: {
    uuids: Array<string>;
  };
  preferredCalendar: {
    [key: string]: string;
  };
  preferredDateLocale: {
    [key: string]: string;
  };
  /**
   * Colors for primary/secondary classification tags.
   */
  classificationTags: {
    primaryColor: CarbonTagColor;
    secondaryColor: CarbonTagColor;
  };
}

const classificationTagConfigSchema: ConfigSchema = {
  primaryColor: {
    _type: Type.String,
    _description: 'The color for displaying primary classification tags',
    _default: 'red',
    _validators: [validators.oneOf(carbonTagColors)],
  },
  secondaryColor: {
    _type: Type.String,
    _description: 'The color for displaying secondary classification tags',
    _default: 'blue',
    _validators: [validators.oneOf(carbonTagColors)],
  },
};

export const esmStyleGuideSchema: ConfigSchema = {
  'Brand color #1': {
    _default: '#005d5d',
    _type: Type.String,
  },
  'Brand color #2': {
    _default: '#004144',
    _type: Type.String,
  },
  'Brand color #3': {
    _default: '#007d79',
    _type: Type.String,
  },
  excludeEntityIdentifierCodeTypes: {
    uuids: {
      _type: Type.Array,
      _description: 'List of UUIDs of entity identifier types to exclude from rendering in the entity banner',
      _default: [],
      _elements: {
        _type: Type.UUID,
      },
    },
  },
  implementationName: {
    _type: Type.String,
    _description: 'The name of the deployment or authority displayed in the UI.',
    _default: 'Framework',
  },
  entityPhotoConceptUuid: {
    _type: Type.ConceptUuid,
    _default: '736e8771-e501-4615-bfa7-570c03f4bef5',
    _description:
      'Used to look up the entity profile photo, stored as an attachment. Set to `null` to disable and use only generated avatars.',
  },
  contactAttributeTypes: {
    uuids: {
      _type: Type.Array,
      _description: 'UUIDs of attribute types to show as contact details in the entity banner',
      _default: [],
      _elements: {
        _type: Type.UUID,
      },
    },
  },
  preferredCalendar: {
    _type: Type.Object,
    _description:
      "Keys should be locale codes, values should be the preferred calendar for that locale. For example, {'am': 'ethiopic'}.",
    _default: {
      am: 'ethiopic',
    },
    _elements: {
      _validators: [
        validators.oneOf([
          'buddhist',
          'chinese',
          'coptic',
          'dangi',
          'ethioaa',
          'ethiopic',
          'gregory',
          'hebrew',
          'indian',
          'islamic',
          'islamic-umalqura',
          'islamic-tbla',
          'islamic-civil',
          'islamic-rgsa',
          'iso8601',
          'japanese',
          'persian',
          'roc',
          'islamicc',
        ]),
      ],
    },
  },
  preferredDateLocale: {
    _type: Type.Object,
    _description:
      "Allows setting the locale used for date formatting for any browser locale. Keys should be locale codes, values should be the preferred locale for formatting dates. For example, {'en': 'en-US', 'fr-CA': 'en-CA'}.",
    _default: {
      en: 'en-GB',
    },
    _elements: {
      _type: Type.String,
    },
  },
  classificationTags: classificationTagConfigSchema,
};
