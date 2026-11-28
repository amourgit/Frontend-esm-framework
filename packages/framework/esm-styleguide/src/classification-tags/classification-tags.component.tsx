/** @module @category UI */
import React from 'react';
import { useConfig } from '@egen-civitas/esm-react-utils';
import { getCoreTranslation } from '@egen-civitas/esm-translations';
import { type StyleguideConfigObject } from '../config-schema.js';
import { Badge } from '../ui/index.js';

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
 * import { ClassificationTags } from '@egen-civitas/esm-framework';
 * <ClassificationTags
 *   classifications={[
 *     { display: 'High Priority', rank: 'primary' },
 *     { display: 'Flagged', rank: 'secondary' },
 *   ]}
 * />
 * ```
 */
/** Couleurs de tag disponibles (noms stables : ce sont les valeurs de la config `classificationTags`). Classes écrites en entier pour Tailwind. */
const TAG_COLORS: Record<string, string> = {
  red: 'border-transparent bg-(--chart-1)/12 text-(--chart-1)',
  magenta: 'border-transparent bg-(--chart-2)/12 text-(--chart-2)',
  purple: 'border-transparent bg-(--chart-3)/12 text-(--chart-3)',
  blue: 'border-transparent bg-(--chart-4)/12 text-(--chart-4)',
  cyan: 'border-transparent bg-(--chart-5)/12 text-(--chart-5)',
  teal: 'border-transparent bg-(--chart-6)/12 text-(--chart-6)',
  green: 'border-transparent bg-(--chart-7)/12 text-(--chart-7)',
  gray: 'border-transparent bg-(--chart-8)/12 text-(--chart-8)',
  'cool-gray': 'border-transparent bg-(--muted) text-(--muted-foreground)',
  'warm-gray': 'border-transparent bg-(--accent) text-(--accent-foreground,var(--foreground))',
  'high-contrast': 'border-transparent bg-foreground text-background',
  outline: 'bg-transparent text-foreground',
};

export function ClassificationTags({ classifications }: ClassificationTagsProps) {
  const { classificationTags } = useConfig<StyleguideConfigObject>();

  if (!classifications?.length) return null;

  return (
    <div className="flex flex-wrap gap-1" aria-label={getCoreTranslation('classificationTags' as any, 'Classification tags')}>
      {classifications.map((tag, i) => {
        const isPrimary = tag.rank === 'primary' || tag.rank === 1;
        const isSecondary = tag.rank === 'secondary' || tag.rank === 2;
        const color = isPrimary
          ? classificationTags?.primaryColor ?? 'red'
          : isSecondary
            ? classificationTags?.secondaryColor ?? 'blue'
            : 'gray';

        return (
          <Badge key={`${tag.display}-${i}`} variant="outline" className={TAG_COLORS[color] ?? TAG_COLORS.gray}>
            {tag.display}
          </Badge>
        );
      })}
    </div>
  );
}
