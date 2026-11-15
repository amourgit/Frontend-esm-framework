// Suppress act() warnings BEFORE any React code loads
// These warnings are expected due to store-to-store subscriptions in the data layer
const originalError = console.error;
console.error = (...args: any[]) => {
  const message = args[0];
  if (
    typeof message === 'string' &&
    message.includes('Warning: An update to') &&
    message.includes('was not wrapped in act')
  ) {
    return;
  }
  originalError.call(console, ...args);
};

import { afterAll, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import type {} from '@egen-civitas/esm-globals';

// Les tests d'intégration (extensions, configuration, magasins liés) dépendent d'enchaînements asynchrones : le délai par
// défaut de `waitFor`/`findBy*` (1 s) est trop court sous la charge de la CI et produisait des échecs intermittents
// (ex. extension-config.test.tsx). Un test qui réussit n'attend jamais plus que nécessaire.
configure({ asyncUtilTimeout: 5000 });

declare global {
  interface Window {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  }
}

// Configure React's act() environment for Vitest
// See: https://github.com/testing-library/react-testing-library/issues/1061
// Store the actual value in a variable to avoid infinite recursion
let actEnvironment = true;

Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', {
  get() {
    return actEnvironment;
  },
  set(value) {
    actEnvironment = value;
    if (typeof window !== 'undefined' && globalThis !== window) {
      window.IS_REACT_ACT_ENVIRONMENT = value;
    }
  },
});

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

window.egenBase = '/egen';
window.spaBase = '/spa';
window.getEgenSpaBase = () => '/egen-civitas/spa/';
const { getComputedStyle } = window;
window.getComputedStyle = (elt) => getComputedStyle(elt);

afterEach(() => {
  cleanup();
});

afterAll(() => {
  console.error = originalError;
});
