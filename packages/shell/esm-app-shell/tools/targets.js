/**
 * Résolution de la cible de build du Shell : `web` | `android` | `ios`.
 *
 * C'est, avec `@egen-civitas/esm-platform` (runtime) et le Host (hors dépôt), le SEUL endroit où les différences
 * entre cibles ont le droit de vivre (règle R1 de docs/EGEN-FRAMEWORK-DEV.md). Aucun autre fichier du build ne doit
 * comparer `target` à une valeur : il lit un champ de `TargetConfig` (règle N1).
 *
 * `resolveTarget` est une fonction PURE : elle ne lit jamais `process.env`. L'appelant lui passe un objet dont les
 * valeurs sont DÉJÀ résolues (cf. `rspack.config.js`) :
 *  - `EGEN_ENV` : le résultat de `resolveEnvironment(mode)` (repli sur NODE_ENV / mode), pas la variable brute ;
 *  - `EGEN_DEV_NO_AUTH` : la valeur de `resolvePublicEnv()` (fichiers `.env*` compris), pas `process.env` seul.
 * Sans cela, un `.env` pourrait réactiver le bypass d'authentification dans un artefact natif sans que le build échoue.
 *
 * Par défaut (`EGEN_TARGET` absent ou vide) le résultat reproduit exactement le comportement Web antérieur (règle R2).
 */
const { removeTrailingSlash, isMeaningfulImportmap, isMeaningfulRoutesRegistry } = require('./helpers');

/** Cibles connues. Toute autre valeur est une erreur : pas de repli silencieux. */
const TARGETS = Object.freeze(['web', 'android', 'ios']);

/** Chemin public de l'artefact natif : constante, jamais lue dans l'environnement (cf. piège `EGEN_PUBLIC_PATH=''`). */
const NATIVE_PUBLIC_PATH = '/app';

const WEB_DEFAULT_PUBLIC_PATH = '/egen-civitas/spa';

/**
 * CSP de départ de la cible native (proposition à valider sur appareil, cf. tâche B5).
 * Les styles `'unsafe-inline'` sont à réexaminer (Carbon / injection de styles). `'unsafe-eval'` est interdit.
 *
 * @param {string} apiOrigin Origine de l'API (`https://api.exemple.ga`), déjà validée.
 * @returns {string}
 */
