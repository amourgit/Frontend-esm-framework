# @egen-civitas/esm-styleguide

## 1.14.0

### Minor Changes

- 23488df: Scrollbars invisibles dans toutes les apps et tous les composants (le défilement reste intact). Règle globale dans la feuille de style du shell, avec `!important` pour neutraliser aussi les réglages locaux (`scrollbar-thin`, `scrollbar-thumb-*`, Carbon). Exception ponctuelle : attribut `data-scrollbar="visible"` sur l'élément concerné.

## 1.13.2

### Patch Changes

- 2a9541f: Plan de travail du shell : chaque racine (rails gauche/droit, zones gauche/droite/bas) est maintenant décorée par `egenComponentDecorator`. Avant, `renderWorkbench` montait `createRoot(...).render(<ToolWindowZone />)` sans `ComponentContext` : dès qu'on choisissait un outil dans un rail, la zone rendait son `ExtensionSlot` et levait « ComponentContext has not been provided. This should come from @egen-civitas/esm-react-utils ». Les composants du plan de travail ont aussi accès au namespace i18n `@egen-civitas/esm-styleguide`, à SWR et à la garde d'erreur, comme les autres apps. Test de régression : `workbench.render.test.tsx` (échoue sans le correctif). L'app-shell est republié car il embarque le styleguide.

## 1.13.1

### Patch Changes

- fdbe154: Plan de travail : corrige l'erreur « ComponentContext has not been provided » à l'ouverture d'une zone (clic sur un bouton de rail). Les zones sont montées par le shell hors de tout décorateur de composant ; elles fournissent maintenant leur propre `ComponentContext` à l'`ExtensionSlot` qui rend la fenêtre d'outils active.

## 1.13.0

### Minor Changes

- 10be7cc: Plan de travail : pastilles (compteurs) sur les boutons des rails.

  - Nouvelle API `setToolWindowBadge(id, badge)` (`id` = nom de l'extension du rail) : une app publie un compteur (ou un court texte) affiché sur son bouton de rail ; `null`, `0` ou `''` le retire. Les nombres supérieurs à 99 s'affichent « 99+ ».
  - Les pastilles vivent dans un store dédié (`workbenchBadgeStore`) et ne sont jamais mémorisées avec la disposition du plan de travail.

## 1.12.2

### Patch Changes

- bf22033: `uuid` passe en 14 (ESM, types intégrés ; `@types/uuid` retiré). Seul `v4()` est utilisé. `esm-styleguide` importe `uuid` (workspaces2) sans le déclarer : la dépendance est maintenant déclarée.

## 1.12.1

### Patch Changes

- 2468548: Plan de travail : rails transparents, cartes assombries et séparées par un écart.

  - Les rails gauche et droit sont toujours transparents (plus de fond ni de flou) et sans bordure : collés à la TopBar, ils se fondent avec elle sans aucune discontinuité.
  - Les zones et la carte centrale reçoivent un léger assombrissement de fond (`--egen-workbench-card-bg`, plus faible en thème clair) ; la bordure des zones disparaît.
  - Les cartes voisines sont séparées par un écart visible (`--egen-workbench-gap`, 6 px par défaut) : il matérialise la frontière, et la poignée de redimensionnement y est centrée. Elle s'illumine au survol, au focus et pendant le glissement, et la frontière suit le pointeur sans saut à la prise.
  - Routes publiques, écrans de moins de 768 px et impression : la carte centrale reste plein cadre, sans teinte.

## 1.12.0

### Minor Changes

- 6ddbd06: Shell : plan de travail façon IntelliJ (rails fixes et zones redimensionnables).

  - `esm-extensions` : contrat des fenêtres d'outils — slots `shell-rail-left-slot`, `shell-rail-bottom-slot` et `shell-rail-right-slot`, `ToolWindowMeta` (`title`, `titleKey`, `icon`, `order`) et `isToolWindowMeta`.
  - `esm-styleguide` : composants `LeftRail`, `RightRail`, `ToolWindowZone` et `Splitter`, store `workbenchStore` (tailles et fenêtres actives mémorisées dans le navigateur), `renderWorkbench`, `useToolWindows`, `useActiveAppModules`. La grille du body passe à rail | zone gauche | centre | zone droite | rail | workspaces, avec une zone basse entre les rails ; la zone centrale devient une carte arrondie.
  - `esm-app-shell` : nouveaux conteneurs `egen-rail-*-container` et `egen-zone-*-container`, montés au démarrage par `renderWorkbench`.

  Le rail gauche (groupe haut → zone gauche, groupe bas → zone basse) n'affiche que les outils de l'app montée ; le rail droit est global. Rails et zones sont masqués sur les routes publiques, en dessous de 768 px et à l'impression.

### Patch Changes

- Updated dependencies [6ddbd06]
  - @egen-civitas/esm-extensions@1.3.0

## 1.11.0

### Minor Changes

- 493c18d: CardModal : nouvelle variante d'animation `warp` (distorsion 3D + ressort) avec effet d'overlay lumineux (`overlayEffect`, `warpColor`). Respecte `prefers-reduced-motion` et les tokens du design system ; les préréglages existants sont inchangés.

## 1.10.1

### Patch Changes

- d8f7023: Exporte la catégorie `sites` depuis le point d'entrée `internal` (celui du `.` du package, donc de `@egen-civitas/esm-framework`) : elle n'était exposée que par `public`, les apps ne la voyaient pas.

## 1.10.0

### Minor Changes

- 6a75627: Ajoute la catégorie `sites` (Tailwind, présentationnelle) : `SiteCarousel`, `SiteSearchBar`, `SiteTabbedLayout`, `SitePanelHeader`, `SiteBanner` et les panneaux `SiteApplicationsPanel`, `SiteResourcesPanel`, `SiteMembersPanel`, `SiteTasksPanel`, `SiteActivityPanel`, `SiteSettingsPanel`, avec leurs types. Reprise des composants « sites » de Civitas-GED, rendus autonomes : aucun routage, aucune donnée ni son, tout passe par les props et callbacks.

## 1.9.0

### Minor Changes

- f939c5e: Arrière-plan de page monté une seule fois, dans le shell. L'état de `page-background` passe d'un contexte React (qui ne traversait pas les racines React des apps) à un store global `@egen-civitas/esm-state` : `<PageBackground>` fonctionne désormais depuis n'importe quelle app, sans provider. Nouveau `renderPageBackground(conteneur)` (appelé par le shell, conteneur `#egen-page-background-container`, rendu vide tant qu'aucune page ne déclare de fond) ; `<GlobalPageBackground>` gagne `fallback="animated" | "none"`. Le démontage d'une page ne libère que son propre fond (un démontage tardif n'efface plus celui de la page suivante) et un changement de props ne repasse plus par le fond par défaut. `<PageBackgroundProvider>` est déprécié et ne fait plus que rendre ses enfants. Styles : le fond de canevas est porté par `html` seul (`body` transparent) pour ne pas masquer l'arrière-plan global.

