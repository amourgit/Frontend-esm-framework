# @egen-civitas/tailwind-preset

## 1.4.0

### Minor Changes

- bfe6b03: Catégorie `selections` (Tailwind) : ajoute `MorphSelect` (trigger qui se morphe en panneau — `MorphSelectTrigger/Value/Content/Item`), `Autocomplete` (capsule Material 3 : simple/multi-sélection, création, ripple, chips) et `Combobox` (déclencheur + recherche, design shadcn reproduit sans Radix/cmdk). Design copié à l'identique des sources, entièrement configurable par le consommateur (`classNames` par zone, textes, rendus personnalisés, transitions, placement…). Icônes en SVG inline : aucune nouvelle dépendance.

  `@egen-civitas/tailwind-preset` : ajoute les tokens sémantiques (`background`, `foreground`, `card`, `popover`, `muted`, `accent`, `secondary`, `primary`, `border`, `input`, `ring`, `destructive`) reliés à `colors.surface.*` / `colors.border.*` du thème EGEN (light/dark et surcharges tenant inclus), pour que `bg-card`, `text-foreground`, `border-border`… s'affichent réellement dans les composants Tailwind du styleguide.

## 1.3.0

### Minor Changes

- c144ef3: Tailwind devient un citoyen de premier rang face au SCSS/Carbon : les utilitaires sont émis sans `@layer` (le reset Carbon non-layeré écrasait padding/margin/border/font des utilitaires), Preflight est activé dans `@layer base` (priorité minimale, ne peut pas écraser Carbon), et `--font-sans`/`--font-mono` sont pontés vers les tokens du thème.

## 1.2.0

### Minor Changes

- 321720c: feat(styleguide): ajoute `TopBar`, `TopBarIconButton`, `TopBarDivider`, `TopBarAvatar` (Tailwind, présentationnels, guide d'usage en commentaire). Le preset Tailwind scanne désormais le styleguide publié (`@source`) et expose l'échelle `error-*`.

## 1.1.0

### Minor Changes

- 4814ae4: Nouveau package : point d'entrée Tailwind v4 partagé (`tailwind.tw.css`), pont vers les tokens `--colors-*`/`--border-radius-*` de `@egen-civitas/esm-theme`, preflight désactivé (contexte single-spa multi-apps). Documente le modificateur `!` de Tailwind v4 comme mécanisme validé pour surcharger un composant `esm-styleguide` stylé en SCSS (le SCSS existant n'étant pas dans un `@layer`, une classe Tailwind normale ne le bat pas — une classe important, si).
