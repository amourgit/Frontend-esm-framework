import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    mockReset: true,
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
