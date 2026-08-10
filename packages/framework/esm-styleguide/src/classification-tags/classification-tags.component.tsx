/** @module @category UI */
import React from 'react';
import { Tag } from '@carbon/react';
import { useConfig } from '@egen/esm-react-utils';
import { getCoreTranslation } from '@egen/esm-translations';
import { type StyleguideConfigObject } from '../config-schema';

export interface ClassificationTag {
  display: string;
  /** 'primary' | 'secondary' | other implementer-defined ranks */
  rank?: string | number;
}

interface ClassificationTagsProps {
  classifications: Array<ClassificationTag>;
}

/**
 * Renders a list of classification tags for an entity or interaction.
 *
 * Colors for primary/secondary tags are configurable via the `classificationTags`
 * key in the styleguide config schema.
 *
 * Works for any domain: product categories, risk labels, audit flags, etc.
 *
 * @example
 * ```tsx
 * import { ClassificationTags } from '@egen/esm-framework';
 * <ClassificationTags
 *   classifications={[
 *     { display: 'High Priority', rank: 'primary' },
 *     { display: 'Flagged', rank: 'secondary' },
 *   ]}
 * />
 * ```
 */
export function ClassificationTags({ classifications }: ClassificationTagsProps) {
  const { classificationTags } = useConfig<StyleguideConfigObject>();

  if (!classifications?.length) return null;

  return (
    <div aria-label={getCoreTranslation('classificationTags' as any, 'Classification tags')}>
      {classifications.map((tag, i) => {
        const isPrimary = tag.rank === 'primary' || tag.rank === 1;
        const isSecondary = tag.rank === 'secondary' || tag.rank === 2;
        const color = isPrimary
          ? classificationTags?.primaryColor ?? 'red'
          : isSecondary
            ? classificationTags?.secondaryColor ?? 'blue'
            : 'gray';

        return (
          <Tag key={`${tag.display}-${i}`} type={color as any} size="sm">
            {tag.display}
          </Tag>
        );
      })}
    </div>
  );
}
