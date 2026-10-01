# @egen-civitas/esm-app-shell

## 2.2.2

### Patch Changes

- 6cac063: Relève les plages de dépendances pour embarquer `esm-extensions` 1.1.0 (`NavEntryMeta`, `TOPBAR_LEVEL2_NAV_SLOT`, `isNavEntryMeta`) et `esm-styleguide` 1.7.0 (grille du shell sans colonne `leftNav`). Sans cela, `esm-framework` 1.1.2 continuait de résoudre `esm-extensions` 1.0.2 et n'exposait pas les nouveaux exports.
- Updated dependencies [6cac063]
  - @egen-civitas/esm-framework@1.1.3

## 2.2.1

### Patch Changes

- 64b008f: Footer : l'espace réservé au footer fixe est désormais une ligne de grille vide (`footerGap`, hauteur `--egen-footer-height`) au lieu d'un `padding-bottom` sur le body, que les resets globaux (`html, body { padding: 0 }`) écrasaient — la zone de scroll passait donc sous le footer. La zone de scroll se termine maintenant exactement au bord haut du footer, symétrique de la TopBar.
- Updated dependencies [64b008f]
  - @egen-civitas/esm-styleguide@1.6.1

## 2.2.0

### Minor Changes

- 5a84ebe: Shell : la frontière basse du body est traitée comme la frontière haute. Le footer a une hauteur automatique mesurée en direct (`layout-sync.ts` → `--egen-footer-height`, en plus de `--egen-navbar-height`) ; la zone de scroll occupe exactement l'espace entre la TopBar et le footer et coupe son contenu net à chaque frontière. Les éléments positionnés par rapport à la fenêtre (side-nav, workspaces, action-menu) tiennent compte de la hauteur du footer. `setupNavbarHeightSync` devient `setupLayoutHeightSync` (alias conservé).

### Patch Changes

- 7e1c686: Ajout du module `filters` au styleguide, porté de Civitas---GED : `FilterBar` (barre de filtres pilotée par schéma JSON, avec `useFilterSchema`, `matchesFilters`, `evaluateFilter`, `buildFilterFields`, `DEFAULT_OPERATORS`…) et `DocumentToolbar` (catégories, tri, mode d'affichage). Ajoute la dépendance `lucide-react` au styleguide. Le shell et `esm-framework` sont republiés pour que le singleton partagé embarque ces exports.
- befb7ba: Footer fixe : `#egen-footer-app-container` sort de la grille du body (`position: fixed` en bas de la fenêtre) et ne défile plus. Il partage avec la TopBar le niveau d'empilement `--egen-shell-bar-z-index` (8100, au-dessus de la side-nav Carbon et des rails tablette, sous les modales). Le body réserve `--egen-footer-height` en `padding-bottom` : la zone de scroll s'arrête au bord haut du footer et y est coupée net. Les rails d'action tablette se posent au-dessus du footer.
- Updated dependencies [15bfdee]
- Updated dependencies [7e1c686]
- Updated dependencies [5a84ebe]
- Updated dependencies [befb7ba]
  - @egen-civitas/esm-styleguide@1.6.0
  - @egen-civitas/esm-framework@1.1.2

## 2.1.1

### Patch Changes

- 956fcef: Rebuild du shell avec esm-styleguide 1.5.x : le singleton `@egen-civitas/esm-framework` partagé (Module Federation) embarquait un styleguide antérieur au module assistant et aux sélections, ce qui rendait `MorphSelect`, `Autocomplete`, `Combobox`, `LiveOrb`, `PromptInput`, `RecursiveErosionBackground`, `ASSISTANT_MODES`… `undefined` dans les apps du core (React #130). Les ranges `esm-styleguide` passent à `^1.5.1` pour forcer la republication.
- Updated dependencies [956fcef]
  - @egen-civitas/esm-framework@1.1.1

## 2.1.0

### Minor Changes

- 9bb7f95: Layout du shell : le contenu défile dans `#egen-scroll-region` (sous la TopBar) au lieu de la fenêtre, donc il est coupé net à la frontière TopBar/body et ne passe plus derrière la barre. La TopBar a une hauteur automatique (niveau 1 + niveau 2) mesurée en direct par le shell (`layout-sync.ts`) dans `--egen-navbar-height`, ce qui décale correctement le début du contenu. Le pied de page défile avec le contenu. Impression inchangée.

### Patch Changes

- Updated dependencies [799d1a1]
- Updated dependencies [9bb7f95]
  - @egen-civitas/esm-styleguide@1.3.0

## 2.0.1

### Patch Changes

- 1f8d9e9: Rebuild du shell avec esm-framework 1.1.0 / esm-styleguide 1.2.0 : le singleton partagé (Module Federation) embarquait esm-framework 1.0.1 sans TopBar, ce qui rendait `TopBar` undefined dans les apps du core (React #130).

## 2.0.0

### Major Changes

- 25b41d1: change-kim

### Patch Changes

- Updated dependencies [9eb32b2]
- Updated dependencies [60eda59]
  - @egen-civitas/esm-api@1.1.0
  - @egen-civitas/esm-react-utils@1.0.2
  - @egen-civitas/esm-framework@1.0.2

## 1.0.3

### Patch Changes

- 8688154: Corrige le bypass d'authentification dev (`EGEN_DEV_NO_AUTH`) et le système
  multi-tenant (`EGEN_TENANT_*`), inertes depuis que `esm-app-shell` est
  consommé comme paquet npm pré-compilé par une app séparée.

  - `esm-api` : `isDevAuthBypassEnabled()` lit désormais `window.egenDevNoAuth`
    (canal runtime) en plus de `process.env.EGEN_DEV_NO_AUTH` (canal
    build-time historique, insuffisant seul pour un paquet déjà compilé).
  - `esm-globals` : déclaration TypeScript de `window.egenDevNoAuth`.
  - `esm-app-shell` : `run.ts` utilise `isDevAuthBypassEnabled()` comme
    source de vérité unique (au lieu d'un second check dupliqué) ; le défaut
    `EGEN_DEV_NO_AUTH` du `DefinePlugin` vient maintenant de
    `resolvePublicEnv()` (voir `rspack-config`) au lieu d'un `|| 'false'`
    codé en dur.
  - `rspack-config` : nouveau fichier `.env.defaults` (valeurs par défaut du
    framework, surchargeables en totalité par le `.env` du consommateur) ;
    `PUBLIC_ENV_PREFIXES` (`EGEN_AI_`, `EGEN_DEV_`, `EGEN_TENANT_`) remplace
    l'ancien `ADDITIONAL_RUNTIME_KEYS` codé en dur sur une seule clé ;
    `resolvePublicEnv()` exportée comme source unique de la hiérarchie
    framework-defaults < .env consommateur < process.env.
  - `egen` : `egen develop` calcule désormais ce pont runtime
    (`RUNTIME_BRIDGED_VARS` — `EGEN_DEV_NO_AUTH` et les 7 variables
    `EGEN_TENANT_*`) et l'injecte dans le `index.html` servi, avant l'appel à
    `initializeSpa()`.

- Updated dependencies [8688154]
  - @egen-civitas/esm-api@1.0.2
  - @egen-civitas/esm-globals@1.0.2
