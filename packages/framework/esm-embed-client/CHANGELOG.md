# @egen-civitas/esm-embed-client

## 0.2.0

### Minor Changes

- 36eb684: **Changement incompatible : le SDK est recentré sur ce dont le Core est lui-même la source.** Retrait des capacités `session`, `permissions`, `theme` et `api` (identité, droits, thème et appels API viennent de Keycloak, des backends et du service de thèmes ; le Core ne les relaie pas, ce qui supprime une classe entière de failles). Retrait de `pickFields`, des chemins d'API, de `createFetchApiProvider`, des hooks `useEgenSession`/`useEgenTheme`, et de la session dans le pont 1.1. Une demande de capacité retirée est rejetée avec la raison et la voie à suivre (`REMOVED_CAPABILITIES`).

  Ajout de la capacité `extensions` (découverte des extensions d'un slot, grants `discover`/`contribute` par slot) et des contributions déclaratives `extensions[]` du manifeste (composants d'une app embarquée injectés dans les slots du Core), avec validation (`iconUrl` même origine, 4 Ko de meta) et `allowedContributions`. Hooks React `useEgenLocale`, `useEgenTenant`, `useEgenExtensions`.

### Patch Changes

- Updated dependencies [36eb684]
  - @egen-civitas/esm-embed-protocol@0.3.0

## 0.1.1

### Patch Changes

- Updated dependencies [18cec62]
  - @egen-civitas/esm-embed-protocol@0.2.0

## 0.1.0

### Minor Changes

- 10f0584: Nouveau SDK `esm-embed-client` (connexion v2, 15 façades de capacités, mode autonome, liaison React). Protocole : message `probe` de poignée de main et `wrapHandshake`.

### Patch Changes

- Updated dependencies [10f0584]
- Updated dependencies [744cd20]
- Updated dependencies [cf9d90d]
  - @egen-civitas/esm-embed-protocol@0.1.0
