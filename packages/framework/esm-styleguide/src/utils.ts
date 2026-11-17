/**
 * Valid values for a classification tag colour (config `classificationTags`), rendered by `ClassificationTags`.
 */
export const tagColors = [
  'red',
  'magenta',
  'purple',
  'blue',
  'teal',
  'cyan',
  'gray',
  'green',
  'warm-gray',
  'cool-gray',
  'high-contrast',
  'outline',
] as const;

export type TagColor = (typeof tagColors)[number];
