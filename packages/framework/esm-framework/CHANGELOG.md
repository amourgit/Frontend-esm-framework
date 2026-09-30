# @egen-civitas/esm-framework

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