function buildNativeCsp(apiOrigin) {
  return [
    "default-src 'none'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self' ${apiOrigin}`,
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

function isParseableJson(value) {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Erreurs de validation propres à une cible native. Toutes sont collectées (et non la première seulement) afin
 * qu'un build en échec indique d'un coup tout ce qu'il y a à corriger.
 *
 * @param {Record<string, string | undefined>} env
 * @returns {{ errors: string[], apiOrigin: string | null }}
 */
function validateNative(env) {
  const errors = [];
  let apiOrigin = null;

  if (env.EGEN_ENV !== 'production') {
    errors.push(
      `EGEN_ENV doit valoir "production" pour une cible native (reçu : ${JSON.stringify(env.EGEN_ENV ?? null)}).`,
    );
  }

  if (
    String(env.EGEN_DEV_NO_AUTH ?? '')
      .trim()
      .toLowerCase() === 'true'
  ) {
    errors.push(
      'EGEN_DEV_NO_AUTH=true est interdit pour une cible native : le contournement de l’authentification ne doit jamais être embarqué.',
    );
  }

  const apiUrl = env.EGEN_API_URL ?? '';
  if (!/^https:\/\//.test(apiUrl)) {
    errors.push(
      `EGEN_API_URL doit être une URL absolue en https:// pour une cible native (reçu : ${JSON.stringify(apiUrl || null)}).`,
    );
  } else {
    try {
      apiOrigin = new URL(apiUrl).origin;
    } catch {
      errors.push(`EGEN_API_URL n’est pas une URL valide (reçu : ${JSON.stringify(apiUrl)}).`);
    }
  }

  // Un artefact natif doit être autonome : import map et routes figées dans le HTML, jamais téléchargées.
  if (!isMeaningfulImportmap(env.EGEN_ESM_IMPORTMAP)) {
    errors.push(
      'EGEN_ESM_IMPORTMAP doit contenir une import map non vide pour une cible native (un artefact natif est autonome : pas de mode « url »).',
    );
  } else if (!isParseableJson(env.EGEN_ESM_IMPORTMAP)) {
    errors.push('EGEN_ESM_IMPORTMAP n’est pas du JSON valide.');
  }

  // Aucune ressource de composition distante : même avec une version inline, une URL signalerait une intention
  // (ou une configuration héritée) incompatible avec un artefact autonome, mieux vaut échouer que l'ignorer.
  for (const name of ['EGEN_ESM_IMPORTMAP_URL', 'EGEN_ROUTES_URL']) {
    if (env[name]) {
      errors.push(`${name} est interdit pour une cible native (aucune ressource de composition distante).`);
    }
  }

  if (!isMeaningfulRoutesRegistry(env.EGEN_ROUTES)) {
    errors.push(
      'EGEN_ROUTES doit contenir un registre de routes non vide pour une cible native (un artefact natif est autonome : pas de mode « url »).',
    );
  } else if (!isParseableJson(env.EGEN_ROUTES)) {
    errors.push('EGEN_ROUTES n’est pas du JSON valide.');
  }

  return { errors, apiOrigin };
}

/**
 * @typedef {Object} TargetConfig
 * @property {'web' | 'android' | 'ios'} target
 * @property {boolean} native Vrai pour toute cible autre que `web`.
 * @property {string} publicPath Sans slash final. Web : `EGEN_PUBLIC_PATH` ou `/egen-civitas/spa` ; natif : `/app`.
 * @property {boolean} serviceWorker Web : `EGEN_OFFLINE === 'enable'` ; natif : toujours faux.
 * @property {boolean} offlineData Web : `EGEN_OFFLINE === 'enable'` ; natif : sauf `EGEN_OFFLINE_DATA === 'disable'`.
 * @property {'inline' | 'url'} importmapMode Web : `inline` si l'import map est significative, sinon `url` ; natif : `inline`.
 * @property {'inline' | 'url'} routesMode Idem pour le registre de routes.
 * @property {boolean} allowImportMapOverrides Web : vrai (comportement actuel, pas de restriction) ; natif : faux.
 * @property {boolean} allowDevAuthBypass Web : vrai (comportement actuel) ; natif : faux.
 * @property {boolean} requireAbsoluteApiUrl Natif : vrai.
 * @property {string | null} csp Web : `null` ; natif : politique CSP.
 */

/**
 * @param {Record<string, string | undefined>} env Valeurs déjà résolues (voir l'en-tête du fichier).
 * @returns {Readonly<TargetConfig>}
 * @throws {Error} si la cible est inconnue ou si une règle de validation native est violée.
 */
function resolveTarget(env) {
  // Absent ou vide (`EGEN_TARGET=` dans un .env) = non fourni = web. Toute autre valeur doit être exacte.
  const target = env.EGEN_TARGET ? env.EGEN_TARGET : 'web';

  if (!TARGETS.includes(target)) {
    throw new Error(`EGEN_TARGET inconnu : ${JSON.stringify(target)}. Valeurs acceptées : ${TARGETS.join(', ')}.`);
  }

  if (target === 'web') {
    const offline = env.EGEN_OFFLINE === 'enable';
    return Object.freeze({
      target,
      native: false,
      publicPath: removeTrailingSlash(env.EGEN_PUBLIC_PATH || WEB_DEFAULT_PUBLIC_PATH),
      serviceWorker: offline,
      offlineData: offline,
      importmapMode: isMeaningfulImportmap(env.EGEN_ESM_IMPORTMAP) ? 'inline' : 'url',
      routesMode: isMeaningfulRoutesRegistry(env.EGEN_ROUTES) ? 'inline' : 'url',
      allowImportMapOverrides: true,
      allowDevAuthBypass: true,
      requireAbsoluteApiUrl: false,
      csp: null,
    });
  }

  const { errors, apiOrigin } = validateNative(env);
  if (errors.length > 0) {
    throw new Error(
      `Build impossible pour la cible "${target}" :\n${errors.map((message) => `  - ${message}`).join('\n')}`,
    );
  }

  return Object.freeze({
    target,
    native: true,
    publicPath: NATIVE_PUBLIC_PATH,
    serviceWorker: false,
    offlineData: env.EGEN_OFFLINE_DATA !== 'disable',
    importmapMode: 'inline',
    routesMode: 'inline',
    allowImportMapOverrides: false,
    allowDevAuthBypass: false,
    requireAbsoluteApiUrl: true,
    csp: buildNativeCsp(apiOrigin),
  });
}

/**
 * Pont build → runtime : clés posées sur `window` par le HTML, sur le modèle des ponts `egenAi*` / `egenTenant*`.
 * Liste blanche : toute clé ajoutée ici doit être ajoutée au test (`targets.test.ts`) et ne jamais porter de secret (N3).
 *
 * Web : `null` (rien n'est injecté, le HTML Web reste identique, R2) ; l'absence de `window.egenTarget` vaut `web`.
 *
 * @param {Readonly<TargetConfig>} config
 * @returns {{ egenTarget: 'android' | 'ios' } | null}
 */
function targetWindowBridge(config) {
  return config.native ? { egenTarget: config.target } : null;
}

module.exports = { resolveTarget, targetWindowBridge, buildNativeCsp, TARGETS, NATIVE_PUBLIC_PATH };
