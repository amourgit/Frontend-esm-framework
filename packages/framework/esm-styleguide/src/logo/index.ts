import fullLogo from './egen-logo-full.svg';
import partialLogo from './egen-logo-partial.svg';
import iconLogo from './egen-logo-icon.svg';
import whiteLogo from './egen-logo-white.svg';
import { addSvg } from '../svg-utils';

/**
 * Registers the default Egen logo SVGs into the SVG sprite container.
 * This makes them available for use throughout the application via SVG use references.
 *
 * @internal
 */
export function setupLogo() {
  addSvg('egen-logo-full-color', fullLogo);
  addSvg('egen-logo-full-mono', fullLogo);
  addSvg('egen-logo-full-grey', fullLogo);
  addSvg('egen-logo-partial-color', partialLogo);
  addSvg('egen-logo-partial-mono', partialLogo);
  addSvg('egen-logo-partial-grey', partialLogo);
  addSvg('egen-logo-icon-color', iconLogo);
  addSvg('egen-logo-icon-mono', iconLogo);
  addSvg('egen-logo-icon-grey', iconLogo);
  addSvg('egen-logo-white', whiteLogo);
}
