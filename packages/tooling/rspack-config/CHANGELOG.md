# @egen-civitas/rspack-config

## 2.0.0

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

## 1.2.0

### Minor Changes

- cc6cd1a: Compatibilité vérifiable entre apps et framework (F4) : `routes.json` est estampillé avec `frameworkRange` (peerDependency valide sur `esm-framework`) ; `registerApp` écarte au démarrage, en le journalisant, une app dont la plage n'est pas satisfaite par le framework du shell. `esm-globals` : type `BuildManifest` et `validateBuildManifest()`. Une app sans `frameworkRange` (ancien format) reste acceptée.

## 1.1.0

### Minor Changes

- 12a0ba3: Ajoute une règle rspack dédiée aux fichiers `*.tw.css` (Tailwind v4 + PostCSS), strictement séparée de la règle `.css`/`.scss` existante afin de ne jamais scoper (hasher) les classes utilitaires Tailwind ni affecter les imports CSS Modules déjà en place dans les apps consommatrices. Nouveau point d'extension exporté : `tailwindRuleConfig`. Nouvelles dépendances directes de ce package : `tailwindcss`, `@tailwindcss/postcss`, `postcss`, `postcss-loader`.

## 1.0.1

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
