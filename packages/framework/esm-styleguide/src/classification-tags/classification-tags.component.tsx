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
  red: 'border-transparent bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
  magenta: 'border-transparent bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950 dark:text-fuchsia-200',
  purple: 'border-transparent bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200',
  blue: 'border-transparent bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  cyan: 'border-transparent bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200',
  teal: 'border-transparent bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200',
  green: 'border-transparent bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
  gray: 'border-transparent bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  'cool-gray': 'border-transparent bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  'warm-gray': 'border-transparent bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200',
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
