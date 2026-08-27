/**
 * This is the base webpack config for all Egen 3.x modules.
 *
 * ## Usage
 *
 * You can use it as simply as
 *
 * ```ts
 * module.exports = require('@egen-civitas/egen/default-rspack-config');
 * ```
 *
 * or you can customize the configuration using merges and overrides
 * like
 *
 * ```ts
 * const config = require('@egen-civitas/egen/default-rspack-config');
 * config.cssRuleConfig.rules = [myCustomRule];
 * module.exports = config;
 * ```
 *
 * ## Development
 *
 * Advice for working on this file:
 *
 * Don't use `yarn link` or symlinks to work on it.
 *
 * After you `yarn build --watch`, do something like
 * `watch "cp -R dist /path/to/packages/esm-patient-chart-app/webpack"`
 * and then change the webpack line from
 * `module.exports = require('@egen-civitas/egen/default-rspack-config');`
 * to
 * `module.exports = require('./webpack');`
 *
 * This is because Webpack has unpredictable behavior when working with
 * symlinked files, **even when using absolute paths**. You read that right.
 * Telling Webpack to use `/a/b/c`? If the Webpack config is symlinked
 * from `/d/e/`, then it *might* in *some cases* try to import `/d/e/c`.
 */
import { existsSync, readFileSync, statSync } from 'fs';
import { basename, dirname, resolve } from 'path';
import { parse as parseDotenv } from 'dotenv';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import { TsCheckerRspackPlugin } from 'ts-checker-rspack-plugin';
// eslint-disable-next-line no-restricted-imports
import { isArray, merge, mergeWith } from 'lodash';
import { inc } from 'semver';
import rspack, {
  container,
  CopyRspackPlugin,
  DefinePlugin,
  type ModuleOptions,
  type RuleSetRule,
  type RspackOptionsNormalized as RspackConfiguration,
} from '@rspack/core';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
import { StatsWriterPlugin } from 'webpack-stats-plugin';

type EgenRspackConfig = Omit<Partial<RspackConfiguration>, 'module'> & {
  module: ModuleOptions;
};

const production = 'production';
const { ModuleFederationPlugin } = container;

function getFrameworkVersion() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { version } = require('@egen-civitas/esm-framework/package.json');
    return `^${version}`;
  } catch {
    return '5.x';
  }
}

function makeIdent(name: string): string {
  if (name.includes('/')) {
    name = name.slice(name.indexOf('/'));
  }
  if (name.endsWith('-app')) {
    name = name.slice(0, -4);
  }
  return name;
}

function mergeFunction(objValue: any, srcValue: any) {
  if (isArray(objValue)) {
    return objValue.concat(srcValue);
  }
}

function slugify(name: string) {
  return name.replace(/[\/\-@]/g, '_');
}

function fileExistsSync(name: string) {
  return existsSync(name) && statSync(name).isFile();
}

/**
 * Remonte l'arborescence depuis `startDir` jusqu'à trouver le package.json
 * racine du monorepo (celui qui déclare `workspaces`). Chaque app vit à une
 * profondeur différente (packages/apps/X, packages/framework/Y, ...), donc
 * on ne peut pas supposer un nombre fixe de niveaux.
 */
