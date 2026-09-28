# @egen-civitas/tailwind-preset

## 1.2.0

### Minor Changes

- 321720c: feat(styleguide): ajoute `TopBar`, `TopBarIconButton`, `TopBarDivider`, `TopBarAvatar` (Tailwind, présentationnels, guide d'usage en commentaire). Le preset Tailwind scanne désormais le styleguide publié (`@source`) et expose l'échelle `error-*`.

## 1.1.0

### Minor Changes

- 4814ae4: Nouveau package : point d'entrée Tailwind v4 partagé (`tailwind.tw.css`), pont vers les tokens `--colors-*`/`--border-radius-*` de `@egen-civitas/esm-theme`, preflight désactivé (contexte single-spa multi-apps). Documente le modificateur `!` de Tailwind v4 comme mécanisme validé pour surcharger un composant `esm-styleguide` stylé en SCSS (le SCSS existant n'étant pas dans un `@layer`, une classe Tailwind normale ne le bat pas — une classe important, si).
