// Construit l'artefact natif MINIMAL de l'e2e (H2) : cible android, import map et routes inline, API absolue factice.
// Les routes déclarent `platforms` : `@e2e/ios-only` ne doit JAMAIS être enregistrée sur la cible android.
import { spawnSync } from 'node:child_process';
import { cpSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const shell = join(root, 'packages/shell/esm-app-shell');
const out = join(root, 'e2e/.artifact/android');

export const API_ORIGIN = 'https://api.test.local';

const env = {
  ...process.env,
  EGEN_TARGET: 'android',
  EGEN_ENV: 'production',
  NODE_ENV: 'production',
  EGEN_API_URL: API_ORIGIN,
  EGEN_OFFLINE: 'disable',
  EGEN_CLEAN_BEFORE_BUILD: 'true',
  EGEN_ESM_IMPORTMAP: JSON.stringify({ imports: { '@e2e/fake': '/app/e2e-fake.js' } }),
  EGEN_ROUTES: JSON.stringify({
    '@e2e/fake': { platforms: ['android'], pages: [{ component: 'root', route: 'e2e' }] },
    '@e2e/ios-only': { platforms: ['ios'], pages: [{ component: 'root', route: 'ios' }] },
  }),
};

const result = spawnSync('yarn', ['rspack', '--mode', 'production'], { cwd: shell, env, stdio: 'inherit' });
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
rmSync(out, { recursive: true, force: true });
cpSync(join(shell, 'dist'), out, { recursive: true });
console.log(`[e2e] artefact natif copié dans ${out}`);