export function findMonorepoRoot(startDir: string): string | null {
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    const candidate = resolve(dir, 'package.json');
    if (fileExistsSync(candidate)) {
      try {
        const pkg = JSON.parse(readFileSync(candidate, 'utf8'));
        if (Array.isArray(pkg.workspaces) || (pkg.workspaces && Array.isArray(pkg.workspaces.packages))) {
          return dir;
        }
      } catch {
        // package.json illisible — on continue de remonter
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * Charge et fusionne les fichiers `.env*` trouvés à la racine du monorepo
 * (celle détectée par findMonorepoRoot depuis `root`), selon la même
 * priorité que Create React App / Vite (la plus haute gagne) :
 *   1. `.env.<mode>.local` (non versionné, jamais committé — clés API perso)
 *   2. `.env.<mode>` (versionné, valeurs par défaut de dev/prod)
 *   3. `.env.local`
 *   4. `.env` (fallback commun à tous les modes)
 *
 * Ne lit PAS `process.env` — c'est à l'appelant de décider si les variables
 * déjà présentes dans le process courant (CI/CD, secrets d'infra) doivent
 * avoir le dernier mot (c'est le cas dans loadPublicEnvDefines ci-dessous,
 * et c'est aussi ce que fait `egen develop` — voir
 * packages/tooling/egen/src/commands/develop.ts — via PUBLIC_ENV_PREFIXES).
 *
 * Exporté pour être réutilisé en dehors de la config rspack elle-même,
 * partout où le process qui a besoin de ces variables ne recompile pas
 * lui-même les sources (ex. `egen develop`, qui sert des paquets déjà
 * pré-compilés et doit donc lire le .env séparément pour les faire
 * traverser au runtime via un pont `window.*`).
 */
export function loadMonorepoEnv(root: string, mode?: string): Record<string, string> {
  const resolvedMode = mode ?? 'development';
  const monorepoRoot = findMonorepoRoot(root);
  if (!monorepoRoot) return {};

  const candidateFiles = [`.env.${resolvedMode}.local`, `.env.${resolvedMode}`, '.env.local', '.env'];
  const merged: Record<string, string> = {};

  // On empile du moins prioritaire au plus prioritaire pour que les derniers
  // écrasent les premiers.
  for (const file of [...candidateFiles].reverse()) {
    const filePath = resolve(monorepoRoot, file);
    if (!fileExistsSync(filePath)) continue;
    try {
      Object.assign(merged, parseDotenv(readFileSync(filePath, 'utf8')));
    } catch {
      // Fichier .env mal formé — ignoré silencieusement pour ne jamais faire
      // échouer un build à cause d'une virgule ou d'un guillemet en trop.
    }
  }

  return merged;
}

/**
 * Préfixes de variables d'environnement reconnus comme « config navigateur » :
 * toute variable qui commence par l'un d'eux traverse automatiquement
 * jusqu'au bundle client. C'est une LISTE DE PRÉFIXES, volontairement pas
 * une liste de clés individuelles (contrairement à l'ancien
 * ADDITIONAL_RUNTIME_KEYS qui ne connaissait qu'EGEN_DEV_NO_AUTH) : ajouter
 * une nouvelle variable pour un futur besoin dev (ex. EGEN_DEV_MOCK_API) ne
 * doit jamais nécessiter de modifier ce fichier — il suffit de la nommer
 * avec le bon préfixe. Le framework impose une CONVENTION DE NOMMAGE, pas
 * les valeurs ni la liste des clés qui existeront un jour ; c'est au
 * consommateur (Frontend-esm-core, ou tout autre) de décider ce qu'il met
 * dans ces espaces de noms et avec quelles valeurs.
 *
 * Exporté pour rester la SOURCE UNIQUE de cette règle : `egen develop`
 * (packages/tooling/egen/src/commands/develop.ts) la réutilise telle quelle
 * pour le pont runtime `window.*` des paquets déjà pré-compilés (le shell),
 * afin que les deux canaux (DefinePlugin ici, window.* là-bas) ne puissent
 * jamais diverger sur ce qui est considéré "public".
 */
export const PUBLIC_ENV_PREFIXES = ['EGEN_AI_', 'EGEN_DEV_', 'EGEN_TENANT_'];

export function isPublicEnvKey(key: string): boolean {
  return PUBLIC_ENV_PREFIXES.some((prefix) => key.startsWith(prefix));
}

/**
 * Chemin du fichier de valeurs par défaut du framework, colocalisé avec ce
 * package et publié avec lui (voir .env.defaults à la racine de
 * @egen-civitas/rspack-config pour le détail de la hiérarchie et la
 * justification). `__dirname` pointe vers `dist/` une fois compilé, donc on
 * remonte d'un niveau pour retrouver la racine du package.
 */
const FRAMEWORK_DEFAULTS_PATH = resolve(__dirname, '..', '.env.defaults');

/**
 * Charge les valeurs par défaut du framework lui-même — voir .env.defaults.
 * C'est la couche la PLUS BASSE de resolvePublicEnv() : tout ce qui s'y
 * trouve peut être surchargé, en totalité, par le .env du consommateur ou
 * par process.env.
 */
function loadFrameworkDefaults(): Record<string, string> {
  if (!fileExistsSync(FRAMEWORK_DEFAULTS_PATH)) return {};
  try {
    return parseDotenv(readFileSync(FRAMEWORK_DEFAULTS_PATH, 'utf8'));
  } catch {
    // Fichier de défauts mal formé — ignoré silencieusement, comme pour les
    // .env du consommateur (voir loadMonorepoEnv).
    return {};
  }
}

/**
 * Résout la valeur EFFECTIVE de toutes les variables « publiques » (voir
 * PUBLIC_ENV_PREFIXES ci-dessus), après application de la hiérarchie
 * complète, de la moins à la plus prioritaire :
 *
 *   1. .env.defaults du FRAMEWORK (valeurs avec lesquelles il fonctionne
 *      si le consommateur ne précise rien — voir loadFrameworkDefaults)
 *   2. .env* du MONOREPO CONSOMMATEUR (voir loadMonorepoEnv)
 *   3. process.env au lancement de la commande (CI/CD, secrets d'infra, ou
 *      déjà positionné avant `yarn start`/`yarn build`)
 *
 * Le consommateur peut donc surcharger N'IMPORTE QUELLE variable du
 * framework, EN TOTALITÉ, simplement en la déclarant dans son propre .env —
 * aucune clé de .env.defaults n'est figée ou hors d'atteinte.
 *
 * SOURCE UNIQUE réutilisée par les deux canaux qui doivent rester
 * cohérents : `loadPublicEnvDefines` ci-dessous (DefinePlugin, pour les
 * apps compilées depuis les sources) et `egen develop`
 * (packages/tooling/egen/src/commands/develop.ts, pour le pont runtime
 * `window.*` des paquets déjà pré-compilés comme le shell).
 */
export function resolvePublicEnv(root: string, mode?: string): Record<string, string> {
  const merged: Record<string, string> = {
    ...loadFrameworkDefaults(),
    ...loadMonorepoEnv(root, mode),
  };

  for (const key of Object.keys(process.env)) {
    const value = process.env[key];
    if (value !== undefined) merged[key] = value;
  }

  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(merged)) {
    if (isPublicEnvKey(key)) result[key] = value;
  }
  return result;
}

/**
 * Prépare les variables `EGEN_AI_*`/`EGEN_DEV_*` (voir resolvePublicEnv
 * ci-dessus) pour `DefinePlugin`, afin que le code qui lit
 * `process.env.EGEN_AI_*`/`EGEN_DEV_*` côté navigateur (ex.
 * `@egen-civitas/esm-ai-config`, `@egen-civitas/esm-api`) reçoive de vraies
 * valeurs au lieu de retomber systématiquement sur ses défauts internes.
 */
function loadPublicEnvDefines(root: string, mode: string | undefined): Record<string, string> {
  const publicEnv = resolvePublicEnv(root, mode);

  const defines: Record<string, string> = {};
  for (const [key, value] of Object.entries(publicEnv)) {
    defines[`process.env.${key}`] = JSON.stringify(value);
  }

  return defines;
}

/**
 * This object will be merged into the webpack config.
 * Array values will be concatenated with the existing array.
 * Make sure to modify this object and not reassign it.
 */
export const overrides: Partial<EgenRspackConfig> = {};

/**
 * The keys of this object will override the top-level keys
 * of the webpack config.
 * Make sure to modify this object and not reassign it.
 */
export const additionalConfig: Partial<EgenRspackConfig> = {};

/**
 * This object will be merged into the webpack rule governing
 * the loading of JS, JSX, TS, etc. files.
 * Make sure to modify this object and not reassign it.
 */
export const scriptRuleConfig: Partial<RuleSetRule> = {};

/**
 * This object will be merged into the webpack rule governing
 * the loading of CSS files.
 * Make sure to modify this object and not reassign it.
 */
export const cssRuleConfig: Partial<RuleSetRule> = {};

/**
 * This object will be merged into the webpack rule governing
 * the loading of SCSS files.
 * Make sure to modify this object and not reassign it.
 */
export const scssRuleConfig: Partial<RuleSetRule> = {};

/**
 * This object will be merged into the webpack rule governing
 * the loading of static asset files.
 * Make sure to modify this object and not reassign it.
 */
export const assetRuleConfig: Partial<RuleSetRule> = {};

/**
 * This object will be merged into the webpack rule governing
 * the watch options.
 * Make sure to modify this object and not reassign it.
 */
export const watchConfig: Partial<EgenRspackConfig['watchOptions']> = {};

/**
 * This object will be merged with the webpack optimization
 * object.
 * Make sure to modify this object and not reassign it.
 */
export const optimizationConfig: Partial<EgenRspackConfig['optimization']> = {};

export default (env: Record<string, string>, argv: Record<string, string> = {}) => {
  const root = process.cwd();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { name, version, peerDependencies, browser, main, types } = require(resolve(root, 'package.json'));
  // this typing is provably incorrect, but actually works
  const mode = (argv.mode || process.env.NODE_ENV || 'development') as EgenRspackConfig['mode'];
  const devServerPort = argv.port ? Number(argv.port) : undefined;
  const devServerHost = argv.host || 'localhost';
  const filename = basename(browser || main);
  const outDir = dirname(browser || main);
  const srcFile = resolve(root, browser ? main : types);
  const ident = makeIdent(name);
  const frameworkVersion = getFrameworkVersion();
  const routes = resolve(root, 'src', 'routes.json');
  const hasRoutesDefined = fileExistsSync(routes);

  if (!hasRoutesDefined) {
    console.error(
      'This app does not define a routes.json. This file is required for this app to be used by the Egen 3 App Shell.',
    );
    // key-smash error code
    // so this (hopefully) doesn't interfere with Webpack-specific exit codes
    process.exit(9819023573289);
  }

  const cssLoader = {
    loader: require.resolve('css-loader'),
    options: {
      modules: {
        localIdentName: `${ident}__[name]__[local]___[hash:base64:5]`,
      },
    },
  };

  const baseConfig: EgenRspackConfig = {
    // The only `entry` in the application is the app shell. Everything else is
    // a Webpack Module Federation "remote." This ensures that there is always
    // only one container context--i.e., if we had an entry point per module,
    // WMF could get confused and not resolve shared dependencies correctly.
    output: {
      publicPath: 'auto',
      path: resolve(root, outDir),
      hashFunction: 'xxhash64',
    },
    module: {
      rules: [
        merge(
          {
            test: /\.m?(js|ts|tsx)$/,
            exclude: /node_modules/,
            loader: 'builtin:swc-loader',
            options: {
              jsc: {
                parser: {
                  syntax: 'typescript',
                  tsx: true,
                },
              },
            },
          },
          scriptRuleConfig,
        ),
        merge(
          {
            test: /\.css$/,
            use: [require.resolve('style-loader'), cssLoader],
          },
          cssRuleConfig,
        ),
        merge(
          {
            test: /\.s[ac]ss$/i,
            use: [
              require.resolve('style-loader'),
              cssLoader,
              {
                loader: require.resolve('sass-loader'),
                options: {
                  api: 'modern-compiler',
                  implementation: require.resolve('sass-embedded'),
                  sassOptions: { quietDeps: true },
                },
              },
            ],
          },
          scssRuleConfig,
        ),
        merge(
          {
            test: /\.(png|jpe?g|gif)$/i,
            type: 'asset/resource',
          },
          assetRuleConfig,
        ),
        {
          test: /\.svg$/i,
          type: 'asset/source',
        },
      ],
    },
    mode,
    devtool: mode === production ? 'hidden-nosources-source-map' : 'source-map',
    devServer: {
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      static: [resolve(root, outDir)],
    },
    watchOptions: merge(
      {
        ignored: ['.git', 'test-results'],
      },
      watchConfig,
    ),
    performance: {
      hints: mode === production && 'warning',
    },
    optimization: merge(
      {
        // The defaults for both of these are 30; however, due to the modular nature of
        // the frontend, we want each app to produce substantially
        splitChunks: {
          maxAsyncRequests: 3,
          maxInitialRequests: 1,
        },
        minimizer: [new rspack.SwcJsMinimizerRspackPlugin(), new rspack.LightningCssMinimizerRspackPlugin()],
      },
      optimizationConfig,
    ),
    plugins: [
      new TsCheckerRspackPlugin(),
      new CleanWebpackPlugin(),
      new BundleAnalyzerPlugin({
        analyzerMode: env && env.analyze ? 'server' : 'disabled',
      }),
      new DefinePlugin({
        'process.env.FRAMEWORK_VERSION': JSON.stringify(frameworkVersion),
        ...loadPublicEnvDefines(root, mode || 'development'),
      }),
      new ModuleFederationPlugin({
        // Look in the `esm-dynamic-loading` framework package for an explanation of how modules
        // get loaded into the application.
        name,
        library: { type: 'var', name: slugify(name) },
        filename,
        exposes: {
          './start': srcFile,
        },
        shared: [...Object.keys(peerDependencies), '@egen-civitas/esm-framework/src/internal'].reduce((obj, depName) => {
          if (depName === 'swr') {
            // SWR is annoying with Module Federation
            // See: https://github.com/webpack/webpack/issues/16125 and https://github.com/vercel/swr/issues/2356
            obj['swr/'] = {
              requiredVersion: peerDependencies['swr'] ?? false,
              strictVersion: false,
              singleton: true,
              import: 'swr/',
              shareKey: 'swr/',
              shareScope: 'default',
              // eslint-disable-next-line @typescript-eslint/no-require-imports
              version: require('swr/package.json').version,
            };
          } else {
            obj[depName] = {
              requiredVersion: peerDependencies[depName] ?? false,
              strictVersion: false,
              singleton: true,
              import: depName,
              shareKey: depName,
              shareScope: 'default',
            };
          }

          return obj;
        }, {}),
      }),
      hasRoutesDefined &&
        new CopyRspackPlugin({
          patterns: [
            {
              from: routes,
              transform: {
                transformer: (content) =>
                  JSON.stringify(
                    Object.assign({}, JSON.parse(content.toString()), {
                      version: mode === production ? version : inc(version, 'prerelease', 'local'),
                    }),
                  ),
              },
            },
          ],
        }),
      new StatsWriterPlugin({
        filename: `${filename}.buildmanifest.json`,
        stats: {
          all: false,
          chunks: true,
        },
      }),
    ].filter(Boolean),
    resolve: {
      extensions: ['.tsx', '.ts', '.jsx', '.js', '.scss', '.json'],
      extensionAlias: {
        '.js': ['.ts', '.tsx', '.js'],
      },
      alias: {
        '@egen-civitas/esm-framework': '@egen-civitas/esm-framework/src/internal',
        'lodash.debounce': 'lodash-es/debounce',
        'lodash.findlast': 'lodash-es/findLast',
        'lodash.omit': 'lodash-es/omit',
        'lodash.throttle': 'lodash-es/throttle',
      },
    },
    ...(devServerPort !== undefined && {
      lazyCompilation: {
        imports: true,
        entries: false,
        serverUrl: `http://${devServerHost}:${devServerPort}`,
      },
    }),
    ...overrides,
  };
  return mergeWith(baseConfig, additionalConfig, mergeFunction);
};
