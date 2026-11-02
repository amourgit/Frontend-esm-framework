# @egen-civitas/esm-offline

## 1.0.3

### Patch Changes

- Updated dependencies [159db44]
  - @egen-civitas/esm-api@2.0.0
  - @egen-civitas/esm-globals@2.0.0
  - @egen-civitas/esm-state@1.0.3

## 1.0.2

### Patch Changes

- bf22033: `uuid` passe en 14 (ESM, types intégrés ; `@types/uuid` retiré). Seul `v4()` est utilisé. `esm-styleguide` importe `uuid` (workspaces2) sans le déclarer : la dépendance est maintenant déclarée.
