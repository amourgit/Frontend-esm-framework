import { registerDefaultCalendar } from '@egen/esm-utils';

// Sets up the global variables that the Egen framework expects to find
// on window. Without these, components that call interpolateUrl() or
// reference egenBase will throw at runtime.
(window as any).egenBase = '/egen';
(window as any).spaBase = '/egen/spa';
(window as any).getEgenSpaBase = () => '/egen/spa/';
(window as any).i18next = { language: 'en' };

// Register non-Gregorian calendars for locales that use them by default.
// In the real app, the app shell reads preferredCalendar from config and
// calls registerDefaultCalendar() at startup. We replicate that here
// using the same defaults from the styleguide config schema.
registerDefaultCalendar('am', 'ethiopic');
