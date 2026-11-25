---
'@egen-civitas/esm-embed-protocol': minor
'@egen-civitas/esm-embed-client': minor
'@egen-civitas/esm-embed-host': minor
'@egen-civitas/esm-embed-testing': minor
---

**Changement incompatible : le SDK est recentré sur ce dont le Core est lui-même la source.** Retrait des capacités `session`, `permissions`, `theme` et `api` (identité, droits, thème et appels API viennent de Keycloak, des backends et du service de thèmes ; le Core ne les relaie pas, ce qui supprime une classe entière de failles). Retrait de `pickFields`, des chemins d'API, de `createFetchApiProvider`, des hooks `useEgenSession`/`useEgenTheme`, et de la session dans le pont 1.1. Une demande de capacité retirée est rejetée avec la raison et la voie à suivre (`REMOVED_CAPABILITIES`).

Ajout de la capacité `extensions` (découverte des extensions d'un slot, grants `discover`/`contribute` par slot) et des contributions déclaratives `extensions[]` du manifeste (composants d'une app embarquée injectés dans les slots du Core), avec validation (`iconUrl` même origine, 4 Ko de meta) et `allowedContributions`. Hooks React `useEgenLocale`, `useEgenTenant`, `useEgenExtensions`.
