# @egen-civitas/esm-app-shell

## 2.7.0

### Minor Changes

- 33f2197: Le shell devient neutre : il n'embarque plus l'ancien favicon hérité, ni l'ancien slogan du manifest PWA, ni la couleur de thème `#005d5d`. Il livre un favicon et une icône PWA génériques (`src/assets/favicon.ico`, `src/assets/icon-512.png`) et le projet client fournit les siens via la nouvelle variable `EGEN_BRAND_DIR` (dossier dont `favicon.ico` et `icon-512.png` remplacent ceux du shell). Nouvelles variables : `EGEN_PAGE_DESCRIPTION` (défaut : le titre de la page) et `EGEN_THEME_COLOR` (défaut : `#161616`). Suppression de `src/assets/logo.svg` (un PNG renommé, jamais référencé).

### Patch Changes

- Updated dependencies [75af6f5]
- Updated dependencies [cf941e7]
- Updated dependencies [fc70c70]
- Updated dependencies [4c84714]
- Updated dependencies [8a39e13]
- Updated dependencies [159db44]
  - @egen-civitas/esm-styleguide@3.0.0
  - @egen-civitas/esm-api@2.0.0
  - @egen-civitas/esm-config@2.0.0
  - @egen-civitas/esm-react-utils@3.0.0
  - @egen-civitas/esm-utils@2.0.0
  - @egen-civitas/esm-globals@2.0.0
  - @egen-civitas/esm-framework@3.0.0
  - @egen-civitas/esm-offline@1.0.3
  - @egen-civitas/esm-state@1.0.3

## 2.6.7

### Patch Changes

- 450752c: `LiveOrb` : la tête est agrandie d'environ 9 % dans sa boîte (nouvelle constante exportée `HEAD_ZOOM = 1.09`). Le zoom est appliqué à toute la scène (caméra du shader, et conteneur du repli sans GPU) : crâne, yeux, trait, oreillettes et halo grandissent du même facteur, donc les proportions mesurées sur la mascotte restent identiques. Le halo néon et la rotation maximale de la tête restent dans le cadre.
- Updated dependencies [450752c]
  - @egen-civitas/esm-styleguide@2.3.1

## 2.6.6

### Patch Changes

- 477171f: `LiveOrb` devient une **tête 3D de type Baymax** au lieu d'une sphère : crâne large et arrondi, deux yeux ovales reliés par un trait fin, et deux oreillettes de casque avec anneau lumineux vert → jaune. Les proportions ont été mesurées sur la mascotte EGEN (rapport largeur/hauteur de la tête ≈ 1 : 0,74, yeux ≈ 3,7 fois leur largeur d'écart, trait ≈ 15 % de la hauteur d'un œil).

  - **Rendu** : un seul fragment shader raymarché (scène SDF : crâne ellipsoïdal, oreillettes à cuvette creuse + anneau néon, raccord doux). Éclairage fixe dans le monde (ombres douces, occlusion ambiante, reflet), halo néon, silhouette anti-crénelée.
  - **La tête pivote** vers le pointeur (lacet, tangage, léger roulis) avec un ressort amorti pour un mouvement de cou naturel, et un très léger balancement au repos. Les yeux, le trait et les oreilles sont solidaires du crâne : ils épousent sa courbure et se déforment en perspective quand il tourne. Le clignement écrase les yeux, le trait reste.
  - **Suivi du pointeur** par angle (et non plus saturé à quelques pixels du centre), donc fluide même pour un avatar de 38 px ; retour à la pose neutre quand le pointeur quitte la fenêtre.
  - **Repli sans GPU** refait dans le même design (tête, yeux, trait, oreilles à dégradé néon) avec un léger parallaxe vers le pointeur ; il ne dépend plus d'aucune classe Tailwind.
  - **Robustesse** : la boucle de rendu se met en pause hors écran / onglet masqué, et une perte de contexte WebGL bascule sur le repli.
  - **API rétro-compatible** : `variant` (`white`, `black`, `webgl`, `custom`), `color`, `eyeColor`, `colors`, `interactive`, `blink`, `size`, `className` sont inchangés, donc tous les usages existants (avec leurs variantes) sont mis à jour sans modification. Nouveautés : `ears` (défaut `true`), `earColors` (deux couleurs, défaut vert → jaune ; la matière `webgl` réutilise sa palette), `label` (nom accessible, défaut `Assistant avatar`). `createLiveOrb` accepte les mêmes options ; `headRotation` est exporté depuis le module.

  Le shell est republié pour embarquer cette version du styleguide.

