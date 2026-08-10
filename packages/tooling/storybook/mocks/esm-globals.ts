// Storybook-compatible mock for @egen/esm-globals.
// This module mostly exports types; only a few runtime values are needed.

export function setupPaths(_config: any) {}
export function subscribeNetworkRequestFailed() {
  return () => {};
}
