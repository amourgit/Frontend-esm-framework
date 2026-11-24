import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // happy-dom ne doit pas charger réellement `iframe.src` (aucun accès réseau dans les tests)
    environmentOptions: { happyDOM: { settings: { disableIframePageLoading: true } } },
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
