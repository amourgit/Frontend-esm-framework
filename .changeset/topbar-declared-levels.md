---
'@egen-civitas/esm-extensions': minor
'@egen-civitas/esm-styleguide': minor
'@egen-civitas/esm-framework': minor
'@egen-civitas/esm-app-shell': patch
---

Conformité à la TopBar neutre du core (niveaux déclarés par les apps).

- `esm-extensions` : nouveau `TOPBAR_SLOT` (`topbar-slot`, seul slot d'extension de la TopBar) et types `TopBarPlacementMeta` / `TopBarRegion` / `TopBarContentRegion` pour la déclaration `meta.topbar` (niveau, rang, région, ordre, before/after). Retrait de `TOPBAR_LEVEL2_NAV_SLOT` et `TOPBAR_NAV_SLOTS` : le slot de navigation est uniquement `TOPBAR_NAV_SLOT` (`topbar-nav-slot`).
- `esm-styleguide` : `SectionNavPanel` ne lit plus l'ancien slot `topbar-level2-nav`.
- `esm-framework` : mocks alignés. `esm-app-shell` : documentation du layout-sync sans notion de niveau figé.
