const {
  CssExtractRspackPlugin,
  CopyRspackPlugin,
  DefinePlugin,
  container,
  util: { createHash },
} = require('@rspack/core');
const CleanWebpackPlugin = require('clean-webpack-plugin').CleanWebpackPlugin;
const HtmlWebpackPlugin = require('html-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const WebpackPwaManifest = require('webpack-pwa-manifest');
const { basename, dirname, resolve } = require('path');
const path = require('path');
const { resolvePublicEnv } = require('@egen-civitas/rspack-config');

// Load .env from the monorepo root (two levels up from packages/shell/esm-app-shell)
try {
  require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });
} catch (e) {
  // dotenv not installed, skip — env vars must be set via OS/CI environment
}


const { mkdirSync, readdirSync, statSync, readFileSync, writeFileSync } = require('node:fs');
const semver = require('semver');
const { removeTrailingSlash, getTimestamp } = require('./tools/helpers');
const { resolveTarget, targetWindowBridge } = require('./tools/targets');
const { assertSafeBridgeKeys } = require('./tools/env-bridge');
const { resolveBranding } = require('./tools/brand');
const { buildHeadBootstrap, buildBodyBootstrap, bootstrapFileName, EmitAssetsPlugin } = require('./tools/bootstrap');

const { name, version, dependencies } = require('./package.json');
const sharedDependencies = require('./dependencies.json');
const frameworkVersion = require('@egen-civitas/esm-framework/package.json').version;

const timestamp = getTimestamp();
const production = 'production';
const allowedSuffixes = ['-app', '-widgets'];
const { ModuleFederationPlugin } = container;

const egenAddCookie = process.env.EGEN_ADD_COOKIE;
const egenApiUrl = removeTrailingSlash(process.env.EGEN_API_URL || '/egen');
// Default proxy target is localhost. Set EGEN_PROXY_TARGET in .env to point to your EGEN backend.
const egenProxyTarget = process.env.EGEN_PROXY_TARGET || 'http://localhost:8082/';
const egenPageTitle = process.env.EGEN_PAGE_TITLE || 'Egen';
// Métadonnées de l'application installable (PWA) — neutres par défaut, à fournir par le consommateur.
const egenPageDescription = process.env.EGEN_PAGE_DESCRIPTION || egenPageTitle;
const egenThemeColor = process.env.EGEN_THEME_COLOR || '#161616';
// Identité visuelle (favicon, icône PWA) : le shell n'embarque que des assets neutres ; le consommateur
// fournit les siens via EGEN_BRAND_DIR (voir tools/brand.js et le README).
const egenBranding = resolveBranding(process.env, { defaultAssetsDir: resolve(__dirname, 'src/assets') });

/**
 * Pont EGEN_TENANT_* (process.env, coté build Node) → window.egenTenant*
 * (runtime navigateur).
 * Nécessaire car le bundle shell est construit avec rspack : il n'y a pas d'`import.meta.env` dans le bundle
 * produit, et `process.env[key]` en accès dynamique n'est pas remplaçable par un `DefinePlugin` (remplacement
 * textuel statique). Voir @egen-civitas/esm-tenant/src/config/env.ts pour le détail complet et le
 * tableau de correspondance. Sans ce pont, tout `.env` EGEN_TENANT_* est
 * silencieusement ignoré et `setupTenantSystem()` démarre toujours en
 * mode "off", quelle que soit la configuration.
 *
 * La correspondance nom↔nom n'est pas mécanique partout : on utilise donc
 * une table explicite plutôt qu'une fonction de transformation générique,
 * pour rester sans ambiguïté.
 *
 * Refonte du 8 août 2026 : EGEN_TENANT_REGISTRY_URL / EGEN_TENANT_THEME_APPLY
 * retirés — il n'y a plus de registry de tenants ni de thème piloté par
 * tenant côté frontend (voir @egen-civitas/esm-tenant/src/types.ts).
 */
