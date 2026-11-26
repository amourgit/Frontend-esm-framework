# @egen-civitas/egen

## 3.0.1

### Patch Changes

- Updated dependencies [b2d283e]
  - @egen-civitas/esm-app-shell@4.0.0
  - @egen-civitas/rspack-config@3.0.0

## 3.0.0

### Major Changes

- aa66db3: **Retrait complet de Carbon et de SCSS.** Tailwind v4 est le seul système de style ; les composants de base sont les nôtres (`esm-styleguide/src/ui`, copiés de shadcn/ui et Radix, MIT).

  - `@egen-civitas/esm-styleguide` : plus de `@carbon/react`, `@carbon/charts` ni `sass`. Nouveaux composants exportés : `Button`, `IconButton`, `Link`, `Badge`, `Separator`, `Label`, `Input`, `TextInput`, `Switch`, `Spinner`, `InlineLoading`, `Layer`, `Tooltip`, `Tile*`, `Alert*`, `NotificationBanner`, `Dialog*`, `DropdownMenu*`, `Tabs*`, `Table*`, `ModalHeader` / `ModalBody` / `ModalFooter`, `AppHeader*`. `cn` utilise désormais `tailwind-merge`. Le type `CarbonTagColor` devient `TagColor` (et `carbonTagColors` → `tagColors`). Les composants du framework qui reposaient sur Carbon (modales, notifications, snackbars, tags, pagination, menu déroulant, barre d'actions par lots, sélecteur de dates, fenêtres d'espace de travail) sont réécrits sans lui.
  - Feuille globale : `@egen-civitas/esm-styleguide/styles` pointe sur un **fichier CSS standard** (`dist/styles.css`) ; l'export SCSS `./src/vars` et tous les partiels `.scss` disparaissent. Les modules `*.module.scss` sont devenus `*.module.css` (mêmes noms de classes). Les jetons `--cds-*` sont renommés `--ui-*`.
  - `@egen-civitas/rspack-config`, `@egen-civitas/webpack-config` : plus de règle `sass-loader`, `scssRuleConfig` supprimé, `.scss` retiré des extensions résolues.
  - `@egen-civitas/esm-app-shell` : la feuille globale est lue telle quelle (plus de compilation Sass) ; `@carbon/react` n'est plus une dépendance partagée ; la page d'erreur et le fil d'Ariane n'utilisent plus de classes Carbon.
  - `@egen-civitas/tailwind-preset` : importe `tw-animate-css` (animations des composants).
  - `@egen-civitas/esm-ai-tools` : l'identité des composants vient du `data-slot` des composants EGEN (`source: 'slot'`, champ `slot`) à la place du bloc Carbon (`source: 'carbon'`, champ `carbon`) ; `theme.carbonTheme` est supprimé.
  - `@egen-civitas/egen` : les dépendances `sass*` ne sont plus fournies.

  Guide de migration : `docs/MIGRATION-CARBON.md`.

### Patch Changes

- Updated dependencies [aa66db3]
  - @egen-civitas/esm-app-shell@3.0.0
  - @egen-civitas/rspack-config@2.0.0
  - @egen-civitas/webpack-config@2.0.0

## 2.3.0

### Minor Changes

- 669cbd6: Réforme multiplateforme, lot P0 (docs/EGEN-FRAMEWORK-DEV.md) :

  - esm-globals : `EgenTarget`, `CapabilityName`, `getEgenTarget()`, `isNativeTarget()`.
  - esm-platform (nouveau package, 1.0.0) : contrats des capacités (annexe 2), `PlatformError`, détection de la cible, `getPlatform()` (adaptateur Web : session vide, `openExternal`, `lifecycle`, `files.select`, `camera`, `permissions` ; jamais de faux coffre ni de biométrie simulée. En natif, aucune capacité tant que le client de pont n'est pas branché, `ready` rejette `INCOMPATIBLE` sans Host), `createMockPlatform` (sous-chemin `/testing`).
  - esm-framework : ré-export de `@egen-civitas/esm-platform` (`index`, `internal`, mocks).
  - egen (CLI) : option `build --platform web|android|ios`.
  - esm-api : `setAuthorizationProvider` (jeton fourni par la plateforme, rafraîchissement unique sur 401, rejeu GET/HEAD, politique `credentials`) ; `FetchConfig.replayOnUnauthorized` ; `isDevAuthBypassEnabled()` inerte en natif. Sans fournisseur, comportement inchangé.
  - esm-dynamic-loading : overrides d'import map et de route map désactivés en cible native.

### Patch Changes

- Updated dependencies [d1d2d7d]
- Updated dependencies [b3d9419]
- Updated dependencies [ef3c97f]
- Updated dependencies [478e80c]
  - @egen-civitas/esm-app-shell@2.9.0

## 2.2.0

### Minor Changes

- 33f2197: Support de `EGEN_BRAND_DIR` (variable d'environnement ou `.env*` du monorepo consommateur) : `egen develop` sert ce dossier avant le `dist` pré-compilé de l'app-shell, et `egen build` le transmet au shell avec un chemin absolu (le build s'exécute depuis `node_modules`, où un chemin relatif ne désignerait plus rien). Le projet client peut ainsi fournir son favicon et son icône PWA sans qu'aucune identité visuelle ne soit embarquée dans le framework. Un chemin invalide est ignoré avec un avertissement.

### Patch Changes

- Updated dependencies [33f2197]
  - @egen-civitas/esm-app-shell@2.7.0

## 2.1.1

### Patch Changes

- e8ccb0f: Hub de logs : niveaux plus justes (pluriels « errors/warnings », succès resserré, stderr sans indice = info), lignes de suite d'un bloc d'erreur/avertissement héritant du niveau, retours chariot (barres de progression) réduits à leur dernier état, couleurs ANSI conservées chez les processus fils, ids croissants entre redémarrages (reprise SSE fiable).
- @egen-civitas/esm-app-shell@2.6.2

## 2.1.0

### Minor Changes

- ac88343: `egen develop` : hub de logs du terminal. Toute la sortie (processus principal, serveur de dev de chaque app, processus `develop`) est structurée (source, niveau, horodatage, ANSI conservé) et diffusée en temps réel (SSE) sur `<spaPath>/__egen_logs__/stream` (+ `/history`, `/health`), exposée au navigateur via `window.egenLogsUrl`. Écoute locale uniquement (127.0.0.1), absente en production.

### Patch Changes

- Updated dependencies [0978f93]
  - @egen-civitas/esm-app-shell@2.6.1

## 2.0.5

### Patch Changes

- bf22033: `ejs` passe en 6.0.1 (dépendance non importée par le code d'egen : le gabarit `index.ejs` de l'app-shell est traité par le plugin HTML du bundler).

## 2.0.4

### Patch Changes

- ee309f3: `egen develop` : une app lancée localement n'est plus réécrite comme si elle était servie par le backend. Le premier serveur de dev d'app reçoit le port 8082, qui est aussi le backend par défaut (`--backend http://localhost:8082`) : `proxyImportmapAndRoutes` réécrivait alors son URL en chemin relatif (`.//egen-esm-xxx.js`), le shell la demandait au serveur du shell qui répondait une page 404 HTML, et l'app mourait avec « The global variable … does not refer to a federated module ». `proxyImportmapAndRoutes` accepte désormais `localImportKeys` (les apps lancées par `runProject`) et ne les réécrit jamais.

## 2.0.3

### Patch Changes

- f2b6ad6: `egen develop` n'alloue plus jamais à un serveur de dev d'app le port du backend : `getAvailablePort` accepte une liste de ports réservés (`reservedPorts`) transmise par `runProject`.

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
