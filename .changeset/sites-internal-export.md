---
'@egen-civitas/esm-styleguide': patch
---

Exporte la catégorie `sites` depuis le point d'entrée `internal` (celui du `.` du package, donc de `@egen-civitas/esm-framework`) : elle n'était exposée que par `public`, les apps ne la voyaient pas.
