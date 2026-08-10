import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    mockReset: true,
    globals: true,
    alias: {
      '@egen/esm-framework/src/internal': '@egen/esm-framework/mock',
      '@egen/esm-framework': '@egen/esm-framework/mock',
    },
  },
});
