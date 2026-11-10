import { afterEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runBuild, type BuildArgs } from './build';

// Suppress log noise during tests
vi.mock('../utils/logger', () => ({
  logInfo: vi.fn(),
  logWarn: vi.fn(),
  logFail: vi.fn(),
}));

const tempDirs: string[] = [];

function createTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'build-test-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs) {
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
  tempDirs.length = 0;
});

function defaultArgs(overrides: Partial<BuildArgs> = {}): BuildArgs {
  return {
    target: join(createTempDir(), 'dist'),
    registry: 'https://registry.npmjs.org/',
    defaultLocale: '',
    spaPath: '/egen-civitas/spa/',
    apiUrl: '/egen-civitas/',
    pageTitle: 'Egen',
    configUrls: ['https://example.com/config.json'],
    configPaths: [],
    env: 'production',
    assets: [],
    ...overrides,
  };
}

// Délai de CHAQUE test (240_000 ms, écrit en littéral pour que Prettier garde le motif `it(nom, fn, délai)`) : chaque
// test lance un VRAI build rspack du shell, ~23 s sur une machine au repos mais plus de 90 s quand turbo exécute les
// tests de tous les paquets en parallèle (mesuré : 2 tests sur 7 dépassaient l'ancien délai de 90 s, alors que le même
// fichier passe 7/7 seul). Un délai trop court donne un échec sans rapport avec le code ; un vrai blocage reste détecté.
function readIndex(target: string): string {
  return readFileSync(join(target, 'index.html'), 'utf8');
}

function listFiles(target: string): string[] {
  return readdirSync(target, { recursive: true }).map(String);
}

// The rspack config is loaded via require() and cached after the first call.
// Environment variables are read at module load time, so only the first build's
// values take effect for template parameters like pageTitle and spaPath.
// We therefore test all config-dependent assertions in a single build and use
// separate tests for filesystem-level behavior.

