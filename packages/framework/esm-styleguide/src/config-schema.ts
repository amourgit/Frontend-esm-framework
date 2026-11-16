import { type ConfigSchema, Type, validators } from '@egen-civitas/esm-config';
import { type CarbonTagColor, carbonTagColors } from './utils.js';

export interface StyleguideConfigObject {
  /**
   * The name of this deployment/implementation, shown in the UI.
   */
  implementationName: string;
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
  implementationName: {
    _type: Type.String,
    _description: 'The name of the deployment or authority displayed in the UI.',
    _default: 'Framework',
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
