---
'@egen-civitas/esm-styleguide': minor
'@egen-civitas/esm-app-shell': patch
---

`SectionSlot` : une page expose un slot d'extensions (`<SectionSlot name="home-sections" />`) et chaque app y branche sa propre `Section` depuis son `routes.json`. Les en-têtes de section sont **collants** : l'en-tête reste en haut de la zone de défilement tant que le corps de sa section est visible, puis la section suivante prend le relais. Le mode passe par des variables CSS héritées (`--section-header-position`, `--section-sticky-top`, `--section-sticky-z`, `--section-sticky-bg`), donc il traverse les parcels single-spa sans contexte React partagé.

`Section` gagne `stickyHeader`, `stickyOffset` et `stickyZIndex` (hérités du `SectionSlot` quand absents ; `stickyHeader={false}` pour s'en exempter). Nouveaux exports : `SectionSlot`, `SectionCard`, `SectionCardTitleButton`, `SECTION_CARD_CLASS`, `stickyStyleVars`, `STICKY_VARS`. Le shell est republié pour embarquer cette version du styleguide.
