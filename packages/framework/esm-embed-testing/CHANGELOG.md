# @egen-civitas/esm-embed-testing

## 0.3.0

### Minor Changes

- 36eb684: **Changement incompatible : le SDK est recentré sur ce dont le Core est lui-même la source.** Retrait des capacités `session`, `permissions`, `theme` et `api` (identité, droits, thème et appels API viennent de Keycloak, des backends et du service de thèmes ; le Core ne les relaie pas, ce qui supprime une classe entière de failles). Retrait de `pickFields`, des chemins d'API, de `createFetchApiProvider`, des hooks `useEgenSession`/`useEgenTheme`, et de la session dans le pont 1.1. Une demande de capacité retirée est rejetée avec la raison et la voie à suivre (`REMOVED_CAPABILITIES`).

  Ajout de la capacité `extensions` (découverte des extensions d'un slot, grants `discover`/`contribute` par slot) et des contributions déclaratives `extensions[]` du manifeste (composants d'une app embarquée injectés dans les slots du Core), avec validation (`iconUrl` même origine, 4 Ko de meta) et `allowedContributions`. Hooks React `useEgenLocale`, `useEgenTenant`, `useEgenExtensions`.

### Patch Changes

- Updated dependencies [36eb684]
  - @egen-civitas/esm-embed-protocol@0.3.0
  - @egen-civitas/esm-embed-client@0.2.0
  - @egen-civitas/esm-embed-host@0.3.0

## 0.2.0

### Minor Changes

- 18cec62: Sécurité : `api.fetch` avec `path` est désormais **deny-by-default** (liste `paths` obligatoire dans le grant, normalisation anti-contournement : `..`, `%2e`, `//`…) pour qu'une app embarquée ne puisse pas appeler tout l'API du Core avec la session de l'utilisateur ; `negotiateCapabilities` ignore les entrées malformées ; tests de fuzz déterministes. Outillage : `egen-embed-check` (manifeste, capacités, `frame-ancestors`).

### Patch Changes

- Updated dependencies [18cec62]
  - @egen-civitas/esm-embed-protocol@0.2.0
  - @egen-civitas/esm-embed-host@0.2.0
  - @egen-civitas/esm-embed-client@0.1.1

## 0.1.0

### Minor Changes

- d70760d: Nouveau paquet : hôte de test en mémoire (`createTestHost`), suite de conformité du protocole v2 (`defineConformance`), simulateur de Shell (`egen-embed-sim`).

### Patch Changes

- Updated dependencies [10f0584]
- Updated dependencies [744cd20]
- Updated dependencies [cf9d90d]
  - @egen-civitas/esm-embed-client@0.1.0
  - @egen-civitas/esm-embed-protocol@0.1.0
  - @egen-civitas/esm-embed-host@0.1.0
