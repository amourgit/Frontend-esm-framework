---
'@egen-civitas/esm-extensions': minor
'@egen-civitas/esm-styleguide': minor
---

Navigation de niveau 2 pilotée par les apps : nouveau type partagé `NavEntryMeta`, constante `TOPBAR_LEVEL2_NAV_SLOT` (`topbar-level2-nav`) et validateur `isNavEntryMeta` dans `esm-extensions`. La colonne de navigation latérale globale (`leftNav`) est retirée de la grille du shell : seuls la TopBar et le footer sont globaux ; une app qui veut une sidebar la fournit dans son propre contenu.
