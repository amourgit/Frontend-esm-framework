import React from 'react';
import { useLayoutType } from '@egen-civitas/esm-react-utils';
import { getCoreTranslation } from '@egen-civitas/esm-translations';
import { CardHeader } from '../cards/index.js';
import { Button, Layer, Tile } from '../ui/index.js';

export interface EmptyCardProps {
  /** The name of the type of item that would be displayed here if not empty. This must be a pre-translated string. */
  displayText: string;
  /** The title to use for this empty component. This must be a pre-translated string. */
  headerTitle: string;
  /** A callback to invoke when the user tries to record a new item. */
  launchForm?(): void;
}

export const EmptyCardIllustration = ({ width = '64', height = '64' }) => {
  return (
    <svg width={width} height={height} viewBox="0 0 64 64">
      <use href={`#egen-empty-data-illustration`} />
    </svg>
  );
};

/**
 * Re-usable card for displaying an empty state
 */
export const EmptyCard: React.FC<EmptyCardProps> = (props) => {
  const isTablet = useLayoutType() === 'tablet';
  const launchForm = props.launchForm;

  return (
    <Layer className="bg-transparent">
      <Tile className="gap-0 rounded-none border-border py-0 text-center shadow-none">
        <CardHeader title={props.headerTitle} />
        <EmptyCardIllustration />
        <p className="mt-4 mb-2 text-sm font-semibold text-muted-foreground">
          {getCoreTranslation('emptyStateText', 'There are no {{displayText}} to display', {
            displayText: props.displayText,
          })}
        </p>
        <p className="mb-2">
          {launchForm && (
            <Button onClick={() => launchForm()} variant="ghost" size={isTablet ? 'lg' : 'sm'}>
              {getCoreTranslation('recordNewEntry', 'Record {{ displayText }}', {
                displayText: props.displayText,
              })}
            </Button>
          )}
        </p>
      </Tile>
    </Layer>
  );
};
