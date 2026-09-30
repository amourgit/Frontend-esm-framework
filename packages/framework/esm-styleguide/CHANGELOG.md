# @egen-civitas/esm-styleguide

## 1.5.1

### Patch Changes

- cd162d1: Corrige 1.4.0 : importer le styleguide déclenchait le préchargement réseau de la scène Spline (1,3 Mo) pour toutes les apps. `SplineScene` charge désormais Spline à la demande (`React.lazy`) et le préchargement devient explicite via `preloadSplineScene(url)`.

## 1.5.0

### Minor Changes

- bfe6b03: Catégorie `selections` (Tailwind) : ajoute `MorphSelect` (trigger qui se morphe en panneau — `MorphSelectTrigger/Value/Content/Item`), `Autocomplete` (capsule Material 3 : simple/multi-sélection, création, ripple, chips) et `Combobox` (déclencheur + recherche, design shadcn reproduit sans Radix/cmdk). Design copié à l'identique des sources, entièrement configurable par le consommateur (`classNames` par zone, textes, rendus personnalisés, transitions, placement…). Icônes en SVG inline : aucune nouvelle dépendance.

  `@egen-civitas/tailwind-preset` : ajoute les tokens sémantiques (`background`, `foreground`, `card`, `popover`, `muted`, `accent`, `secondary`, `primary`, `border`, `input`, `ring`, `destructive`) reliés à `colors.surface.*` / `colors.border.*` du thème EGEN (light/dark et surcharges tenant inclus), pour que `bg-card`, `text-foreground`, `border-border`… s'affichent réellement dans les composants Tailwind du styleguide.

## 1.4.0

### Minor Changes

- 8c4b678: Ajoute le module `assistant/` (Tailwind) migré à l'identique de Civitas---GED : `LiveOrb` (avatar WebGL), `SplineScene`, `PromptInput` multimodal, `RecursiveErosionBackground` (sphère de particules + shaders), `WaterGlassModal`, moteur sonore `xbox-audio` et la configuration des 4 modes IA (`ASSISTANT_MODES`).

## 1.3.0

### Minor Changes

- 9bb7f95: Layout du shell : le contenu défile dans `#egen-scroll-region` (sous la TopBar) au lieu de la fenêtre, donc il est coupé net à la frontière TopBar/body et ne passe plus derrière la barre. La TopBar a une hauteur automatique (niveau 1 + niveau 2) mesurée en direct par le shell (`layout-sync.ts`) dans `--egen-navbar-height`, ce qui décale correctement le début du contenu. Le pied de page défile avec le contenu. Impression inchangée.

### Patch Changes

- 799d1a1: Le conteneur de la TopBar n'est plus redéfini dans `_panel-overrides.scss` (il écrasait le z-index/position du shell) ; le side-nav se cale sur `--egen-navbar-height` (hauteur mesurée, niveau 2 inclus).

## 1.2.0

### Minor Changes

- 321720c: feat(styleguide): ajoute `TopBar`, `TopBarIconButton`, `TopBarDivider`, `TopBarAvatar` (Tailwind, présentationnels, guide d'usage en commentaire). Le preset Tailwind scanne désormais le styleguide publié (`@source`) et expose l'échelle `error-*`.

## 1.1.0

### Minor Changes

- b90a6f6: Nouveau module `page-background` (100% Tailwind, sans SCSS ni CSS Modules) : système d'arrière-plan de page porté depuis Civitas-GED, où il habillait déjà toutes les pages de l'intranet — `<PageBackgroundProvider>` / `<GlobalPageBackground>` (à monter une fois dans le shell), `<PageBackground>` (déclaratif, par page) et `<GradientWave>` (fond animé WebGL, réutilisable seul).

  Corrigé lors du portage : le listener `resize` de `GradientWave` n'était jamais désinscrit (une arrow function anonyme était attachée dans `init()`, différente de la référence `handleResize` retirée dans `destroy()`) — fuite mémoire à chaque montage/démontage. Le composant réutilise maintenant la même référence liée pour l'attachement et le retrait.

  Guide d'utilisation complet en commentaire en bas de `page-background.component.tsx` et `gradient-wave.component.tsx`.

### Patch Changes

- c82f723: Corrige une série de dépendances manquantes/mal déclarées trouvées en débloquant la CI (l'installation était bloquée depuis fin août, masquant ces problèmes) :

  - `esm-tenant` : `happy-dom` manquait alors que ses tests l'utilisent (ni dep, ni peerDep) → ajouté en devDependency.
  - `esm-ai-tools` : `swr` est chargé via un `import()` dynamique dans `native/index.ts` mais n'était déclaré nulle part → ajouté en peerDependency (`2.x`, cohérent avec `esm-styleguide`/`esm-react-utils`/`esm-framework`).
  - `esm-api`, `esm-data-api` : `rxjs` utilisé au runtime mais absent de peerDependencies → ajouté (`7.x`).
  - `esm-navigation`, `esm-styleguide`, `esm-react-utils` : `single-spa` utilisé au runtime mais absent de peerDependencies → ajouté (`6.x`).
  - `esm-extensions` : `react` utilisé au runtime mais absent de peerDependencies → ajouté (`18.x`).
  - `esm-ai-framework` : `framework.test.ts` faisait `require('@egen-civitas/esm-ai-tools')` en plein milieu du corps de 3 tests (au lieu d'un import statique en haut de fichier) — ce require contournait le mock de `@egen-civitas/esm-styleguide` et déclenchait une résolution Node native qui tentait de charger pour de vrai des fichiers `.module.scss` compilés (`Unknown file extension ".scss"`). Remplacé par un import statique de `hasTool`/`getTool`/`overrideTool`, et ajout d'un `vi.mock('@egen-civitas/esm-styleguide', ...)` en tête de fichier (même pattern déjà utilisé dans `esm-ai-tools/src/native/native.test.ts`).

  Tous les fixes vérifiés par reproduction isolée réelle (installation + exécution effective des tests concernés), pas seulement par lecture de code.

- Updated dependencies [4e5e0a1]
- Updated dependencies [c82f723]
  - @egen-civitas/esm-react-utils@1.0.3
  - @egen-civitas/esm-api@1.1.1
  - @egen-civitas/esm-data-api@1.0.2
  - @egen-civitas/esm-extensions@1.0.2
  - @egen-civitas/esm-navigation@1.0.2