## 1.8.0

### Minor Changes

- b49f9e8: Suppression définitive de la barre latérale globale : le conteneur `#egen-left-nav-container` est retiré du shell (il n'était plus que masqué) ainsi que ses règles CSS. `LeftNavMenu`, `useLeftNav`, `setLeftNav` et `unsetLeftNav` sont marqués `@deprecated` : la navigation de niveau 2 est portée par la TopBar (slot `topbar-level2-nav`) ; une app qui veut une navigation interne affiche sa propre barre latérale.

### Patch Changes

- Updated dependencies [b49f9e8]
  - @egen-civitas/esm-react-utils@1.0.5
  - @egen-civitas/esm-extensions@1.1.1

## 1.7.0

### Minor Changes

- 48e7980: Navigation de niveau 2 pilotée par les apps : nouveau type partagé `NavEntryMeta`, constante `TOPBAR_LEVEL2_NAV_SLOT` (`topbar-level2-nav`) et validateur `isNavEntryMeta` dans `esm-extensions`. La colonne de navigation latérale globale (`leftNav`) est retirée de la grille du shell : seuls la TopBar et le footer sont globaux ; une app qui veut une sidebar la fournit dans son propre contenu.

### Patch Changes

- Updated dependencies [48e7980]
  - @egen-civitas/esm-extensions@1.1.0

## 1.6.1

### Patch Changes

- 64b008f: Footer : l'espace réservé au footer fixe est désormais une ligne de grille vide (`footerGap`, hauteur `--egen-footer-height`) au lieu d'un `padding-bottom` sur le body, que les resets globaux (`html, body { padding: 0 }`) écrasaient — la zone de scroll passait donc sous le footer. La zone de scroll se termine maintenant exactement au bord haut du footer, symétrique de la TopBar.

## 1.6.0

### Minor Changes

- 15bfdee: Ajoute `AsyncSelect` (catégorie `selections`, Tailwind pur, sans Radix ni cmdk) : sélecteur à options asynchrones (recherche serveur débouncée ou liste `preload` filtrée localement), requêtes annulables (`AbortSignal`) et cache, pagination / défilement infini, multi-sélection (tags, `maxSelected`), groupes, options désactivées, résolution de la sélection (`initialOptions` / `resolveOption`), navigation clavier + ARIA, commandes impératives (`controllerRef`) et personnalisation complète (textes, rendus, `classNames` par zone, placement du panneau).
- 7e1c686: Ajout du module `filters` au styleguide, porté de Civitas---GED : `FilterBar` (barre de filtres pilotée par schéma JSON, avec `useFilterSchema`, `matchesFilters`, `evaluateFilter`, `buildFilterFields`, `DEFAULT_OPERATORS`…) et `DocumentToolbar` (catégories, tri, mode d'affichage). Ajoute la dépendance `lucide-react` au styleguide. Le shell et `esm-framework` sont republiés pour que le singleton partagé embarque ces exports.
- 5a84ebe: Shell : la frontière basse du body est traitée comme la frontière haute. Le footer a une hauteur automatique mesurée en direct (`layout-sync.ts` → `--egen-footer-height`, en plus de `--egen-navbar-height`) ; la zone de scroll occupe exactement l'espace entre la TopBar et le footer et coupe son contenu net à chaque frontière. Les éléments positionnés par rapport à la fenêtre (side-nav, workspaces, action-menu) tiennent compte de la hauteur du footer. `setupNavbarHeightSync` devient `setupLayoutHeightSync` (alias conservé).

### Patch Changes

- befb7ba: Footer fixe : `#egen-footer-app-container` sort de la grille du body (`position: fixed` en bas de la fenêtre) et ne défile plus. Il partage avec la TopBar le niveau d'empilement `--egen-shell-bar-z-index` (8100, au-dessus de la side-nav Carbon et des rails tablette, sous les modales). Le body réserve `--egen-footer-height` en `padding-bottom` : la zone de scroll s'arrête au bord haut du footer et y est coupée net. Les rails d'action tablette se posent au-dessus du footer.

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
