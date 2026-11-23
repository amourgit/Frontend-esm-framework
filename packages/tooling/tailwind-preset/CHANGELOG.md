# @egen-civitas/tailwind-preset

## 2.0.0

### Major Changes

- aa66db3: **Retrait complet de Carbon et de SCSS.** Tailwind v4 est le seul système de style ; les composants de base sont les nôtres (`esm-styleguide/src/ui`, copiés de shadcn/ui et Radix, MIT).

  - `@egen-civitas/esm-styleguide` : plus de `@carbon/react`, `@carbon/charts` ni `sass`. Nouveaux composants exportés : `Button`, `IconButton`, `Link`, `Badge`, `Separator`, `Label`, `Input`, `TextInput`, `Switch`, `Spinner`, `InlineLoading`, `Layer`, `Tooltip`, `Tile*`, `Alert*`, `NotificationBanner`, `Dialog*`, `DropdownMenu*`, `Tabs*`, `Table*`, `ModalHeader` / `ModalBody` / `ModalFooter`, `AppHeader*`. `cn` utilise désormais `tailwind-merge`. Le type `CarbonTagColor` devient `TagColor` (et `carbonTagColors` → `tagColors`). Les composants du framework qui reposaient sur Carbon (modales, notifications, snackbars, tags, pagination, menu déroulant, barre d'actions par lots, sélecteur de dates, fenêtres d'espace de travail) sont réécrits sans lui.
  - Feuille globale : `@egen-civitas/esm-styleguide/styles` pointe sur un **fichier CSS standard** (`dist/styles.css`) ; l'export SCSS `./src/vars` et tous les partiels `.scss` disparaissent. Les modules `*.module.scss` sont devenus `*.module.css` (mêmes noms de classes). Les jetons `--cds-*` sont renommés `--ui-*`.
  - `@egen-civitas/rspack-config`, `@egen-civitas/webpack-config` : plus de règle `sass-loader`, `scssRuleConfig` supprimé, `.scss` retiré des extensions résolues.
  - `@egen-civitas/esm-app-shell` : la feuille globale est lue telle quelle (plus de compilation Sass) ; `@carbon/react` n'est plus une dépendance partagée ; la page d'erreur et le fil d'Ariane n'utilisent plus de classes Carbon.
  - `@egen-civitas/tailwind-preset` : importe `tw-animate-css` (animations des composants).
  - `@egen-civitas/esm-ai-tools` : l'identité des composants vient du `data-slot` des composants EGEN (`source: 'slot'`, champ `slot`) à la place du bloc Carbon (`source: 'carbon'`, champ `carbon`) ; `theme.carbonTheme` est supprimé.
  - `@egen-civitas/egen` : les dépendances `sass*` ne sont plus fournies.

  Guide de migration : `docs/MIGRATION-CARBON.md`.

### Minor Changes

- 3e0ab01: Premiers composants de base 100 % Tailwind, sans Carbon ni SCSS (chantier de retrait de Carbon, phase 0 et 1) : `Button`, `IconButton`, `Link`, `Badge`, `Separator`, `Label`, `Input`, `TextInput`, `Switch`, `Spinner`, `InlineLoading`, `Layer`, `Tooltip` et `Tile` (+ `TileHeader`, `TileTitle`, `TileDescription`, `TileAction`, `TileContent`, `TileFooter`), exportés par `@egen-civitas/esm-styleguide`, avec l'utilitaire `cn` (clsx + tailwind-merge). Code copié de shadcn/ui (MIT, avis dans `THIRD_PARTY_NOTICES.md`) puis adapté ; comportements accessibles via Radix. Ils lisent les jetons de thème existants (`bg-primary`, `bg-card`, `border-input`…), donc suivent le moteur de thème.

  `@egen-civitas/tailwind-preset` importe désormais `tw-animate-css` (classes `animate-in`, `fade-in-0`, `zoom-in-95`…, requises par les infobulles et bientôt les menus et modales).

  Garde-fou : un test d'architecture (`zero-carbon.architecture.test.ts`) interdit tout nouvel import Carbon ou fichier `.scss` ; sa liste blanche (`carbon-scss-allowlist.json`, 88 fichiers) ne peut que rétrécir.

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

- 4814ae4: Nouveau package : point d'entrée Tailwind v4 partagé (`tailwind.tw.css`), pont vers les tokens de l'ancien contrat de variables, preflight désactivé (contexte single-spa multi-apps). Documente le modificateur `!` de Tailwind v4 comme mécanisme validé pour surcharger un composant `esm-styleguide` stylé en SCSS (le SCSS existant n'étant pas dans un `@layer`, une classe Tailwind normale ne le bat pas — une classe important, si).
