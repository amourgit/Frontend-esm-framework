// Calls the real SVG registration functions from the styleguide so that
// the icon and pictogram sprite sheets are populated in the DOM.
// This relies on svg-utils.ts creating the #egen-svgs-container element
// and on svgo-loader returning SVG files as raw strings.
import { setupIcons } from '@egen/esm-styleguide/src/icons/icon-registration';
import { setupPictograms } from '@egen/esm-styleguide/src/pictograms/pictogram-registration';
import { setupEmptyCard } from '@egen/esm-styleguide/src/empty-card/empty-card-registration';
import { flushSvgs } from '@egen/esm-styleguide/src/svg-utils';

setupIcons();
setupPictograms();
setupEmptyCard();
flushSvgs();
