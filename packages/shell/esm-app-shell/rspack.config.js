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

// Load .env from the monorepo root (two levels up from packages/shell/esm-app-shell)
try {
  require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });
} catch (e) {
  // dotenv not installed, skip — env vars must be set via OS/CI environment
}


const { mkdirSync, readdirSync, statSync, readFileSync, writeFileSync } = require('node:fs');
const sass = require('sass-embedded');
const semver = require('semver');
const { removeTrailingSlash, getTimestamp } = require('./tools/helpers');

const { name, version, dependencies } = require('./package.json');
const sharedDependencies = require('./dependencies.json');
const frameworkVersion = require('@egen/esm-framework/package.json').version;

const timestamp = getTimestamp();
const production = 'production';
const allowedSuffixes = ['-app', '-widgets'];
const { ModuleFederationPlugin } = container;

const egenAddCookie = process.env.EGEN_ADD_COOKIE;
const egenApiUrl = removeTrailingSlash(process.env.EGEN_API_URL || '/egen');
const egenPublicPath = removeTrailingSlash(process.env.EGEN_PUBLIC_PATH || '/egen/spa');
// Default proxy target is localhost. Set EGEN_PROXY_TARGET in .env to point to your EGEN backend.
const egenProxyTarget = process.env.EGEN_PROXY_TARGET || 'http://localhost:8081/';
const egenPageTitle = process.env.EGEN_PAGE_TITLE || 'Egen';
const egenFavicon = process.env.EGEN_FAVICON || `${egenPublicPath}/favicon.ico`;

/**
 * Pont EGEN_AI_* (process.env, coté build Node) → window.egenAi* (runtime navigateur).
 *
 * Nécessaire car le bundle shell est construit avec rspack/webpack : il n'y a
 * pas d'`import.meta.env` (spécifique à Vite) dans le bundle produit, et
 * `process.env[key]` en accès dynamique (voir `esm-ai-config/src/defaults.ts`)
 * n'est de toute façon pas remplaçable par un `DefinePlugin` (qui ne fait que
 * du remplacement textuel statique). Sans ce pont, tout `.env` EGEN_AI_* est
 * silencieusement ignoré dans le navigateur — seul `window.egenAi*` fonctionne.
 *
 * La transformation de nom DOIT rester strictement identique à celle de
 * `readEnv()` dans `esm-ai-config/src/defaults.ts` : "EGEN_AI_MAX_TOKENS" →
 * "egenAiMAXTOKENS" (les mots ne sont pas mis en camelCase, seuls les
 * underscores sont supprimés — comportement hérité, pas idéal mais il faut
 * rester cohérent des deux côtés).
 */
const EGEN_AI_ENV_KEYS = [
  'EGEN_AI_ENABLED',
  'EGEN_AI_PROVIDER',
  'EGEN_AI_MODEL',
  'EGEN_AI_TEMPERATURE',
  'EGEN_AI_TOP_P',
  'EGEN_AI_TOP_K',
  'EGEN_AI_MAX_TOKENS',
  'EGEN_AI_STREAM',
  'EGEN_AI_API_KEY',
  'EGEN_AI_API_ENDPOINT',
  'EGEN_AI_BACKEND_URL',
  'EGEN_AI_CHAT_ENDPOINT',
  'EGEN_AI_STREAM_ENDPOINT',
  'EGEN_AI_REQUEST_TIMEOUT',
  'EGEN_AI_MAX_RETRIES',
  'EGEN_AI_RETRY_DELAY',
  'EGEN_AI_CONTEXT_MAX_SIZE',
  'EGEN_AI_CONTEXT_EXTENSIONS',
  'EGEN_AI_CONTEXT_NAVIGATION',
  'EGEN_AI_CONTEXT_CONFIG',
  'EGEN_AI_CONTEXT_FLAGS',
  'EGEN_AI_CONTEXT_DEPTH',
  'EGEN_AI_MEMORY_ENABLED',
  'EGEN_AI_MEMORY_MAX_MESSAGES',
  'EGEN_AI_MEMORY_KEY',
  'EGEN_AI_MEMORY_PERSIST',
  'EGEN_AI_REQUIRED_PRIVILEGES',
  'EGEN_AI_VALIDATE_TOOLS',
  'EGEN_AI_TOOL_TIMEOUT',
  'EGEN_AI_AUDIT_LOG',
  'EGEN_AI_DEBUG',
  'EGEN_AI_EVENTS_ENABLED',
  'EGEN_AI_ANALYTICS_ENABLED',
  'EGEN_AI_LOG_LEVEL',
];

function egenAiWindowKey(envKey) {
  return `egenAi${envKey.replace(/^EGEN_AI_/, '').replace(/_([A-Z])/g, (_, l) => l.toUpperCase())}`;
}

const egenAiWindowOverrides = EGEN_AI_ENV_KEYS.reduce((acc, key) => {
  if (process.env[key] !== undefined) {
    acc[egenAiWindowKey(key)] = process.env[key];
  }
  return acc;
}, {});
const egenAiConfigDef = Object.keys(egenAiWindowOverrides).length > 0 ? JSON.stringify(egenAiWindowOverrides) : null;

