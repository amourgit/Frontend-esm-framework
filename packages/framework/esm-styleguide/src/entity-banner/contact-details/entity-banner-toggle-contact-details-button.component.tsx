/** @module @category UI */
import React, { type MouseEvent } from 'react';
import { Button } from '@carbon/react';
import { getCoreTranslation } from '@egen/esm-translations';
import { ChevronDownIcon, ChevronUpIcon } from '../../public';

export interface EntityBannerToggleContactDetailsButtonProps {
  /** Whether the contact details are currently being displayed */
  showContactDetails: boolean;
  /** Function called when this button is clicked. */
  toggleContactDetails: (e: MouseEvent) => void;
  /** Passed through to the Carbon Button component */
  className?: string;
}

export function EntityBannerToggleContactDetailsButton({
  showContactDetails,
  toggleContactDetails,
  className,
}: EntityBannerToggleContactDetailsButtonProps) {
  return (
    <Button
      className={className}
      iconDescription="Toggle contact details"
      kind="ghost"
      onClick={toggleContactDetails}
      renderIcon={showContactDetails ? ChevronUpIcon : ChevronDownIcon}
    >
      {showContactDetails ? getCoreTranslation('showLess', 'Show less') : getCoreTranslation('showMore', 'Show more')}
    </Button>
  );
}
