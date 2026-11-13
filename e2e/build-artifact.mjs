// Construit l'artefact natif MINIMAL de l'e2e (H2) : cible android, import map et routes inline, API absolue factice.
// Les routes déclarent `platforms` : `@e2e/ios-only` ne doit JAMAIS être enregistrée sur la cible android.
import { spawnSync } from 'node:child_process';
import { cpSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const shell = join(root, 'packages/shell/esm-app-shell');

export const API_ORIGIN = 'https://api.test.local';

const target = process.argv[2] ?? 'android';
if (!['android', 'ios', 'web'].includes(target)) {
  console.error(`[e2e] cible inconnue : ${target} (android | ios | web)`);
  process.exit(1);
}
const out = join(root, 'e2e/.artifact', target);

const imports = { '@e2e/fake': target === 'web' ? '/egen-civitas/spa/e2e-fake.js' : '/app/e2e-fake.js' };
const routes = {
  '@e2e/fake': { platforms: [target], pages: [{ component: 'root', route: 'e2e' }] },
  '@e2e/ios-only': { platforms: ['ios'], pages: [{ component: 'root', route: 'ios' }] },
};

const env = {
  ...process.env,
  NODE_ENV: 'production',
  // Web : `development` pour que les overrides d'import map soient actifs (c'est ce que le scénario 7 contraste avec le natif,
  // qui reste en production et les ignore toujours).
  EGEN_ENV: target === 'web' ? 'development' : 'production',
  EGEN_OFFLINE: 'disable',
  EGEN_CLEAN_BEFORE_BUILD: 'true',
  EGEN_ESM_IMPORTMAP: JSON.stringify({ imports }),
  EGEN_ROUTES: JSON.stringify(routes),
  // Web : pas de EGEN_TARGET (comportement antérieur, règle R2) et API relative, comme en production Web.
  ...(target === 'web' ? { EGEN_API_URL: '/egen' } : { EGEN_TARGET: target, EGEN_API_URL: API_ORIGIN }),
};
if (target === 'web') delete env.EGEN_TARGET;

const result = spawnSync('yarn', ['rspack', '--mode', 'production'], { cwd: shell, env, stdio: 'inherit' });
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
rmSync(out, { recursive: true, force: true });
cpSync(join(shell, 'dist'), out, { recursive: true });
console.log(`[e2e] artefact ${target} copié dans ${out}`);
