# @egen-civitas/egen

## 2.0.2

### Patch Changes

- 2fe259c: Dépend de @egen-civitas/esm-app-shell ^2.0.1 (shell reconstruit avec esm-framework 1.1.0 contenant TopBar) : le dev server ne sert plus l'ancien shell 2.0.0.
- 821c102: Dépend de `@egen-civitas/rspack-config` ^1.1.0 (règle `*.tw.css` / Tailwind). Avec `^1.0.1`, la CLI pouvait embarquer rspack-config 1.0.1 : les fichiers `*.tw.css` passaient alors par la règle CSS Modules sans PostCSS et Tailwind n'était jamais compilé.

## 2.0.0

### Major Changes

- 25b41d1: change-kim

### Patch Changes

- Updated dependencies [25b41d1]
  - @egen-civitas/esm-app-shell@2.0.0

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
  - @egen-civitas/esm-app-shell@1.0.3
  - @egen-civitas/rspack-config@1.0.1
