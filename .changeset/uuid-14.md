---
'@egen-civitas/esm-offline': patch
'@egen-civitas/esm-styleguide': patch
---

`uuid` passe en 14 (ESM, types intégrés ; `@types/uuid` retiré). Seul `v4()` est utilisé. `esm-styleguide` importe `uuid` (workspaces2) sans le déclarer : la dépendance est maintenant déclarée.
