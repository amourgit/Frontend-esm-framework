// Storybook-compatible mock for @egen-civitas/esm-error-handling.

export function createErrorHandler() {
  return (_error: any) => {};
}

export function reportError(_error: any) {}
