---
'@egen-civitas/esm-framework': patch
'@egen-civitas/esm-app-shell': patch
---

Relève les plages de dépendances pour embarquer `esm-extensions` 1.1.0 (`NavEntryMeta`, `TOPBAR_LEVEL2_NAV_SLOT`, `isNavEntryMeta`) et `esm-styleguide` 1.7.0 (grille du shell sans colonne `leftNav`). Sans cela, `esm-framework` 1.1.2 continuait de résoudre `esm-extensions` 1.0.2 et n'exposait pas les nouveaux exports.