- Updated dependencies [477171f]
  - @egen-civitas/esm-styleguide@2.3.0

## 2.6.5

### Patch Changes

- 1ffdcd4: `SectionSlot` : une page expose un slot d'extensions (`<SectionSlot name="home-sections" />`) et chaque app y branche sa propre `Section` depuis son `routes.json`. Les en-têtes de section sont **collants** : l'en-tête reste en haut de la zone de défilement tant que le corps de sa section est visible, puis la section suivante prend le relais. Le mode passe par des variables CSS héritées (`--section-header-position`, `--section-sticky-top`, `--section-sticky-z`, `--section-sticky-bg`), donc il traverse les parcels single-spa sans contexte React partagé.

  `Section` gagne `stickyHeader`, `stickyOffset` et `stickyZIndex` (hérités du `SectionSlot` quand absents ; `stickyHeader={false}` pour s'en exempter). Nouveaux exports : `SectionSlot`, `SectionCard`, `SectionCardTitleButton`, `SECTION_CARD_CLASS`, `stickyStyleVars`, `STICKY_VARS`. Le shell est republié pour embarquer cette version du styleguide.

- Updated dependencies [1ffdcd4]
  - @egen-civitas/esm-styleguide@2.2.0

## 2.6.4

### Patch Changes

- 7897917: Recompilation du shell avec `@egen-civitas/esm-styleguide` 2.1.1 : le framework qu'il fournit aux apps au runtime expose enfin `Section`, `SectionAction` et `SectionGrid` (le 2.6.3 embarquait la 2.1.0 où ils n'étaient pas exportés → React #130 sur l'accueil).

## 2.6.3

### Patch Changes

- b628765: Rebuild du shell avec `@egen-civitas/esm-styleguide` 2.1 : le framework fourni aux apps expose désormais `ToolWindowHeader` (le 2.6.2 avait été compilé avec le styleguide 2.0, sans lui, ce qui faisait planter les apps qui l'importent — React #130).

## 2.6.2

### Patch Changes

- Updated dependencies [b8a56e7]
  - @egen-civitas/esm-styleguide@2.0.0
  - @egen-civitas/esm-react-utils@2.0.0
  - @egen-civitas/esm-framework@2.0.0

## 2.6.1

### Patch Changes

- 0978f93: Rails : le rail droit porte aussi un groupe bas ; `ToolWindowMeta.rail` ('left' par défaut | 'right') choisit le rail d'une option de la zone basse (pleine largeur entre les rails).
- Updated dependencies [0978f93]
- Updated dependencies [5e15585]
- Updated dependencies [ac88343]
  - @egen-civitas/esm-styleguide@1.17.0
  - @egen-civitas/esm-framework@1.4.0
  - @egen-civitas/esm-globals@1.0.3

## 2.6.0

### Minor Changes

- f3bdd5e: Animations et loader : bibliothèque d'animations SCSS (classes `egen-anim-*`, mixins, tokens de mouvement), ouverture/fermeture animées des zones du plan de travail, entrée animée du contenu des pages, loader EGEN réutilisable (`Loader`, `showPageLoader`, `usePageLoading`) retenu pendant le chargement des pages.

### Patch Changes

- Updated dependencies [f3bdd5e]
  - @egen-civitas/esm-styleguide@1.16.0
  - @egen-civitas/esm-framework@1.3.0

## 2.5.7

### Patch Changes

- 057d9c8: Republie le shell et `esm-framework` avec `esm-styleguide` 1.15 et `esm-extensions` 1.4 : options globales du rail gauche (`meta.global`) et `SectionNavPanel`.
- Updated dependencies [057d9c8]
  - @egen-civitas/esm-framework@1.2.2

## 2.5.6

### Patch Changes

- 23488df: Scrollbars invisibles dans toutes les apps et tous les composants (le défilement reste intact). Règle globale dans la feuille de style du shell, avec `!important` pour neutraliser aussi les réglages locaux (`scrollbar-thin`, `scrollbar-thumb-*`, Carbon). Exception ponctuelle : attribut `data-scrollbar="visible"` sur l'élément concerné.
- Updated dependencies [23488df]
  - @egen-civitas/esm-styleguide@1.14.0

## 2.5.5

### Patch Changes

- 2a9541f: Plan de travail du shell : chaque racine (rails gauche/droit, zones gauche/droite/bas) est maintenant décorée par `egenComponentDecorator`. Avant, `renderWorkbench` montait `createRoot(...).render(<ToolWindowZone />)` sans `ComponentContext` : dès qu'on choisissait un outil dans un rail, la zone rendait son `ExtensionSlot` et levait « ComponentContext has not been provided. This should come from @egen-civitas/esm-react-utils ». Les composants du plan de travail ont aussi accès au namespace i18n `@egen-civitas/esm-styleguide`, à SWR et à la garde d'erreur, comme les autres apps. Test de régression : `workbench.render.test.tsx` (échoue sans le correctif). L'app-shell est republié car il embarque le styleguide.
- Updated dependencies [2a9541f]
  - @egen-civitas/esm-styleguide@1.13.2

## 2.5.4

### Patch Changes

- fdbe154: Plan de travail : corrige l'erreur « ComponentContext has not been provided » à l'ouverture d'une zone (clic sur un bouton de rail). Les zones sont montées par le shell hors de tout décorateur de composant ; elles fournissent maintenant leur propre `ComponentContext` à l'`ExtensionSlot` qui rend la fenêtre d'outils active.
- Updated dependencies [fdbe154]
  - @egen-civitas/esm-styleguide@1.13.1

## 2.5.3

### Patch Changes

- 5dd2fc9: Bypass d'authentification de développement (`EGEN_DEV_NO_AUTH`) : émule désormais le changement de langue, comme un vrai backend. Avant, changer de langue dans la TopBar ne produisait aucun effet en dev : `POST /session { locale }` renvoyait toujours la session en `fr` (la page se rechargeait en `fr`), et `POST /user/<uuid> { userProperties.defaultLocale }` n'était pas intercepté, partait vers un serveur sans API et échouait.

  - `POST /session { locale }` : langue de la session, conservée dans `sessionStorage` ; le store de session et `<html lang>` sont mis à jour tout de suite.
  - `POST /user/<uuid> { userProperties }` : langue par défaut, conservée dans `localStorage`.
  - Priorité à l'initialisation : langue de session, puis langue par défaut, puis `fr`. Les locales non autorisées sont ignorées.
  - Nouvelle fonction `getDevBypassSession()` (session fictive courante).
  - L'app-shell est republié car il embarque `esm-api` (le correctif n'atteint les apps que par le bundle du shell).

- Updated dependencies [5dd2fc9]
  - @egen-civitas/esm-api@1.1.3

## 2.5.2

### Patch Changes

- 10be7cc: Plan de travail : pastilles (compteurs) sur les boutons des rails.

  - Nouvelle API `setToolWindowBadge(id, badge)` (`id` = nom de l'extension du rail) : une app publie un compteur (ou un court texte) affiché sur son bouton de rail ; `null`, `0` ou `''` le retire. Les nombres supérieurs à 99 s'affichent « 99+ ».
  - Les pastilles vivent dans un store dédié (`workbenchBadgeStore`) et ne sont jamais mémorisées avec la disposition du plan de travail.

- Updated dependencies [10be7cc]
  - @egen-civitas/esm-styleguide@1.13.0

## 2.5.1

### Patch Changes

- 2468548: Plan de travail : rails transparents, cartes assombries et séparées par un écart.

  - Les rails gauche et droit sont toujours transparents (plus de fond ni de flou) et sans bordure : collés à la TopBar, ils se fondent avec elle sans aucune discontinuité.
  - Les zones et la carte centrale reçoivent un léger assombrissement de fond (`--egen-workbench-card-bg`, plus faible en thème clair) ; la bordure des zones disparaît.
  - Les cartes voisines sont séparées par un écart visible (`--egen-workbench-gap`, 6 px par défaut) : il matérialise la frontière, et la poignée de redimensionnement y est centrée. Elle s'illumine au survol, au focus et pendant le glissement, et la frontière suit le pointeur sans saut à la prise.
  - Routes publiques, écrans de moins de 768 px et impression : la carte centrale reste plein cadre, sans teinte.

- Updated dependencies [2468548]
  - @egen-civitas/esm-styleguide@1.12.1

## 2.5.0

### Minor Changes

- 6ddbd06: Shell : plan de travail façon IntelliJ (rails fixes et zones redimensionnables).

  - `esm-extensions` : contrat des fenêtres d'outils — slots `shell-rail-left-slot`, `shell-rail-bottom-slot` et `shell-rail-right-slot`, `ToolWindowMeta` (`title`, `titleKey`, `icon`, `order`) et `isToolWindowMeta`.
  - `esm-styleguide` : composants `LeftRail`, `RightRail`, `ToolWindowZone` et `Splitter`, store `workbenchStore` (tailles et fenêtres actives mémorisées dans le navigateur), `renderWorkbench`, `useToolWindows`, `useActiveAppModules`. La grille du body passe à rail | zone gauche | centre | zone droite | rail | workspaces, avec une zone basse entre les rails ; la zone centrale devient une carte arrondie.
  - `esm-app-shell` : nouveaux conteneurs `egen-rail-*-container` et `egen-zone-*-container`, montés au démarrage par `renderWorkbench`.

  Le rail gauche (groupe haut → zone gauche, groupe bas → zone basse) n'affiche que les outils de l'app montée ; le rail droit est global. Rails et zones sont masqués sur les routes publiques, en dessous de 768 px et à l'impression.

### Patch Changes

- Updated dependencies [6ddbd06]
  - @egen-civitas/esm-styleguide@1.12.0

## 2.4.4

### Patch Changes

- 4c8e659: Republie l'app-shell avec le styleguide courant (≥ 1.11, catégorie `sites` incluse). Le shell fournit `@egen-civitas/esm-framework` aux apps au runtime : le bundle publié (2.4.3) contenait un styleguide plus ancien, donc `SiteCarousel`, `SiteTabbedLayout`, etc. valaient `undefined` côté apps (erreur React #130 à l'ouverture de `/sites`).

## 2.4.3

### Patch Changes

- 6d26762: Republication du shell pour qu'il embarque `@egen-civitas/esm-framework` / `esm-extensions` 1.2.1. Le shell est livré pré-compilé avec le framework : le 2.4.2 (17 octobre) contenait encore l'ancien code de navigation et n'exposait donc ni `isNavEntryInWorkspace` ni `getNavBehavior`/`registerNavBehavior` aux apps (une app qui les appelle plante au rendu). Aucun changement de code dans le shell.

## 2.4.2

### Patch Changes

- 4bab617: Sécurité du canal IA : le frontend peut maintenant vérifier que les ordres `tool.call` viennent bien du backend, et refuser une destination de canal non sûre. Le frontend reste un simple exécutant — toute la décision reste côté backend.

  **Appels de tools signés (standards JWS RFC 7515 / JWT RFC 7519 / JWKS RFC 7517, via `jose`)** : le backend signe l'appel entier (`jws` dans `tool.call`) avec une clé privée ; le frontend ne détient que la clé publique. Il exécute uniquement le contenu signé (`tool`, `args`) et exige : signature valide (algorithmes asymétriques en liste blanche, jamais `none`/HS*), `typ` `egen-ai-call+jwt`, `aud` `egen-ai:frontend`, `sub` = `sessionId` du `session.welcome`, `iat` ≤ 120 s, `exp`, `jti` = `callId`. Un callId authentifié ne s'exécute jamais deux fois (anti-rejeu, y compris après éviction du cache de résultats). Les appels sont admis dans leur ordre d'arrivée (vérification asynchrone, exécution toujours séquentielle) et un `tool.cancel` précoce reste pris en compte. Un appel refusé reçoit un `tool.result` d'erreur explicite (`missing`, `signature`, `expired`, `session`, `claims`, `mismatch`, `replay`, `algorithm`, `key-unavailable`).

  **Désactivé par défaut — aucun changement de comportement tant que rien n'est configuré.** Déploiement progressif `EGEN_AI_SIGNED_CALLS=off → warn → enforce`. Un mode inconnu (faute de frappe) échoue fermé (`enforce`), jamais en `off`. Nouvelles variables relayées par le shell : `EGEN_AI_SIGNED_CALLS`, `EGEN_AI_CHANNEL_JWKS`, `EGEN_AI_CHANNEL_JWKS_URL`, `EGEN_AI_CHANNEL_ALGORITHMS`, `EGEN_AI_CHANNEL_ALLOWED_HOSTS`, `EGEN_AI_ALLOW_INSECURE_CHANNEL`. `validateAIConfig` rejette un JWKS contenant une clé privée ou symétrique, `enforce` sans clé, un algorithme non autorisé.

  **Garde-fou sur la destination du canal (actif par défaut)** : `wss://` obligatoire hors machine locale — **un canal `ws://` vers un hôte distant est désormais refusé** sauf `EGEN_AI_ALLOW_INSECURE_CHANNEL=true` — et épinglage optionnel des hôtes (`api.exemple.ga`, `*.exemple.ga`). Vérifié à chaque (re)connexion ; l'erreur est exposée dans l'état du canal.

  Documentation complète (contrat, exemples Node/Python, génération de clés, rotation, CSP recommandée, limites) dans le README d'`esm-ai-channel`.

## 2.4.1

### Patch Changes

- e716981: Durcissement des tools appelés à distance par le backend IA : `navigate` / `navigate_and_inspect` refusent les destinations externes ; `fetch_data` n'accepte que des chemins d'API relatifs (egenFetch envoyait sinon les credentials vers n'importe quel hôte) ; `download_file` refuse `javascript:` / `data:` et assainit le nom de fichier ; `switch_tenant` valide le slug ; la validation numérique ne convertit plus `''`, `[5]`, `true` en nombre ; les clés `__proto__` / `constructor` ne sont plus transmises ; le masquage des secrets dans les événements fonctionne (clé `apiKey` jamais masquée auparavant) et couvre les objets imbriqués ; des arguments absents ne font plus planter l'exécuteur.

  Correctif : la liste blanche des variables `EGEN_AI_*` du shell ne contenait pas les variables du canal (`EGEN_AI_CHANNEL_URL`, `HEARTBEAT_MS`, `RECONNECT_*`) qui étaient donc ignorées dans le navigateur, et embarquait encore `EGEN_AI_API_KEY`. Elle est resynchronisée et gardée par un test. Le mock de `esm-ai-framework` est aligné sur la config.

  Voir `MIGRATION-AI.md` pour le tableau complet des retraits d'API publique.

## 2.4.0

### Minor Changes

- f939c5e: Arrière-plan de page monté une seule fois, dans le shell. L'état de `page-background` passe d'un contexte React (qui ne traversait pas les racines React des apps) à un store global `@egen-civitas/esm-state` : `<PageBackground>` fonctionne désormais depuis n'importe quelle app, sans provider. Nouveau `renderPageBackground(conteneur)` (appelé par le shell, conteneur `#egen-page-background-container`, rendu vide tant qu'aucune page ne déclare de fond) ; `<GlobalPageBackground>` gagne `fallback="animated" | "none"`. Le démontage d'une page ne libère que son propre fond (un démontage tardif n'efface plus celui de la page suivante) et un changement de props ne repasse plus par le fond par défaut. `<PageBackgroundProvider>` est déprécié et ne fait plus que rendre ses enfants. Styles : le fond de canevas est porté par `html` seul (`body` transparent) pour ne pas masquer l'arrière-plan global.

### Patch Changes

- Updated dependencies [f939c5e]
  - @egen-civitas/esm-styleguide@1.9.0

## 2.3.0

### Minor Changes

- b49f9e8: Suppression définitive de la barre latérale globale : le conteneur `#egen-left-nav-container` est retiré du shell (il n'était plus que masqué) ainsi que ses règles CSS. `LeftNavMenu`, `useLeftNav`, `setLeftNav` et `unsetLeftNav` sont marqués `@deprecated` : la navigation de niveau 2 est portée par la TopBar (slot `topbar-level2-nav`) ; une app qui veut une navigation interne affiche sa propre barre latérale.

### Patch Changes

- Updated dependencies [b49f9e8]
  - @egen-civitas/esm-styleguide@1.8.0
  - @egen-civitas/esm-react-utils@1.0.5
  - @egen-civitas/esm-framework@1.1.4

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
