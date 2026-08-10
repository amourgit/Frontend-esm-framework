/**
 * Defines the minimum required versions of backend modules that the
 * frontend framework depends on. These versions are checked at startup to ensure
 * compatibility between the frontend and backend.
 *
 * These can be overridden by the implementing application in its own configuration.
 */
export const backendDependencies: Record<string, string> = {
  'webservices.rest': '2.24.0',
};
