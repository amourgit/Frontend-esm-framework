import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    mockReset: true,
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    alias: {
      '@egen-civitas/esm-framework/src/internal': '@egen-civitas/esm-framework/mock',
      '@egen-civitas/esm-framework': '@egen-civitas/esm-framework/mock',
    },
  },
});
