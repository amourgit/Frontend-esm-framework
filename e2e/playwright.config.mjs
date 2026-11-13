import { defineConfig } from '@playwright/test';

// `EGEN_E2E_CHROMIUM` : chemin d'un Chromium déjà présent (poste sans accès au CDN de Playwright). En CI :
// `playwright install chromium`, la variable est absente.
const executablePath = process.env.EGEN_E2E_CHROMIUM;

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.mjs',
  workers: 1,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['github']] : [['list']],
  use: {
    ...(executablePath ? { launchOptions: { executablePath, args: ['--no-sandbox'] } } : {}),
  },
});
