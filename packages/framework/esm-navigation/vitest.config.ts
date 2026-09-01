import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    mockReset: true,
    exclude: ['**/node_modules/**', '**/dist/**'],
    setupFiles: ['./src/setup-tests.js'],
  },
});
