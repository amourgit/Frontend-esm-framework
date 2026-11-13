// Fournit à Playwright le Host simulé : on réutilise `createMockHost` (esm-platform/testing), jamais une copie.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const platformRoot = dirname(require.resolve('@egen-civitas/esm-platform/package.json'));
const source = readFileSync(join(platformRoot, 'dist/testing/mock-host.js'), 'utf8').replace(
  /export function createMockHost/,
  'function createMockHost',
);

/**
 * Script d'initialisation (exécuté avant tout script de la page, hors CSP) qui installe le faux Host.
 * `options` = `MockHostOptions` ; les `handlers` sont des fonctions SÉRIALISÉES (`toString`) : elles s'exécutent dans la
 * page et ne doivent rien capturer de l'extérieur (l'état partagé passe par `window`).
 *
 * @param {Record<string, unknown> & { handlers?: Record<string, (args: unknown) => unknown> }} [options]
 */
export function mockHostInitScript(options = {}) {
  const { handlers = {}, ...rest } = options;
  const handlerSource = Object.entries(handlers)
    .map(([key, fn]) => `${JSON.stringify(key)}: (${fn.toString()})`)
    .join(',\n');
  return `(() => { ${source}
    window.__egenMockHost = createMockHost({ ...${JSON.stringify(rest)}, handlers: { ${handlerSource} } });
    window.__egenMockHost.install();
  })();`;
}
