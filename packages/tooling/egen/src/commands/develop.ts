import { createRequire } from 'node:module';
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { basename, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { loadMonorepoEnv } from '@egen-civitas/rspack-config';
import { type ImportmapDeclaration, type RoutesDeclaration, logInfo, logWarn, removeTrailingSlash } from '../utils';

/**
 * Variables dev-only qui doivent atteindre @egen-civitas/esm-app-shell au
 * RUNTIME plutôt qu'au build. Nécessaire uniquement parce que ce paquet est
 * PRÉ-COMPILÉ (voir le commentaire détaillé plus bas, à l'endroit où cette
 * liste est consommée) : `egen develop` ne le reconstruit jamais, donc rien
 * de fixé par rspack DefinePlugin au moment du build du framework ne peut
 * plus être changé par le .env du consommateur — seule une valeur posée sur
 * `window` APRÈS coup, au moment où la page est servie, le peut encore.
 *
 * `windowKey` suit la même convention que window.egenTenantMode /
 * window.egenAi* (voir esm-globals/src/types.ts). `envKey` doit rester dans
 * la convention EGEN_DEV_* / EGEN_AI_* (voir PUBLIC_ENV_PREFIXES exporté par
 * @egen-civitas/rspack-config) pour que build-time et runtime restent
 * cohérents sur ce qui est considéré "public".
 *
 * Pour ajouter une nouvelle variable qui a besoin de ce pont : une ligne
 * ici suffit, jamais besoin de toucher au reste du pipeline.
 */
const RUNTIME_BRIDGED_DEV_VARS: ReadonlyArray<{ envKey: string; windowKey: string }> = [
  { envKey: 'EGEN_DEV_NO_AUTH', windowKey: 'egenDevNoAuth' },
];

export interface DevelopArgs {
  port: number;
  host: string;
  backend: string;
  open: boolean;
  importmap: ImportmapDeclaration;
  routes: RoutesDeclaration;
  watchedRoutesPaths: Record<string, string>;
  spaPath: string;
  apiUrl: string;
  configUrls: Array<string>;
  configFiles: Array<string>;
  addCookie: string;
  supportOffline: boolean;
}

export async function runDevelop(args: DevelopArgs, signal?: AbortSignal) {
  const {
    backend,
    host,
    port,
    open,
    importmap,
    routes,
    watchedRoutesPaths,
    configUrls,
    configFiles,
    addCookie,
    supportOffline,
  } = args;
  const apiUrl = removeTrailingSlash(args.apiUrl);
  const spaPath = removeTrailingSlash(args.spaPath);
  const app = express();

  const localConfigUrlPrefix = '__local_config__';
  const localConfigUrls = configFiles.map((path) => `${spaPath}/${localConfigUrlPrefix}/${basename(path)}`);

  const require = createRequire(import.meta.url);
  const source = resolve(require.resolve('@egen-civitas/esm-app-shell/package.json'), '..', 'dist');
  const index = resolve(source, 'index.html');

  // @egen-civitas/esm-app-shell est un paquet npm PRÉ-COMPILÉ : son bundle a
  // déjà été construit (et process.env.EGEN_DEV_NO_AUTH/EGEN_AI_*/etc. figés
  // par rspack DefinePlugin) au moment du build du repo framework, bien
  // avant que `egen develop` ne tourne ici avec le .env de l'app
  // consommatrice. Un DefinePlugin ne peut plus aider — il faudrait rebuild
  // le shell à chaque session de dev de l'app consommatrice, ce qui n'arrive
  // jamais : `egen develop` se contente de le SERVIR tel quel
  // (express.static ci-dessous), jamais de le recompiler. Seule une valeur
  // posée sur `window` APRÈS le build, au moment où la page est réellement
  // servie, peut donc encore traverser cette frontière — voir
  // RUNTIME_BRIDGED_DEV_VARS en tête de fichier pour la liste des variables
  // concernées et isDevAuthBypassEnabled() dans
  // @egen-civitas/esm-api/src/dev-auth-bypass.ts pour un exemple de lecture
  // côté framework. Priorité : process.env (déjà positionné avant `yarn
  // start`, ex. CI) > fichiers .env* de la racine du monorepo consommateur.
  const monorepoEnv = loadMonorepoEnv(process.cwd(), 'development');
  const runtimeWindowOverrides: Record<string, boolean> = {};
  for (const { envKey, windowKey } of RUNTIME_BRIDGED_DEV_VARS) {
    const raw = process.env[envKey] ?? monorepoEnv[envKey];
    if (raw !== undefined) {
      runtimeWindowOverrides[windowKey] = raw === 'true';
    }
  }

  if (runtimeWindowOverrides.egenDevNoAuth) {
    logInfo('EGEN_DEV_NO_AUTH=true — bypass d\'authentification actif (session admin fictive, sans backend).');
  }

  const indexContent = readFileSync(index, 'utf8')
    .replace(
      /<script>initializeSpa\([\s\S\n]*<\/script>/m,
      `<script>
      Object.assign(window, ${JSON.stringify(runtimeWindowOverrides)});
      initializeSpa({
        apiUrl: ${JSON.stringify(apiUrl)},
        spaPath: ${JSON.stringify(spaPath)},
        env: "development",
        offline: ${supportOffline},
        configUrls: ${JSON.stringify([...configUrls, ...localConfigUrls])},
      });
    </script>
  `,
    )
    .replace(/href="\/egen\/spa/g, `href="${spaPath}`)
    .replace(/src="\/egen\/spa/g, `src="${spaPath}`)
    .replace(/https:\/\/dev3\.egen\.org\/egen\/spa\/importmap\.json/g, `${spaPath}/importmap.json`);

  const swContent = supportOffline
    ? readFileSync(resolve(source, 'service-worker.js'), 'utf-8').replace(
        /https:\/\/dev3\.egen\.org\/egen\/spa\//g,
        `${spaPath}`,
      )
    : '';

  const pageUrl = `http://${host}:${port}${spaPath}`;

  // Set up routes. Note that different middlewares have different rules
  // about route precedence.
  //
  // HPM/createProxyMiddleware always takes top precedence, so we must
  // explicitly exclude routes that we want to use other handlers for.
  //
  // express.static respects normal route declaration order.

  // Route for custom `importmap.json` goes above static assets
  if (importmap.type === 'inline') {
    app.get(`${spaPath}/importmap.json`, (_, res) => {
      res.contentType('application/json').send(importmap.value);
    });
  }

  if (routes.type === 'inline') {
    let stringifiedRoutes = routes.value;
    if (watchedRoutesPaths && !!Object.keys(watchedRoutesPaths).length) {
      // watchedRoutesPath is keyed from package to path, but here we need to go from
      // path to package.
      const watchedRoutesByPath = Object.fromEntries(Object.entries(watchedRoutesPaths).map(([k, v]) => [v, k]));

      logInfo(`Watching routes.json for ${Object.keys(watchedRoutesPaths).join(', ')}`);
      // setup watchers for all the discovered routes.json files which update the in-memory map
      (await import('node-watch')).default(Object.keys(watchedRoutesByPath), { delay: 0 }, async (event, name) => {
        if (event === 'update') {
          const updatedApp = watchedRoutesByPath[name];
          if (updatedApp) {
            const jsonRoutes = JSON.parse(stringifiedRoutes);
            const version = jsonRoutes[updatedApp]?.version;
            jsonRoutes[updatedApp] = {
              ...JSON.parse(await readFile(name, 'utf8')),
              version,
            };
            stringifiedRoutes = JSON.stringify(jsonRoutes);
            logInfo(`Updated routes for ${updatedApp}`);
          }
        }
      });
    }

    app.get(`${spaPath}/routes.registry.json`, (_, res) => {
      res.contentType('application/json').send(stringifiedRoutes);
    });
  }

  // Route for custom `service-worker.js` before most things
  if (supportOffline) {
    app.get(`${spaPath}/service-worker.js`, (_, res) => {
      res.contentType('js').send(swContent);
    });
  }

  configFiles.forEach((file, i) => {
    const url = localConfigUrls[i];
    app.get(url, (_, res) => {
      res.contentType('application/json').send(readFileSync(resolve(process.cwd(), file)));
    });
  });

  // Escape the spaPath so it can be safely used in a regex
  const escapedSpaPath = spaPath.replace(/[|\\{}()[\]^$+*?.]/g, String.raw`\$&`).replace(/-/g, String.raw`\x2d`);

  // Return our custom `index.html` for all requests beginning with spaPath
  // and not ending in `.js`, `.woff`, `.woff2`, `.json`, or any two- or three-character
  // extension.
  const indexHtmlPathMatcher = new RegExp(String.raw`${escapedSpaPath}\/(?!.*\.(js|woff2?|json|.{2,3}$)).*$`);

  // Route for custom `index.html` goes above static assets
  app.get(indexHtmlPathMatcher, (_, res) => res.contentType('text/html').send(indexContent));

  // Return static assets for any request for which we have one, except importmap.json and index.html
  app.use(spaPath, express.static(source, { index: false }));

  // Proxy requests beginning with `apiUrl` but which should not serve `index.html`.
  // This may include the JS bundles when using an import map that refers to
  // JS bundles located at the same domain as `apiUrl`.
  app.use(
    apiUrl,
    createProxyMiddleware(
      (path) => {
        return new RegExp(`${apiUrl}/.*`).test(path) && !indexHtmlPathMatcher.test(path);
      },
      {
        target: backend,
        changeOrigin: true,
        onProxyReq(proxyReq) {
          if (addCookie) {
            const origCookie = proxyReq.getHeader('cookie');
            const newCookie = `${origCookie};${addCookie}`;
            proxyReq.setHeader('cookie', newCookie);
          }
        },
      },
    ),
  );

  const server = app.listen(port, host, () => {
    logInfo(`Listening at http://${host}:${port}`);
    logInfo(`SPA available at ${pageUrl}`);

    if (open) {
      import('open').then(({ default: open }) => {
        setTimeout(
          () =>
            open(pageUrl, { wait: false }).catch(() => {
              logWarn(
                `Unable to open "${pageUrl}" in browser. If you are running in a headless environment, please do not use the --open flag.`,
              );
            }),
          2000,
        );
      });
    }
  });

  signal?.addEventListener('abort', () => server.close());

  // Keep the promise pending so the runner process doesn't exit
  return new Promise<void>(() => {});
}
