---
'@egen-civitas/esm-app-shell': patch
---

Rebuild du shell avec `@egen-civitas/esm-styleguide` 2.1 : le framework fourni aux apps expose désormais `ToolWindowHeader` (le 2.6.2 avait été compilé avec le styleguide 2.0, sans lui, ce qui faisait planter les apps qui l'importent — React #130).
