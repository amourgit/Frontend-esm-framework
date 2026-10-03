# @egen-civitas/esm-framework

## 1.1.4

### Patch Changes

- b49f9e8: Suppression définitive de la barre latérale globale : le conteneur `#egen-left-nav-container` est retiré du shell (il n'était plus que masqué) ainsi que ses règles CSS. `LeftNavMenu`, `useLeftNav`, `setLeftNav` et `unsetLeftNav` sont marqués `@deprecated` : la navigation de niveau 2 est portée par la TopBar (slot `topbar-level2-nav`) ; une app qui veut une navigation interne affiche sa propre barre latérale.
- Updated dependencies [b49f9e8]
  - @egen-civitas/esm-styleguide@1.8.0
  - @egen-civitas/esm-react-utils@1.0.5
  - @egen-civitas/esm-extensions@1.1.1

## 1.1.3

### Patch Changes

- 6cac063: Relève les plages de dépendances pour embarquer `esm-extensions` 1.1.0 (`NavEntryMeta`, `TOPBAR_LEVEL2_NAV_SLOT`, `isNavEntryMeta`) et `esm-styleguide` 1.7.0 (grille du shell sans colonne `leftNav`). Sans cela, `esm-framework` 1.1.2 continuait de résoudre `esm-extensions` 1.0.2 et n'exposait pas les nouveaux exports.

## 1.1.2

### Patch Changes

- 7e1c686: Ajout du module `filters` au styleguide, porté de Civitas---GED : `FilterBar` (barre de filtres pilotée par schéma JSON, avec `useFilterSchema`, `matchesFilters`, `evaluateFilter`, `buildFilterFields`, `DEFAULT_OPERATORS`…) et `DocumentToolbar` (catégories, tri, mode d'affichage). Ajoute la dépendance `lucide-react` au styleguide. Le shell et `esm-framework` sont republiés pour que le singleton partagé embarque ces exports.
- Updated dependencies [15bfdee]
- Updated dependencies [7e1c686]
- Updated dependencies [5a84ebe]
- Updated dependencies [befb7ba]
  - @egen-civitas/esm-styleguide@1.6.0

## 1.1.1

### Patch Changes

- 956fcef: Rebuild du shell avec esm-styleguide 1.5.x : le singleton `@egen-civitas/esm-framework` partagé (Module Federation) embarquait un styleguide antérieur au module assistant et aux sélections, ce qui rendait `MorphSelect`, `Autocomplete`, `Combobox`, `LiveOrb`, `PromptInput`, `RecursiveErosionBackground`, `ASSISTANT_MODES`… `undefined` dans les apps du core (React #130). Les ranges `esm-styleguide` passent à `^1.5.1` pour forcer la republication.

## 1.1.0

### Minor Changes

- 321720c: feat(styleguide): ajoute `TopBar`, `TopBarIconButton`, `TopBarDivider`, `TopBarAvatar` (Tailwind, présentationnels, guide d'usage en commentaire). Le preset Tailwind scanne désormais le styleguide publié (`@source`) et expose l'échelle `error-*`.

### Patch Changes

- Updated dependencies [321720c]
  - @egen-civitas/esm-styleguide@1.2.0

## 1.0.2

### Patch Changes

- Updated dependencies [9eb32b2]
- Updated dependencies [60eda59]
- Updated dependencies [25b41d1]
  - @egen-civitas/esm-api@1.1.0
  - @egen-civitas/esm-react-utils@1.0.2
  - @egen-civitas/esm-dynamic-loading@2.0.0
  - @egen-civitas/esm-routes@1.0.2
