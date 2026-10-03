# @egen-civitas/esm-translations

## 1.0.1

### Patch Changes

- d69a61c: Les fichiers `mock.ts` / `mock-jest.ts` de ces paquets importent `./src/...`, mais `src` n'était pas publié sur npm : tout test consommateur qui utilisait `@egen-civitas/esm-framework/mock` échouait avec « Failed to resolve import ./src/index ». `src` est désormais publié (sans les fichiers `*.test.*`). `esm-api` : les mocks exportent aussi `isDevAuthBypassEnabled` et `applyDevAuthBypassForLogin` (désactivés par défaut), absents jusqu'ici alors qu'ils font partie de l'API publique.