/**
 * Pont EGEN_TENANT_* (process.env, coté build Node) → window.egenTenant*
 * (runtime navigateur). Même raison d'être que le pont EGEN_AI_* ci-dessus —
 * voir @egen/esm-tenant/src/config/env.ts pour le détail complet et le
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
 * tenant côté frontend (voir @egen/esm-tenant/src/types.ts).
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
const egenOffline = process.env.EGEN_OFFLINE === 'enable';
const egenDefaultLocale = process.env.EGEN_ESM_DEFAULT_LOCALE || 'en';
const egenImportmapDef = process.env.EGEN_ESM_IMPORTMAP;
const egenImportmapUrl = process.env.EGEN_ESM_IMPORTMAP_URL || `${egenPublicPath}/importmap.json`;
const egenRoutesDef = process.env.EGEN_ROUTES;
const egenRoutesUrl = process.env.EGEN_ROUTES_URL || `${egenPublicPath}/routes.registry.json`;
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

  // Compile the styleguide SCSS to CSS outside of rspack so it's a pure static file
  // with no JS involvement. The result is content-hashed for long-term caching.
  // Sass preserves @import of .css files as plain CSS @import rules rather than
  // inlining them, so we strip those out and prepend the actual file contents.
  const sassOutput = sass.compile(require.resolve('@egen/esm-styleguide/styles'), {
    style: isProd ? 'compressed' : 'expanded',
    quietDeps: true,
    loadPaths: [resolve(__dirname, '..', '..', '..', 'node_modules')],
  }).css;

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

  // ── Thème EGEN : source UNIQUE de vérité ──────────────────────────────────
  // Les fichiers JSON de thème vivent exclusivement dans le package
  // @egen/esm-theme (packages/framework/esm-theme/src/themes/). Le shell ne
  // possède PAS sa propre copie : il la copie/sert depuis cette unique
  // source, pour qu'il soit structurellement impossible que le shell serve
  // une version périmée pendant qu'un⋅e développeur⋅se édite « le » JSON de
  // thème (cf. incident : les deux fichiers avaient divergé silencieusement,
  // le shell servant une valeur différente de celle éditée).
  const themeSourceDir = resolve(__dirname, '../../framework/esm-theme/src/themes');

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
      static: [
        'src/assets',
        // Sert le JSON de thème canonique directement depuis le package
        // @egen/esm-theme en dev — édition sur disque reflétée immédiatement
        // (le fichier est lu depuis le disque à chaque requête HTTP, aucun
        // rebuild requis) et reprise par le polling client (cf. run.ts /
        // ThemeEngine.pollIntervalMs) pour le hot-reload visuel.
        { directory: themeSourceDir, publicPath: `${egenPublicPath}/themes` },
      ],
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
          test: /\.s[ac]ss$/,
          use: [
            isProd
              ? { loader: require.resolve(CssExtractRspackPlugin.loader) }
              : { loader: require.resolve('style-loader') },
            { loader: require.resolve('css-loader') },
            {
              loader: require.resolve('sass-loader'),
              options: { sassOptions: { quietDeps: true } },
            },
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
      fallback: {
        http: false,
        stream: false,
        https: false,
        zlib: false,
        url: false,
      },
      alias: {
        '@egen/esm-framework': '@egen/esm-framework/src/internal',
        'lodash.debounce': 'lodash-es/debounce',
        'lodash.findlast': 'lodash-es/findLast',
        'lodash.isequal': 'lodash-es/isEqual',
        'lodash.omit': 'lodash-es/omit',
        'lodash.throttle': 'lodash-es/throttle',
        // ugly, stupid hack to support dynamic translation resolution here
        '@egen/esm-translations/translations': resolve(
          dirname(require.resolve('@egen/esm-translations/package.json')),
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
          egenAiConfigDef,
          egenTenantConfigDef,
        },
      }),
      new WebpackPwaManifest({
        name: egenPageTitle,
        short_name: egenPageTitle,
        publicPath: egenPublicPath,
        description: 'Open source Health IT by and for the entire planet, starting with the developing world.',
        background_color: '#ffffff',
        theme_color: '#005d5d',
        icons: [
          {
            src: resolve(__dirname, 'src/assets/logo-512.png'),
            sizes: [96, 128, 144, 192, 256, 384, 512],
          },
        ],
      }),
      new CopyRspackPlugin({
        patterns: [
          { from: resolve(__dirname, 'src/assets') },
          { from: resolve(cssTmpDir, egenCssFilename), to: egenCssFilename },
          { from: themeSourceDir, to: 'themes' },
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
        // Flag de bypass auth pour les tests sans backend.
        // Positionner EGEN_DEV_NO_AUTH=true dans le .env pour désactiver le login.
        'process.env.EGEN_DEV_NO_AUTH': JSON.stringify(process.env.EGEN_DEV_NO_AUTH || 'false'),
      }),
      new BundleAnalyzerPlugin({
        analyzerMode: env?.analyze ? 'static' : 'disabled',
      }),
    ].filter(Boolean),
    ignoreWarnings: [/.*InjectManifest has been called multiple times.*/],
  };
};