const EGEN_TENANT_ENV_TO_WINDOW_KEY = {
  EGEN_TENANT_MODE: 'egenTenantMode',
  EGEN_TENANT_ID: 'egenTenantId',
  EGEN_TENANT_PERSIST: 'egenTenantPersist',
  EGEN_TENANT_RESOLUTION_ORDER: 'egenTenantResolutionOrder',
  EGEN_TENANT_PATH_PREFIX: 'egenTenantPathPrefix',
  EGEN_TENANT_JWT_CLAIM: 'egenTenantJwtClaim',
  EGEN_TENANT_ROOT_DOMAIN: 'egenTenantRootDomain',
};

assertSafeBridgeKeys('EGEN_TENANT_*', [
  ...Object.keys(EGEN_TENANT_ENV_TO_WINDOW_KEY),
  ...Object.values(EGEN_TENANT_ENV_TO_WINDOW_KEY),
]);

const egenTenantWindowOverrides = Object.entries(EGEN_TENANT_ENV_TO_WINDOW_KEY).reduce((acc, [envKey, winKey]) => {
  if (process.env[envKey] !== undefined) {
    acc[winKey] = process.env[envKey];
  }
  return acc;
}, {});
const egenTenantConfigDef =
  Object.keys(egenTenantWindowOverrides).length > 0 ? JSON.stringify(egenTenantWindowOverrides) : null;

console.log("EGEN_API_URL =", process.env.EGEN_API_URL);
/**
 * Resolves the target environment from EGEN_ENV, falling back to NODE_ENV / build mode.
 *
 * Accepts aliases ("prod" → "production", "dev" → "development") and defaults
 * to "production" when nothing is set — so dev features are never accidentally
 * enabled in an unconfigured build.
 *
 * @param {string} buildMode rspack/webpack build mode ("production" | "development")
 * @returns {"production" | "development" | "test"}
 */
function resolveEnvironment(buildMode) {
  const raw = process.env.EGEN_ENV;

  if (raw) {
    switch (raw) {
      case 'production':
      case 'prod':
        return 'production';
      case 'development':
      case 'dev':
        return 'development';
      case 'test':
        return 'test';
      default:
        console.warn(`Unknown EGEN_ENV value "${raw}", defaulting to "production".`);
        return 'production';
    }
  }

  // No explicit EGEN_ENV — derive from NODE_ENV or build mode.
  // Only "development" is treated as development; everything else is production.
  const fallback = process.env.NODE_ENV || buildMode || '';
  return fallback === 'development' ? 'development' : 'production';
}
const egenDefaultLocale = process.env.EGEN_ESM_DEFAULT_LOCALE || 'en';
const egenCoreApps = process.env.EGEN_ESM_CORE_APPS_DIR || resolve(__dirname, '../../apps');
const egenConfigUrls = (process.env.EGEN_CONFIG_URLS || '')
  .split(';')
  .filter((url) => url.length > 0)
  .map((url) => JSON.stringify(url))
  .join(', ');
const egenJsCssAssets = (process.env.EGEN_JS_CSS_ASSETS || '').split(';').filter((filePath) => filePath.length > 0);

const egenCleanBeforeBuild =
  (() => {
    try {
      return (
        process.env.EGEN_CLEAN_BEFORE_BUILD === undefined ||
        (typeof process.env.EGEN_CLEAN_BEFORE_BUILD === 'boolean' && process.env.EGEN_CLEAN_BEFORE_BUILD) ||
        (typeof process.env.EGEN_CLEAN_BEFORE_BUILD === 'string' &&
          process.env.EGEN_CLEAN_BEFORE_BUILD.toLowerCase() !== 'false')
      );
    } catch {
      // this is intensionally a no-op
    }

    return undefined;
  })() ?? true;

function checkDirectoryExists(dirName) {
  if (dirName) {
    try {
      return statSync(dirName).isDirectory();
    } catch {
      return false;
    }
  }
  return false;
}

function checkFileExists(filename) {
  if (filename) {
    try {
      return statSync(filename).isFile();
    } catch {
      return false;
    }
  }
  return false;
}

function checkDirectoryHasContents(dirName) {
  if (checkDirectoryExists(dirName)) {
    const contents = readdirSync(dirName);
    return contents.length > 0;
  } else {
    return false;
  }
}

