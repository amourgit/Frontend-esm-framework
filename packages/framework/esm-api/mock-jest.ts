import { of } from 'rxjs';
import { createGlobalStore } from '@egen-civitas/esm-state/mock';
import { type SessionStore } from './src/current-user';

export const setSessionLocation = jest.fn(() => Promise.resolve());
export const egenFetch = jest.fn((url?: string) => new Promise(() => {}));
export const egenObservableFetch = jest.fn(() => of({ data: { entry: [] } }));
export function getCurrentUser() {
  return of({ authenticated: false });
}
export const mockSessionStore = createGlobalStore<SessionStore>('mock-session-store', {
  loaded: false,
  session: null,
});
export const getSessionStore = jest.fn(() => mockSessionStore);
export const restBaseUrl = '/ws/rest/v1';
export const fhirBaseUrl = '/ws/fhir2/R4';
export const clearCurrentUser = jest.fn();
export const refetchCurrentUser = jest.fn();
export const setUserLanguage = jest.fn();
export const setUserProperties = jest.fn();
export const userHasAccess = jest.fn();
// Contournement d'authentification de développement : désactivé par défaut dans les tests
// (sinon le composant de login ne déclenche jamais refetchCurrentUser).
export const isDevAuthBypassEnabled = jest.fn(() => false);
export const applyDevAuthBypassForLogin = jest.fn(() => null);
