import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./setup-tests.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
