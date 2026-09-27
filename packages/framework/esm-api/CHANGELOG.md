# @egen-civitas/esm-api

## 1.1.0

### Minor Changes

- 9eb32b2: Ajoute un système de middleware composable pour `egenFetch`, et une forme
  d'erreur structurée conforme à RFC 9457 (Problem Details) sur
  `EgenFetchError`. Purement additif — aucun comportement existant ne change.

  **Middleware (`composeMiddlewares`)**

  ```ts
  import { egenFetch, composeMiddlewares, createRetryMiddleware } from '@egen-civitas/esm-api';

  const resilientFetch = composeMiddlewares(egenFetch, [createRetryMiddleware()]);
  const response = await resilientFetch('/ws/rest/v1/concept');
  ```

  - `composeMiddlewares(handler, middlewares)` compose une liste de middlewares
    autour d'un handler terminal (typiquement `egenFetch`) en une fonction avec
    la même signature d'appel `(url, init?) => Promise<FetchResponse>`.
  - `createRetryMiddleware(options?)` fournit une politique de nouvelle
    tentative prête à l'emploi (backoff exponentiel + jitter complet), limitée
    par défaut aux méthodes idempotentes (GET/HEAD/PUT/DELETE/OPTIONS) — aucun
    changement de comportement pour les requêtes non éligibles.

  **Erreur structurée (`EgenFetchError.problem`)**

  Quand le backend répond avec un corps JSON de la forme RFC 9457 (un objet
  avec au moins un champ `title` de type chaîne), `EgenFetchError` expose
  désormais ce corps typé sur `err.problem` (avec `type` par défaut à
  `'about:blank'` si absent), en plus de `err.responseBody` qui reste
  inchangé.

## 1.0.2

### Patch Changes

- 8688154: Corrige le bypass d'authentification dev (`EGEN_DEV_NO_AUTH`) et le système
  multi-tenant (`EGEN_TENANT_*`), inertes depuis que `esm-app-shell` est
  consommé comme paquet npm pré-compilé par une app séparée.

  - `esm-api` : `isDevAuthBypassEnabled()` lit désormais `window.egenDevNoAuth`
    (canal runtime) en plus de `process.env.EGEN_DEV_NO_AUTH` (canal
    build-time historique, insuffisant seul pour un paquet déjà compilé).
  - `esm-globals` : déclaration TypeScript de `window.egenDevNoAuth`.
  - `esm-app-shell` : `run.ts` utilise `isDevAuthBypassEnabled()` comme
    source de vérité unique (au lieu d'un second check dupliqué) ; le défaut
    `EGEN_DEV_NO_AUTH` du `DefinePlugin` vient maintenant de
    `resolvePublicEnv()` (voir `rspack-config`) au lieu d'un `|| 'false'`
    codé en dur.
  - `rspack-config` : nouveau fichier `.env.defaults` (valeurs par défaut du
    framework, surchargeables en totalité par le `.env` du consommateur) ;
    `PUBLIC_ENV_PREFIXES` (`EGEN_AI_`, `EGEN_DEV_`, `EGEN_TENANT_`) remplace
    l'ancien `ADDITIONAL_RUNTIME_KEYS` codé en dur sur une seule clé ;
    `resolvePublicEnv()` exportée comme source unique de la hiérarchie
    framework-defaults < .env consommateur < process.env.
  - `egen` : `egen develop` calcule désormais ce pont runtime
    (`RUNTIME_BRIDGED_VARS` — `EGEN_DEV_NO_AUTH` et les 7 variables
    `EGEN_TENANT_*`) et l'injecte dans le `index.html` servi, avant l'appel à
    `initializeSpa()`.

- Updated dependencies [8688154]
  - @egen-civitas/esm-globals@1.0.2
