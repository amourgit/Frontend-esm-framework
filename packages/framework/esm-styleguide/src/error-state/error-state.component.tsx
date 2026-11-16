import React from 'react';
import { getCoreTranslation } from '@egen-civitas/esm-translations';
import { CardHeader } from '../cards/index.js';
import { Layer, Tile } from '../ui/index.js';

export interface ErrorStateProps {
  /** The error that caused this error card to be rendered. Expected to be a failed fetch result. */
  error: any;
  /** The title to use for this empty component. This must be a pre-translated string. */
  headerTitle: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ error, headerTitle }) => {
  return (
    <Layer className="bg-transparent">
      <Tile className="gap-0 rounded-none border-border py-0 text-center shadow-none">
        <CardHeader title={headerTitle} />
        <p className="mt-9 mb-2 text-sm font-semibold">
          {getCoreTranslation('error', 'Error')} {`${error?.response?.status}: `}
          {error?.response?.statusText}
        </p>
        <p className="mb-2 text-sm text-muted-foreground">{getCoreTranslation('errorCopy')}</p>
      </Tile>
    </Layer>
  );
};

export const ErrorCard = ErrorState;
export type ErrorCardProps = ErrorStateProps;
