/**
 * Scripts de démarrage de la cible NATIVE, émis comme FICHIERS au lieu d'être inline dans `index.html`.
 *
 * Pourquoi : la CSP native est `script-src 'self'` (voir `tools/targets.js`, champ `csp`), qui interdit tout script
 * inline exécutable ET tout gestionnaire d'événement inline (`onclick="…"`). Le HTML Web, lui, garde ses scripts
 * inline INCHANGÉS (règle R2) : `index.ejs` ne bascule vers ces fichiers que si `egenBootstrap` est défini.
 *
 * Restent inline dans le HTML natif les blocs de DONNÉES (`type="systemjs-importmap"`, `type="egen-routes"`) : le
 * navigateur ne les exécute pas, la CSP ne s'y applique donc pas ; SystemJS et le registre de routes les lisent
 * comme du texte.
 *
 * Tout ce fichier est pur : il retourne des chaînes de code, sans toucher au disque ni à `process.env`.
 */
const { createHash } = require('node:crypto');

/**
 * Anti-FOUC du thème : pose `data-theme` AVANT la CSS. Même logique que le bloc inline de `index.ejs` (Web) ;
 * `bootstrap.test.ts` exécute les DEUX et vérifie qu'ils produisent le même résultat (garde-fou contre la dérive).
 */
const THEME_SCRIPT = `(function () {
  try {
    var stored = window.localStorage.getItem('egen-theme-mode');
    var mode = (stored === 'light' || stored === 'dark') ? stored : 'dark';
    document.documentElement.setAttribute('data-theme', mode);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();`;

/**
 * Remplace les `onclick` inline du gabarit d'erreur (`<template id="app-error">`) : un seul écouteur délégué lit
 * `data-egen-action`. `copyText` est défini par le shell (`setupUtils`) avant tout clic.
 */
const ACTIONS_SCRIPT = `document.addEventListener('click', function (event) {
  var target = event.target;
  var element = target && target.closest ? target.closest('[data-egen-action]') : null;
  if (!element) {
    return;
  }
  var action = element.getAttribute('data-egen-action');
  if (action === 'reload') {
    location.reload();
  } else if (action === 'copy' && typeof window.copyText === 'function') {
    window.copyText(element.parentElement);
  }
});`;

/**
 * Script chargé dans le `<head>`, bloquant, AVANT les bundles : thème, puis ponts `window.egen*` (cible, IA, tenant).
 * Les ponts sont des chaînes JSON déjà sérialisées par `rspack.config.js` ; une valeur absente est ignorée.
 *
 * @param {{ bridges?: Array<string | null | undefined | false> }} options
 * @returns {string}
 */
function buildHeadBootstrap({ bridges = [] } = {}) {
  const assignments = bridges.filter(Boolean).map((json) => `Object.assign(window, ${json});`);
  return [THEME_SCRIPT, ...assignments].join('\n') + '\n';
}

/**
 * Script chargé en fin de `<body>`, APRÈS les bundles : écouteur des actions du gabarit d'erreur, puis
 * `initializeSpa(...)`. Mêmes valeurs que le bloc inline Web ; les chaînes sont échappées par `JSON.stringify`.
 *
 * @param {{ apiUrl: string, spaPath: string, env: string, offline: boolean, configUrls: string }} options
 *   `configUrls` : liste déjà formatée (`"a","b"`), comme `egenConfigUrls` côté Web.
 * @returns {string}
 */
function buildBodyBootstrap({ apiUrl, spaPath, env, offline, configUrls }) {
  return `${ACTIONS_SCRIPT}
initializeSpa({
  apiUrl: ${JSON.stringify(apiUrl)},
  spaPath: ${JSON.stringify(spaPath)},
  env: ${JSON.stringify(env)},
  offline: ${offline ? 'true' : 'false'},
  configUrls: [${configUrls}],
});
`;
}

/**
 * Nom de fichier stable et dépendant du contenu : `bootstrap-head.<hash>.js`. Un changement de configuration change
 * le nom, ce qui invalide proprement tout cache.
 *
 * @param {'head' | 'body'} kind
 * @param {string} source
 * @returns {string}
 */
function bootstrapFileName(kind, source) {
  const hash = createHash('sha256').update(source).digest('hex').slice(0, 16);
  return kind === 'head' ? `bootstrap-head.${hash}.js` : `bootstrap.${hash}.js`;
}

/**
 * Plugin Rspack minimal : émet des fichiers générés (nom → contenu) parmi les assets de la compilation.
 */
class EmitAssetsPlugin {
  /** @param {Array<{ name: string, source: string }>} files */
  constructor(files) {
    this.files = files;
  }

  apply(compiler) {
    const { RawSource } = compiler.rspack.sources;
    compiler.hooks.thisCompilation.tap('EmitAssetsPlugin', (compilation) => {
      compilation.hooks.processAssets.tap(
        { name: 'EmitAssetsPlugin', stage: compiler.rspack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL },
        () => {
          for (const { name, source } of this.files) {
            compilation.emitAsset(name, new RawSource(source));
          }
        },
      );
    });
  }
}

module.exports = {
  THEME_SCRIPT,
  ACTIONS_SCRIPT,
  buildHeadBootstrap,
  buildBodyBootstrap,
  bootstrapFileName,
  EmitAssetsPlugin,
};
