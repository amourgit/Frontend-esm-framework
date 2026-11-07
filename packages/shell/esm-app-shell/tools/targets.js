/**
 * Résolution de la CIBLE de build (web | android | ios).
 *
 * Fonction PURE : elle ne lit jamais `process.env` elle-même — l'appelant lui passe l'objet d'environnement.
 * C'est le SEUL endroit où les différences entre cibles sont décidées (cf. docs/EGEN-FRAMEWORK-DEV.md, B1).
 * Pour la cible `web`, chaque valeur reproduit exactement le comportement historique du `rspack.config.js`.
 */
const { removeTrailingSlash } = require('./helpers');

const TARGETS = ['web', 'android', 'ios'];
const DEFAULT_WEB_PUBLIC_PATH = '/egen-civitas/spa';
const NATIVE_PUBLIC_PATH = '/app';

// Une chaîne JS non vide est toujours truthy : un import map `{"imports":{}}` ou un registre `{}` est donc
// traité comme ABSENT (cf. build:production du shell, qui les fournit vides pour que le consommateur les serve).
function isMeaningfulImportmap(value) {
  if (!value) {
    return false;
  }
  try {
    const parsed = JSON.parse(value);
    return !!(parsed && parsed.imports && Object.keys(parsed.imports).length > 0);
  } catch {
    // JSON invalide : on ne devine pas, la valeur est considérée significative (l'échec sera explicite au parsing client).
    return true;
  }
}

function isMeaningfulRoutesRegistry(value) {
  if (!value) {
    return false;
  }
  try {
    const parsed = JSON.parse(value);
    return !!(parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0);
  } catch {
    return true;
  }
}

/**
 * @param {Record<string, string | undefined>} env Variables d'environnement (EGEN_*).
 * @param {{ environment?: 'production' | 'development' | 'test' }} [options]
 *   `environment` : valeur déjà résolue de EGEN_ENV (cf. resolveEnvironment dans rspack.config.js).
 * @returns {{
 *   target: 'web' | 'android' | 'ios',
 *   native: boolean,
 *   publicPath: string,
 *   serviceWorker: boolean,
 *   offlineData: boolean,
 *   importmapDef: string | undefined,
 *   importmapUrl: string,
 *   routesDef: string | undefined,
 *   routesUrl: string,
 *   allowImportMapOverrides: boolean,
 *   allowDevAuthBypass: boolean,
 *   requireAbsoluteApiUrl: boolean,
 *   warnings: string[],
 * }}
 * @throws {Error} Si la combinaison cible/options est invalide (toutes les erreurs sont listées).
 */
function resolveTarget(env, options = {}) {
  const raw = (env.EGEN_TARGET || '').trim();
  const target = raw === '' ? 'web' : raw;

  if (!TARGETS.includes(target)) {
    throw new Error(`EGEN_TARGET="${raw}" inconnu. Valeurs autorisées : ${TARGETS.join(', ')}.`);
  }

  const native = target !== 'web';
  const warnings = [];
  const errors = [];

  const offlineRequested = env.EGEN_OFFLINE === 'enable';
  const importmapDef = isMeaningfulImportmap(env.EGEN_ESM_IMPORTMAP) ? env.EGEN_ESM_IMPORTMAP : undefined;
  const routesDef = isMeaningfulRoutesRegistry(env.EGEN_ROUTES) ? env.EGEN_ROUTES : undefined;

  if (!native) {
    const publicPath = removeTrailingSlash(env.EGEN_PUBLIC_PATH || DEFAULT_WEB_PUBLIC_PATH);
    return {
      target,
      native,
      publicPath,
      serviceWorker: offlineRequested,
      offlineData: offlineRequested,
      importmapDef,
      importmapUrl: env.EGEN_ESM_IMPORTMAP_URL || `${publicPath}/importmap.json`,
      routesDef,
      routesUrl: env.EGEN_ROUTES_URL || `${publicPath}/routes.registry.json`,
      allowImportMapOverrides: true,
      allowDevAuthBypass: true,
      requireAbsoluteApiUrl: false,
      warnings,
    };
  }

  // ── Cible native : artefact autonome et verrouillé ──────────────────────────────────────────
  if (env.EGEN_PUBLIC_PATH && removeTrailingSlash(env.EGEN_PUBLIC_PATH) !== NATIVE_PUBLIC_PATH) {
    warnings.push(
      `EGEN_PUBLIC_PATH="${env.EGEN_PUBLIC_PATH}" ignoré : la cible ${target} impose "${NATIVE_PUBLIC_PATH}".`,
    );
  }

  if (env.EGEN_DEV_NO_AUTH === 'true') {
    errors.push(`EGEN_DEV_NO_AUTH=true est interdit pour la cible ${target} (contournement d'authentification).`);
  }

  if (!/^https:\/\//i.test(env.EGEN_API_URL || '')) {
    errors.push(
      `EGEN_API_URL doit être une URL absolue https:// pour la cible ${target} (reçu : "${env.EGEN_API_URL ?? ''}").`,
    );
  }

  if (!importmapDef) {
    errors.push(
      `EGEN_ESM_IMPORTMAP doit contenir un import map non vide (inline) pour la cible ${target} : l'artefact doit être autonome.`,
    );
  }

  if (!routesDef) {
    errors.push(
      `EGEN_ROUTES doit contenir un registre de routes non vide (inline) pour la cible ${target} : l'artefact doit être autonome.`,
    );
  }

  if (env.EGEN_ESM_IMPORTMAP_URL || env.EGEN_ROUTES_URL) {
    errors.push(
      `EGEN_ESM_IMPORTMAP_URL / EGEN_ROUTES_URL sont interdits pour la cible ${target} (aucune ressource de composition distante).`,
    );
  }

  if (options.environment && options.environment !== 'production') {
    errors.push(`La cible ${target} exige EGEN_ENV=production (reçu : "${options.environment}").`);
  }

  if (errors.length > 0) {
    throw new Error(`Configuration invalide pour EGEN_TARGET=${target} :\n - ${errors.join('\n - ')}`);
  }

  return {
    target,
    native,
    publicPath: NATIVE_PUBLIC_PATH,
    // Les fichiers sont dans le binaire : aucun service worker. Les données hors ligne restent actives par défaut.
    serviceWorker: false,
    offlineData: env.EGEN_OFFLINE_DATA !== 'disable',
    importmapDef,
    importmapUrl: '',
    routesDef,
    routesUrl: '',
    allowImportMapOverrides: false,
    allowDevAuthBypass: false,
    requireAbsoluteApiUrl: true,
    warnings,
  };
}

module.exports = { resolveTarget, isMeaningfulImportmap, isMeaningfulRoutesRegistry, TARGETS };
