import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    // Les tests s'exécutent sur le code source du socle commun (workspace voisin)
    alias: {
      '@egen-civitas/esm-integration-utils': fileURLToPath(new URL('../esm-integration-utils/src/index.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'happy-dom',
    // les iframes ne chargent aucune page réelle (les tests simulent la fenêtre de l'iframe)
    environmentOptions: { happyDOM: { settings: { disableIframePageLoading: true } } },
    mockReset: true,
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