// taken from: https://stackoverflow.com/a/6969486
// this function is CC BY-SA 4.0
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * @param {Record<string, string>} env
 * @param {Array<string>} argv
 * @returns {import("@rspack/core").Configuration}
 */
module.exports = (env, argv = []) => {
  const mode = argv.mode || process.env.NODE_ENV || production;
  const outDir = mode === production ? 'dist' : 'lib';
  const isProd = mode === 'production';
  const egenEnvironment = resolveEnvironment(mode);
  const appPatterns = [];

  // Variables "publiques" (EGEN_DEV_*) résolues selon la même
  // hiérarchie que partout ailleurs dans le framework — voir
  // resolvePublicEnv() dans @egen-civitas/rspack-config : .env.defaults du
  // framework < .env* trouvé en remontant depuis ce dossier (racine du
  // repo framework, faute d'un .env consommateur ici) < process.env. Seule
  // source de vérité pour EGEN_DEV_NO_AUTH plus bas (DefinePlugin) — plus
  // de valeur par défaut dupliquée en dur dans ce fichier.
  const publicEnv = resolvePublicEnv(__dirname, mode);

  // Cible de build (web | android | ios) : seule source de vérité des différences entre cibles (tools/targets.js).
  // Appelée ici, et non en tête de fichier, car la validation native a besoin de valeurs RÉSOLUES : EGEN_ENV
  // (egenEnvironment) et EGEN_DEV_NO_AUTH (publicEnv, fichiers .env* compris), pas de process.env brut.
  // Sans EGEN_TARGET, le résultat reproduit exactement le comportement Web antérieur.
  const target = resolveTarget({
    ...process.env,
    EGEN_ENV: egenEnvironment,
    EGEN_DEV_NO_AUTH: publicEnv.EGEN_DEV_NO_AUTH,
  });
  const targetBridge = targetWindowBridge(target);
  const egenTargetConfigDef = targetBridge ? JSON.stringify(targetBridge) : null;
  const egenPublicPath = target.publicPath;
  const egenFavicon = process.env.EGEN_FAVICON || `${egenPublicPath}/favicon.ico`;
  // `offline` = données hors ligne et UI sensible à la connectivité ; `serviceWorker` = cache des ressources. Séparés (E1) :
  // une cible native garde les données hors ligne sans service worker. Web : les deux valent EGEN_OFFLINE (HTML inchangé).
  const egenOffline = target.offlineData;
  const egenImportmapDef = target.importmapMode === 'inline' ? process.env.EGEN_ESM_IMPORTMAP : undefined;
  const egenImportmapUrl = process.env.EGEN_ESM_IMPORTMAP_URL || `${egenPublicPath}/importmap.json`;
  const egenRoutesDef = target.routesMode === 'inline' ? process.env.EGEN_ROUTES : undefined;
  const egenRoutesUrl = process.env.EGEN_ROUTES_URL || `${egenPublicPath}/routes.registry.json`;

  // Cible native : la CSP `script-src 'self'` interdit les scripts et gestionnaires inline. Les scripts de démarrage
  // (thème, ponts window.egen*, initializeSpa) sont donc ÉMIS comme fichiers ; index.ejs ne les référence que si
  // `egenBootstrap` est défini. Web : `null`, HTML strictement inchangé (R2).
  let egenBootstrap = null;
  let bootstrapFiles = [];
  if (target.native) {
    const headSource = buildHeadBootstrap({ bridges: [egenTargetConfigDef, egenTenantConfigDef] });
    const bodySource = buildBodyBootstrap({
      apiUrl: egenApiUrl,
      spaPath: egenPublicPath,
      env: egenEnvironment,
      offline: egenOffline,
      serviceWorker: target.serviceWorker,
      configUrls: egenConfigUrls,
    });
    egenBootstrap = { head: bootstrapFileName('head', headSource), body: bootstrapFileName('body', bodySource) };
    bootstrapFiles = [
      { name: egenBootstrap.head, source: headSource },
      { name: egenBootstrap.body, source: bodySource },
    ];
  }

  const coreImportmap = {
    imports: {},
  };

  const coreRoutes = {};

  if (!isProd && checkDirectoryExists(egenCoreApps)) {
    readdirSync(egenCoreApps).forEach((dir) => {
      const appDir = resolve(egenCoreApps, dir);
      if (checkDirectoryExists(appDir)) {
        const { name, browser } = require(resolve(appDir, 'package.json'));
        const distDir = resolve(appDir, dirname(browser));
        if (allowedSuffixes.some((suffix) => name.endsWith(suffix))) {
          if (checkDirectoryHasContents(distDir)) {
            appPatterns.push({
              from: distDir,
              to: dir,
            });

            coreImportmap.imports[name] = `./${dir}/${basename(browser)}`;

            const routesFile = resolve(distDir, 'routes.json');
            if (checkFileExists(routesFile)) {
              coreRoutes[name] = JSON.parse(readFileSync(routesFile));
            }
          } else {
            console.warn(`Not serving ${name} because couldn't find ${distDir}`);
          }
        }
      }
    });
  }

  const assetsPatterns = egenJsCssAssets.map((asset) => ({ from: asset, to: 'assets' }));

  // La feuille globale du styleguide est du CSS standard (plus de préprocesseur) : on la lit telle quelle, hors rspack,
  // pour qu'elle reste un fichier statique sans JS, haché par contenu pour le cache long terme.
  const sassOutput = readFileSync(require.resolve('@egen-civitas/esm-styleguide/styles'), 'utf-8');

  const cssImportRegex = /@import\s*["']([^"']+)["']\s*;?\n?/g;
  const inlinedImports = [];
  const nodeModulesDir = resolve(__dirname, '..', '..', '..', 'node_modules');
  const strippedCSS = sassOutput.replace(cssImportRegex, (_, importPath) => {
    const resolvedPath = resolve(nodeModulesDir, importPath);
    if (checkFileExists(resolvedPath)) {
      inlinedImports.push(readFileSync(resolvedPath, 'utf-8'));
    } else {
      console.warn(`Could not resolve CSS import: ${importPath}`);
      return `@import "${importPath}";\n`;
    }
    return '';
  });
  // Rewrite url("~package/path") references to url("fonts/filename") and collect
  // the actual font file paths so they can be copied to dist/fonts/.
  const fontAssets = new Set();
  const resolvedCSS = (inlinedImports.join('\n') + strippedCSS).replace(
    /url\(["']?~([^"')]+)["']?\)/g,
    (_, assetPath) => {
      const resolvedPath = resolve(nodeModulesDir, assetPath);
      if (checkFileExists(resolvedPath)) {
        fontAssets.add(resolvedPath);
        return `url("fonts/${basename(resolvedPath)}")`;
      }
      console.warn(`Could not resolve font asset: ${assetPath}`);
      return `url("${assetPath}")`;
    },
  );
  const styleguideCSS = resolvedCSS;
  let egenCssFilename = 'egen.css';
  if (isProd) {
    const cssHash = createHash('sha256').update(styleguideCSS).digest('hex').slice(0, 16);
    egenCssFilename = `egen.${cssHash}.css`;
  }

  const cssTmpDir = resolve(__dirname, '.tmp');
  mkdirSync(cssTmpDir, { recursive: true });
  writeFileSync(resolve(cssTmpDir, egenCssFilename), styleguideCSS);

  const fontPatterns = [...fontAssets].map((fontPath) => ({ from: fontPath, to: 'fonts' }));

  return {
    entry: resolve(__dirname, 'src/index.ts'),
    output: {
      filename: isProd ? 'egen.[contenthash].js' : 'egen.js',
      chunkFilename: '[chunkhash].js',
      path: resolve(__dirname, outDir),
      publicPath: '',
      hashFunction: 'xxhash64',
    },
    target: 'web',
    // Module Federation v1.5 is incompatible with lazy compilation
    lazyCompilation: false,
    devServer: {
      compress: true,
      open: [`${egenPublicPath}/`.substring(1)],
      devMiddleware: {
        publicPath: `${egenPublicPath}/`,
      },
      historyApiFallback: {
        rewrites: [
          {
            from: new RegExp(`^${escapeRegExp(egenPublicPath)}/.*(?!\\.(?!html).+$)`),
            to: `${egenPublicPath}/index.html`,
          },
        ],
      },
      proxy: [
        {
          /**
           * @param {String} path
           */
          context(path) {
            if (!path) {
              return false;
            }

            if (path.startsWith(egenPublicPath)) {
              if (basename(path).indexOf('.') >= 0) {
                return true;
              } else {
                return false;
              }
            }

            if (path.startsWith(egenApiUrl)) {
              return true;
            }

            return false;
          },
          target: egenProxyTarget,
          changeOrigin: true,
          /**
           * @param {Request} proxyReq
           */
          onProxyReq(proxyReq) {
            if (egenAddCookie) {
              const origCookie = proxyReq.getHeader('cookie');
              const newCookie = `${origCookie};${egenAddCookie}`;
              proxyReq.setHeader('cookie', newCookie);
            }
          },
          /**
           * @param {Response} proxyRes
           */
          onProxyRes(proxyRes) {
            if (proxyRes.headers) {
              delete proxyRes.headers['content-security-policy'];
            }
          },
          /**
           * @param {string} path
           * @param {Request} req
           * @returns {string}
           */
          pathRewrite(path) {
            if (path.startsWith(egenPublicPath)) {
              const matcher = /^.*\/([^\/]*\.(?!html|js)[^.]+)$/i.exec(path);
              if (matcher) {
                return `${egenPublicPath}/${matcher[1]}`;
              }
            }

            return path;
          },
        },
      ],
      static: ['src/assets'],
    },
    watchOptions: {
      ignored: ['.git', 'test-results'],
    },
    mode,
    devtool: isProd ? 'hidden-nosources-source-map' : 'eval-source-map',
    module: {
      rules: [
        {
          test: /egen-esm-styleguide\.css$/,
          use: [
            isProd
              ? { loader: require.resolve(CssExtractRspackPlugin.loader) }
              : { loader: require.resolve('style-loader') },
            { loader: require.resolve('css-loader') },
          ],
        },
        {
          test: /\.css$/,
          exclude: [/egen-esm-styleguide\.css$/],
          use: [
            isProd
              ? { loader: require.resolve(CssExtractRspackPlugin.loader) }
              : { loader: require.resolve('style-loader') },
            { loader: require.resolve('css-loader') },
          ],
        },
        {
          test: /\.(woff|woff2|png)?$/,
          type: 'asset/resource',
        },
        {
          test: /\.(svg|html)$/,
          type: 'asset/source',
        },
        {
          test: /\.(j|t)sx?$/,
          use: [
            {
              loader: 'builtin:swc-loader',
            },
          ],
        },
      ],
    },
    optimization: {
      splitChunks: {
        maxAsyncRequests: Infinity,
        maxInitialRequests: 1,
        cacheGroups: {
          default: {
            minChunks: 1,
            reuseExistingChunk: true,
          },
        },
      },
    },
    resolve: {
      mainFields: ['module', 'main'],
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.css', '.scss'],
      extensionAlias: {
        '.js': ['.ts', '.tsx', '.js'],
      },
      fallback: {
        http: false,
        stream: false,
        https: false,
        zlib: false,
        url: false,
      },
      alias: {
        '@egen-civitas/esm-framework': '@egen-civitas/esm-framework/src/internal',
        'lodash.debounce': 'lodash-es/debounce',
        'lodash.findlast': 'lodash-es/findLast',
        'lodash.isequal': 'lodash-es/isEqual',
        'lodash.omit': 'lodash-es/omit',
        'lodash.throttle': 'lodash-es/throttle',
        // ugly, stupid hack to support dynamic translation resolution here
        '@egen-civitas/esm-translations/translations': resolve(
          dirname(require.resolve('@egen-civitas/esm-translations/package.json')),
          'translations',
        ),
      },
    },
    plugins: [
      egenCleanBeforeBuild && new CleanWebpackPlugin(),
      new HtmlWebpackPlugin({
        inject: false,
        scriptLoading: 'blocking',
        publicPath: egenPublicPath,
        template: resolve(__dirname, 'src/index.ejs'),
        templateParameters: {
          egenApiUrl,
          egenPublicPath,
          egenFavicon,
          egenPageTitle,
          egenDefaultLocale,
          egenImportmapDef,
          egenImportmapUrl,
          egenRoutesDef,
          egenRoutesUrl,
          egenOffline,
          egenEnvironment,
          egenConfigUrls,
          egenCoreImportmap: appPatterns.length > 0 && JSON.stringify(coreImportmap),
          egenCoreRoutes: Object.keys(coreRoutes).length > 0 && JSON.stringify(coreRoutes),
          egenCssFilename,
          egenExtraAssets: egenJsCssAssets.map((fileName) => 'assets/' + basename(fileName)),
          egenTenantConfigDef,
          egenTargetConfigDef,
          egenBootstrap,
          egenCsp: target.csp,
        },
      }),
      target.native && new EmitAssetsPlugin(bootstrapFiles),
      new WebpackPwaManifest({
        name: egenPageTitle,
        short_name: egenPageTitle,
        publicPath: egenPublicPath,
        description: egenPageDescription,
        background_color: '#ffffff',
        theme_color: egenThemeColor,
        icons: [
          {
            src: egenBranding.pwaIconPath,
            sizes: [96, 128, 144, 192, 256, 384, 512],
          },
        ],
      }),
      new CopyRspackPlugin({
        patterns: [
          ...egenBranding.copyPatterns,
          { from: resolve(cssTmpDir, egenCssFilename), to: egenCssFilename },
          ...fontPatterns,
          ...appPatterns,
          ...assetsPatterns,
        ],
      }),
      new ModuleFederationPlugin({
        name,
        shared: sharedDependencies.reduce((obj, depName) => {
          // This just attempts to align the requiredVersion with what we usually have in peerDependencies
          let version = dependencies[depName];

          if (version) {
            if (version.startsWith('^')) {
              version = `${semver.parse(version.slice(1)).major}.x`;
            } else if (version.startsWith('~')) {
              const semVer = semver.parse(version.slice(1));
              version = `${semVer.major}.${semVer.minor}.x`;
            } else if (version === 'workspace:*') {
              version = `${semver.parse(require(`${depName}/package.json`).version).major}.X`;
            }
          }

          if (depName === 'swr') {
            // SWR is annoying with Module Federation
            // See: https://github.com/webpack/webpack/issues/16125 and https://github.com/vercel/swr/issues/2356
            obj['swr/_internal'] = {
              requiredVersion: version,
              strictVersion: false,
              singleton: true,
              import: 'swr/_internal',
              shareKey: 'swr/_internal',
              shareScope: 'default',
              version: require('swr/package.json').version,
            };
          } else {
            obj[depName] = {
              requiredVersion: version ?? false,
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
      isProd &&
        new CssExtractRspackPlugin({
          filename: '[contenthash].css',
          ignoreOrder: true,
        }),
      new DefinePlugin({
        'process.env.BUILD_VERSION': JSON.stringify(`${version}-${timestamp}`),
        'process.env.FRAMEWORK_VERSION': JSON.stringify(frameworkVersion),
        'process.env.NODE_ENV': JSON.stringify(mode),
        'process.env.EGEN_TARGET': JSON.stringify(target.target),
        // Flag de bypass auth pour les tests sans backend. Défaut et
        // hiérarchie de surcharge définis dans .env.defaults — voir
        // resolvePublicEnv() de @egen-civitas/rspack-config, calculé en
        // tête de ce fichier dans `publicEnv`. Le "?? 'false'" est une
        // sécurité si ce fichier de défauts venait à disparaître.
        'process.env.EGEN_DEV_NO_AUTH': JSON.stringify(publicEnv.EGEN_DEV_NO_AUTH ?? 'false'),
      }),
      new BundleAnalyzerPlugin({
        analyzerMode: env?.analyze ? 'static' : 'disabled',
      }),
    ].filter(Boolean),
    ignoreWarnings: [/.*InjectManifest has been called multiple times.*/],
  };
};
