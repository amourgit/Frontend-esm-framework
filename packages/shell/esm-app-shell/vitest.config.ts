import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@egen-civitas/esm-framework/src/internal': resolve(__dirname, '../../framework/esm-data-api/src/events/index.ts'),
    },
  },
  test: {
    environment: 'happy-dom',
    environmentOptions: {
      happyDOM: {
        url: 'http://localhost/',
      },
    },
    mockReset: true,
  },
});