describe('runBuild', () => {
  it('produces a complete build with correct index.html content', async () => {
    const target = join(createTempDir(), 'dist');

    await runBuild(defaultArgs({ target }));

    const html = readIndex(target);

    // Page title is baked into the HTML <title> tag
    expect(html).toContain('<title>');

    // The initializeSpa() call must be present with the expected structure
    expect(html).toContain('initializeSpa(');
    expect(html).toMatch(/apiUrl:/);
    expect(html).toMatch(/spaPath:/);
    expect(html).toMatch(/configUrls:/);

    // There should be a <script> tag referencing a hashed egen JS bundle
    expect(html).toMatch(/egen\.[a-f0-9]+\.js/);

    // There should be a stylesheet link to the egen CSS
    expect(html).toMatch(/egen\.[a-f0-9]+\.css/);
  }, 240_000);

  it('builds a self-contained, locked-down SPA for a native platform', async () => {
    const target = join(createTempDir(), 'dist');

    await runBuild(
      defaultArgs({
        target,
        platform: 'android',
        apiUrl: 'https://api.exemple.ga/egen',
        importmap: '{"imports":{"@egen/esm-home-app":"./home/app.js"}}',
        routes: '{"@egen/esm-home-app":{"pages":[]}}',
      }),
    );

    const html = readIndex(target);
    const files = listFiles(target);
    expect(html).toContain('systemjs-importmap');
    expect(html).not.toContain('importmap.json');
    expect(html).not.toContain('routes.registry.json');
    expect(html).not.toContain('service-worker');
    expect(html).toMatch(/src="\/app\/egen\.[a-f0-9]+\.js"/);

    // CSP `script-src 'self'` : le démarrage (thème, pont window.egenTarget, initializeSpa) est dans des FICHIERS émis.
    expect(html).toMatch(
      /<meta http-equiv="Content-Security-Policy" content="[^"]*script-src 'self'[^"]*connect-src 'self' https:\/\/api\.exemple\.ga;/,
    );
    const head = files.find((f) => /^bootstrap-head\.[a-f0-9]{16}\.js$/.test(f));
    const body = files.find((f) => /^bootstrap\.[a-f0-9]{16}\.js$/.test(f));
    expect(head).toBeDefined();
    expect(body).toBeDefined();
    expect(html).toContain(`src="/app/${head}"`);
    expect(html).toContain(`src="/app/${body}"`);
    expect(readFileSync(join(target, head!), 'utf8')).toMatch(/egenTarget:\s*"android"/);
    expect(readFileSync(join(target, body!), 'utf8')).toMatch(
      /initializeSpa\(\{apiUrl:"https:\/\/api\.exemple\.ga\/egen",spaPath:"\/app"/,
    );
    // E1 : en natif, les données hors ligne restent actives (offline) mais SANS service worker (fichiers embarqués).
    expect(readFileSync(join(target, body!), 'utf8')).toMatch(/offline:!0,serviceWorker:!1/);

    // Aucun script exécutable inline (seuls les blocs de DONNÉES restent), aucun gestionnaire inline.
    expect(html).not.toContain('initializeSpa(');
    expect(html).not.toContain('Object.assign(window');
    const inline = [...html.matchAll(/<script\b([^>]*)>/g)]
      .map(([, attributes]) => attributes)
      .filter(
        (attributes) => !/\bsrc=/.test(attributes) && !/type="(systemjs-importmap|egen-routes)"/.test(attributes),
      );
    expect(inline).toEqual([]);
    expect(html).not.toMatch(/\son[a-z]+\s*=/i);
  }, 240_000);

  it('rejects a native build whose configuration is not self-contained', async () => {
    const target = join(createTempDir(), 'dist');

    // Sans API https absolue ni import map / routes inline, la cible native est refusée AVANT tout build,
    // avec la liste des problèmes (voir tools/targets.js du shell).
    const build = runBuild(defaultArgs({ target, platform: 'ios' }));
    await expect(build).rejects.toThrow(/Build impossible pour la cible "ios"/);
    await expect(build).rejects.toThrow(/EGEN_API_URL/);
    await expect(build).rejects.toThrow(/EGEN_ESM_IMPORTMAP/);
  }, 240_000);

  it('produces at least one hashed JS bundle named egen.<hash>.js', async () => {
    const target = join(createTempDir(), 'dist');

    await runBuild(defaultArgs({ target }));

    const files = listFiles(target);
    const egenBundle = files.find((f) => /^egen\.[a-f0-9]+\.js$/.test(f));
    expect(egenBundle).toBeDefined();
  }, 240_000);

  it('produces at least one CSS file', async () => {
    const target = join(createTempDir(), 'dist');

    await runBuild(defaultArgs({ target }));

    const files = listFiles(target);
    const cssFile = files.find((f) => f.endsWith('.css'));
    expect(cssFile).toBeDefined();
  }, 240_000);

  it('copies config files from configPaths to the target directory', async () => {
    const dir = createTempDir();
    const target = join(dir, 'dist');
    const configFile = join(dir, 'my-config.json');
    writeFileSync(configFile, JSON.stringify({ setting: 'value' }));

    await runBuild(defaultArgs({ target, configPaths: [configFile] }));

    const copiedConfig = join(target, 'my-config.json');
    expect(existsSync(copiedConfig)).toBe(true);
    expect(JSON.parse(readFileSync(copiedConfig, 'utf8'))).toEqual({ setting: 'value' });
  }, 240_000);

  it('resolves a hashed importmap filename when the exact file does not exist', async () => {
    const dir = createTempDir();
    const target = join(dir, 'dist');
    mkdirSync(target, { recursive: true });

    // Simulate a prior assemble --hash-importmap
    const hashedImportmap = JSON.stringify({ imports: { '@egen-civitas/esm-test': './test.js' } });
    writeFileSync(join(target, 'importmap.abc123.json'), hashedImportmap);

    // Request importmap.json (which doesn't exist); the build should find the hashed version
    await runBuild(defaultArgs({ target, importmap: 'importmap.json' }));

    // The build should succeed and the hashed importmap file should still be present
    expect(existsSync(join(target, 'importmap.abc123.json'))).toBe(true);
    expect(existsSync(join(target, 'index.html'))).toBe(true);
  }, 240_000);
});
