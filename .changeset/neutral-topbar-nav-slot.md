---
"@egen-civitas/esm-extensions": minor
"@egen-civitas/esm-framework": minor
"@egen-civitas/esm-styleguide": minor
---

Slot de navigation de la TopBar sans numéro de niveau : nouvelle constante `TOPBAR_NAV_SLOT` (`topbar-nav-slot`) et `TOPBAR_NAV_SLOTS` (tous les noms à lire, officiel d'abord). `TOPBAR_LEVEL2_NAV_SLOT` (`topbar-level2-nav`) est conservée, marquée `@deprecated`, et reste honorée : `SectionNavPanel` lit les deux slots (sans doublon). Les apps migrent leur `routes.json` vers le nouveau nom quand elles veulent ; aucune rupture.
