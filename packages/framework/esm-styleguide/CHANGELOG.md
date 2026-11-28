# @egen-civitas/esm-styleguide

## 7.2.0

### Minor Changes

- 9adabbe: Migration complète des styles vers les tokens de thème : toutes les couleurs, rayons, ombres, élévations et typographies des composants utilisent désormais les variables CSS du thème (contrat Tweakcn + clés étendues EGEN) avec des replis dérivés du contrat de base. Fini les valeurs en dur : le clair/sombre et les thèmes personnalisés s'appliquent automatiquement à tous les composants.

## 7.1.0

### Minor Changes

- d425388: Restitue les sons d'interface (`playXboxSound`, `toggleXboxAudio`, `isXboxAudioMuted`, type `XboxSoundType`). Ce module de synthèse audio générique se trouvait dans l'ancien dossier `assistant/` et a été supprimé par erreur avec lui ; il est maintenant dans `esm-styleguide/src/ui-sound/`, sans aucun lien avec l'ancienne couche d'assistance. Les apps Annuaire, Informations et Sites l'utilisent.

## 7.0.0

### Major Changes

- b2d283e: Retrait radical de l'ancienne couche d'assistance par agent. Elle était trop rigide et sera reconstruite sur une base saine, selon la nouvelle architecture documentée dans le dépôt Core (dossier de documentation de l'intégration de l'agent).

  - **Packages supprimés** : les sept packages de l'ancienne couche (configuration, canal, contexte, événements, extensions, outils, façade). Le tag `pre-retrait-assistance-2026-11-25` conserve l'état précédent.
  - `esm-framework` : ne ré-exporte plus la façade de l'ancienne couche. **Rupture** pour tout consommateur qui l'importait via `esm-framework`.
  - `esm-styleguide` : le dossier `assistant/` est supprimé (orbe, robot 3D, scène Spline, saisie de prompt, fond d'érosion, modale « verre d'eau », audio), ainsi que les jetons CSS `--ui-*` dédiés à cette couche et les dépendances `three`, `@react-three/fiber`, `@splinetool/*`.
  - `esm-app-shell` : le pont des variables d'environnement de l'ancienne couche vers `window` est supprimé (configuration, gabarit `index.ejs`, bootstrap natif). Le garde-fou des ponts ne porte plus que sur `EGEN_TENANT_*`.
  - `rspack-config` : le préfixe de variable publique de l'ancienne couche est retiré de `PUBLIC_ENV_PREFIXES`.
  - `esm-embed-*` : la capacité d'outils pilotés par un agent est retirée du catalogue du SDK embed (protocole, hôte, client, simulateur et vérificateur de test).

## 6.1.0

### Minor Changes

- d7468a0: Le fond de page animé (`AnimatedHomeBackground`, `DefaultPageBackground`, `GlobalPageBackground`) dérive désormais ses couleurs des tokens du thème (`--background`, `--primary`, `--accent`, `--chart-*`) au lieu de couleurs figées : le dégradé WebGL, le fond de secours et le halo suivent le thème clair/sombre et les surcharges à chaud. Nouvelle dépendance `culori` (même version que `esm-theme`) pour la conversion des couleurs. Le canvas `GradientWave` est remonté via `key` quand la palette change. `esm-app-shell` est republié (patch) car il bundle `esm-styleguide` : le fond dynamique arrive aux applications via la prochaine version du shell.

## 6.0.0

### Major Changes

- cfe1cd4: Fin de la bascule du système de design : le styleguide et le preset Tailwind passent au contrat de variables Tweakcn écrit par `@egen-civitas/esm-theme` 2.

  - `esm-styleguide` : plus aucune variable de l'ancien contrat (`--colors-*`, `--panel-*`, `--typography-*`, `--border-radius-*`…). Les clés sémantiques (`--background`, `--primary`, `--card`, `--border`, `--radius`, `--shadow-*`, `--font-sans`…) viennent du thème ; les échelles dérivées (`--primary-50…950`, `--neutral-*`, `--destructive-*`) et les constantes (`--success-*`, `--warning-*`, `--info-*`, `--secondary-*`, `--radius-*`, `--transition-*`, `--z-*`, `--text-*`…) sont déclarées une seule fois dans `styles.css`. Le mode sombre est la classe `dark` sur la racine (et non plus un attribut). Les composants « verre » et les propriétés `glass` sont conservés avec la même API, rendus sur des surfaces pleines du thème.
  - `tailwind-preset` : les utilitaires sont rattachés aux variables du thème par `@theme inline` (les auto-références qui ne pouvaient pas fonctionner sont supprimées) ; échelle `secondary-*` complète ; le variant `dark:` suit désormais la classe `dark` au lieu de la préférence système du navigateur.
  - `esm-ai-tools` : l'état de page expose `theme.isDark` (booléen, lu sur la classe `dark`) à la place de `theme.dataTheme`.

## 5.2.7

### Patch Changes

- 5b7c17e: `SiteTabbedLayout` : hauteur `h-[calc(100vh-120px)]` + marges verticales
  remplacées par `h-full my-0`. Le calcul viewport ne correspondait pas à la
  hauteur réelle de `#egen-scroll-region` et produisait un débordement
  (~18 px) ; la hauteur vient désormais de la chaîne `data-egen-fill`.

## 5.2.6

### Patch Changes

- 18c217c: Rend le remplissage en hauteur de `#egen-scroll-region` opt-in : la règle
  `#egen-apps-container > div:has(> *) { min-height: 100% }` forçait chaque
  conteneur single-spa non vide — y compris les apps globales montées en
  permanence (`route: true`) qui rendent un contenu vide ou non bloquant — à
  occuper 100 % de la hauteur de la zone, ce qui doublait le débordement.
  Désormais, seul un conteneur dont l'enfant racine porte `data-egen-fill`
  reçoit `height: 100%` ; les autres gardent une hauteur automatique.

## 5.2.5

### Patch Changes

- 8053ebd: Hauteur de la zone de scroll propagée aux applications : `#egen-apps-container` prend désormais `height: 100%` de `#egen-scroll-region` (avec `min-height: 400px`) et ne clippe plus le débordement (`overflow: visible`), ce qui fait de `#egen-scroll-region` le scroller unique. Les racines d'apps montées (`div#single-spa-application:*` non vides) reçoivent `min-height: 100%`, rendant `height: 100%` résolvable jusqu'à la racine de l'app — une app peut remplir la zone en temps réel au lieu de déborder. `overflow-x` de la zone passe de `hidden` à `auto` pour laisser remonter le débordement horizontal. Shell reconstruit pour embarquer le styleguide à jour.

## 5.2.4

### Patch Changes

- 99d1025: `@egen-civitas/esm-framework/mock` (et `mock-jest`) ré-exportent les composants de base du module style (`Button`, `Tile`, `Dialog`, `Table`…) : les tests des apps rendent les vrais composants (Tailwind, sans effet de bord). Pour cela, `@egen-civitas/esm-styleguide` expose un sous-chemin `./ui`.

## 5.2.3

### Patch Changes

- 939b9aa: `PasswordInput` et `SearchInput` transmettent leur `ref` à l'`<input>` (compatibilité `react-hook-form`, focus programmatique).

## 5.2.2

### Patch Changes

- 89eaf51: Correctif : les composants de base (`Button`, `Tile`, `Dialog`, `Table`, `Checkbox`…) étaient exportés par `public.ts` mais pas par le point d'entrée principal du package (`internal.ts`, celui que résolvent `@egen-civitas/esm-styleguide` et `@egen-civitas/esm-framework`) : ils étaient introuvables à l'import. Ils sont maintenant exportés des deux côtés, avec un test qui verrouille les deux points d'entrée.
- 0605af5: `Link` (composant de lien de texte) est renommé `TextLink` : le nom `Link` entrait en conflit avec le type `Link` d'`@egen-civitas/esm-api`, ce qui faisait échouer la construction d'`@egen-civitas/esm-framework` (qui ré-exporte les deux). `TextLinkProps` remplace `LinkProps`.

## 5.2.1

### Patch Changes

- fe80ed2: `Button`, `IconButton`, `Link`, `Input`, `TextInput` et `Badge` transmettent maintenant leur `ref` (`forwardRef`). Sous React 18, les composants fonction ignorent `ref` : sans cela, les composants Radix en `asChild` (infobulle de `IconButton`, déclencheurs de menu ou de dialogue) ne pouvaient pas s'ancrer sur le bouton, et les `ref` posées sur ces composants étaient perdues.

## 5.2.0

### Minor Changes

- c995661: Nouveaux composants de base 100 % Tailwind : `RadioGroup` / `RadioGroupItem` (copiés de shadcn/ui, MIT ; accessibilité via Radix) et `SearchInput` (champ de recherche avec loupe, bouton « effacer » et `Échap` pour vider).

## 5.1.0

### Minor Changes

- 03dcc6f: Nouveaux composants de base 100 % Tailwind, pour finir le retrait de Carbon dans le core : `Checkbox`, `Accordion` (+ `AccordionItem`, `AccordionTrigger`, `AccordionContent`), `Skeleton` (copiés de shadcn/ui, MIT), `PasswordInput` (champ mot de passe avec bouton œil), `MenuList` / `MenuItem` / `MenuDivider` (liste d'actions d'un panneau, remplace `Switcher`) et `StructuredList` (+ `StructuredListHead`, `StructuredListBody`, `StructuredListRow`, `StructuredListCell`).

## 5.0.0

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

- ad4ee68: Retrait de Carbon, phase 2 : composants à comportement 100 % Tailwind (copiés de shadcn/ui, MIT ; accessibilité via Radix) : `Dialog` (+ `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`…), `DropdownMenu` (+ items, cases, radios, sous-menus), `Tabs`, `Table` et `Alert` (+ `AlertTitle`, `AlertDescription`, variantes d'état `info` / `success` / `warning` / `error` ajoutées pour les notifications). Chacun est testé (ouverture, fermeture avec Échap, clavier, rôles ARIA).
- 3e0ab01: Premiers composants de base 100 % Tailwind, sans Carbon ni SCSS (chantier de retrait de Carbon, phase 0 et 1) : `Button`, `IconButton`, `Link`, `Badge`, `Separator`, `Label`, `Input`, `TextInput`, `Switch`, `Spinner`, `InlineLoading`, `Layer`, `Tooltip` et `Tile` (+ `TileHeader`, `TileTitle`, `TileDescription`, `TileAction`, `TileContent`, `TileFooter`), exportés par `@egen-civitas/esm-styleguide`, avec l'utilitaire `cn` (clsx + tailwind-merge). Code copié de shadcn/ui (MIT, avis dans `THIRD_PARTY_NOTICES.md`) puis adapté ; comportements accessibles via Radix. Ils lisent les jetons de thème existants (`bg-primary`, `bg-card`, `border-input`…), donc suivent le moteur de thème.

  `@egen-civitas/tailwind-preset` importe désormais `tw-animate-css` (classes `animate-in`, `fade-in-0`, `zoom-in-95`…, requises par les infobulles et bientôt les menus et modales).

  Garde-fou : un test d'architecture (`zero-carbon.architecture.test.ts`) interdit tout nouvel import Carbon ou fichier `.scss` ; sa liste blanche (`carbon-scss-allowlist.json`, 88 fichiers) ne peut que rétrécir.

## 4.1.0

### Minor Changes

- 74f778d: Conformité à la TopBar neutre du core (niveaux déclarés par les apps).

  - `esm-extensions` : nouveau `TOPBAR_SLOT` (`topbar-slot`, seul slot d'extension de la TopBar) et types `TopBarPlacementMeta` / `TopBarRegion` / `TopBarContentRegion` pour la déclaration `meta.topbar` (niveau, rang, région, ordre, before/after). Retrait de `TOPBAR_LEVEL2_NAV_SLOT` et `TOPBAR_NAV_SLOTS` : le slot de navigation est uniquement `TOPBAR_NAV_SLOT` (`topbar-nav-slot`).
  - `esm-styleguide` : `SectionNavPanel` ne lit plus l'ancien slot `topbar-level2-nav`.
  - `esm-framework` : mocks alignés. `esm-app-shell` : documentation du layout-sync sans notion de niveau figé.

### Patch Changes

- Updated dependencies [340f5fe]
- Updated dependencies [74f778d]
  - @egen-civitas/esm-globals@2.2.0
  - @egen-civitas/esm-extensions@2.5.0

## 4.0.0

### Major Changes

- 5958a56: Framework neutre : suppression des derniers résidus hospitaliers (FHIR, patients, établissement de santé).

  Retirés :

  - `esm-api` : `fhirBaseUrl` et le traitement spécifique des URL FHIR (`_summary=data`) dans `egenFetch`.
  - `esm-data-api` : type `FHIRLocationResource`.
  - `esm-styleguide` : composant `LocationPicker` (basé sur l'API FHIR `Location` et le tag « Login Location ») ; pictogrammes médicaux `AppointmentsPictogram`, `AppointmentsAltPictogram`, `Assessment1Pictogram`, `Assessment2Pictogram`, `FacilityPictogram`, `RegistrationPictogram` (identifiants `egen-pict-appointments`, `-assessment-1`, `-assessment-2`, `-facility`, `-registration`) ; icônes `GenderFemaleIcon`, `GenderMaleIcon`, `GenderOtherIcon`, `GenderUnknownIcon`.
  - `esm-translations` : clés `errorLoadingLoginLocations`, `searchForLocation` et clés orphelines patient/clinique (`Clinic`, `patientAvatarAlt`, `patientIdentifierSticker`, `patientLists`, `patientPhotoAlt`, `patientPhotoPlaceholder`, `seeMoreLists`) dans toutes les langues.

  Ajouté : `HomePictogram` est désormais un pictogramme de maison neutre (`egen-pict-home`) au lieu d'un alias du bâtiment d'hôpital.

  Vocabulaire neutre dans la documentation, les exemples, les stories et les tests (patient, médicaments, rendez-vous, pharmacie remplacés).

### Patch Changes

- 478e80c: Cible native : démarrage compatible avec la CSP `script-src 'self'`.

  - `esm-app-shell` : en natif, le thème anti-FOUC, les ponts `window.egen*` et `initializeSpa` sont émis comme fichiers (`bootstrap-head.<hash>.js`, `bootstrap.<hash>.js`) ; les `onclick` du gabarit d'erreur deviennent `data-egen-action` ; la `<meta>` CSP issue de la cible est posée. Le HTML Web est inchangé (octet pour octet). Les sources `tools/targets.js` et `tools/bootstrap.js` sont publiées pour `egen build`.
  - `esm-styleguide` : `SplineScene` (runtime 3D, qui génère du code et compile du WebAssembly) ne charge rien en natif et rend un conteneur vide ; `preloadSplineScene` ne télécharge plus rien en natif. Web inchangé.

- Updated dependencies [d1d2d7d]
- Updated dependencies [669cbd6]
- Updated dependencies [b3d9419]
- Updated dependencies [5958a56]
  - @egen-civitas/esm-globals@2.1.0
  - @egen-civitas/esm-routes@1.2.0
  - @egen-civitas/esm-api@3.0.0
  - @egen-civitas/esm-translations@1.0.4
  - @egen-civitas/esm-data-api@3.0.0
  - @egen-civitas/esm-react-utils@3.0.1
  - @egen-civitas/esm-extensions@2.4.1

## 3.3.0

### Minor Changes

- 3d304d5: Slot de navigation de la TopBar sans numéro de niveau : nouvelle constante `TOPBAR_NAV_SLOT` (`topbar-nav-slot`) et `TOPBAR_NAV_SLOTS` (tous les noms à lire, officiel d'abord). `TOPBAR_LEVEL2_NAV_SLOT` (`topbar-level2-nav`) est conservée, marquée `@deprecated`, et reste honorée : `SectionNavPanel` lit les deux slots (sans doublon). Les apps migrent leur `routes.json` vers le nouveau nom quand elles veulent ; aucune rupture.

### Patch Changes

- Updated dependencies [3d304d5]
  - @egen-civitas/esm-extensions@2.4.0

## 3.2.0

### Minor Changes

- 86b6c2c: `StaggeredMenuPanel` : bouton de fermeture discret (petit, translucide) dans le coin du panneau, en plus du clic à côté. Il est positionné par rapport au panneau, pas à l'écran : en haut à droite pour `position="right"`, en haut à gauche pour `position="left"`. Il apparaît une fois le panneau ouvert. Nouvelles props `showCloseButton` (défaut : affiché dès qu'`onClose` est fourni) et `closeButtonLabel`.
- 0afcb05: `StaggeredMenuPanel` accepte des composants libres posés par les apps, comme les rails. Nouveau slot `staggered-menu-slot` (`STAGGERED_MENU_SLOT`) : une extension y déclare dans sa `meta` sa zone (`top`, `content`, `bottom`), son `order`, sa `priority`, `global` (visible quelle que soit l'app active ; sinon seulement quand son app est montée), `showTitle`, `titleKey`. Nouveaux exports : `registerStaggeredMenuEntry` (déclaration par le code), `resolveStaggeredMenuEntries`, `isStaggeredMenuEntryMeta`, `getStaggeredMenuEntryProblems`, `useStaggeredMenuEntries` et les types associés. Nouvelles props du panneau : `extensionSlot` (slot dédié ou `false`) et `maxExtensions` (limite par priorité). Le contenu est chargé à la première ouverture ; chaque composant reçoit `closeMenu`, `position` et `isOpen` en props ; un clic dans un menu/dialogue ouvert par un composant ne ferme plus le panneau (`closeOnClickAway`) ; le panneau fermé est `inert`. Aucun changement pour les usages existants.

### Patch Changes

- Updated dependencies [0afcb05]
  - @egen-civitas/esm-extensions@2.3.0

## 3.1.0

### Minor Changes

- fa07dbd: Compartiments verticaux dans les zones gauche et droite. Chaque zone devient une pile de compartiments dont les hauteurs (en % de la zone) totalisent toujours 100 : aucun débordement, contenu défilant en interne, redimensionnement libre entre voisins (les autres s'ajustent selon leurs minimum et maximum). La zone actuelle devient le compartiment par défaut (dimensions fixées par le shell) et porte désormais le fond sombre à la place de la zone. Une app choisit, dans la `meta` de son option de rail, d'afficher dans le compartiment par défaut ou dans un compartiment propre via `meta.compartment` (`{ height, minHeight, maxHeight }` en %, valeurs par défaut `DEFAULT_COMPARTMENT_HEIGHTS`). Nouveaux exports : `getToolWindowCompartment`, `DEFAULT_COMPARTMENT_HEIGHTS`, `ToolWindowCompartment`, `closeToolWindow(anchor, id?)` pour fermer un seul compartiment.

### Patch Changes

- Updated dependencies [fa07dbd]
  - @egen-civitas/esm-extensions@2.2.0

## 3.0.0

### Major Changes

- 159db44: Framework généraliste : suppression de la couche clinique héritée d'un autre projet (patients, FHIR, santé).

  Retirés :
  - `esm-styleguide` : `EntityBanner*`, `EntityPhoto`/`useEntityPhoto`, `NumericDataPoint`, 17 pictogrammes de départements hospitaliers (labo, pharmacie, cardiologie, radio, triage, patients…) et 15 icônes cliniques (seringue, lit d'hôpital, ordres médicaux…), clés de config `entityPhotoConceptUuid`, `contactAttributeTypes`, `excludeEntityIdentifierCodeTypes`.
  - `esm-react-utils` : `useEntity`, `usePrimaryIdentifierResource`, `useFhirFetchAll`, `useFhirInfinite`, `useFhirPagination` (utiliser `useEgenFetchAll`, `useEgenInfinite`, `useEgenPagination`).
  - `esm-data-api` : `getCurrentEntity`/`CurrentEntity`, types FHIR (`FHIRResource`, `FHIRCode`, `fhir.*`), `Task`, `CatalogItem` ; `DataPoint` et `Classification` utilisent `ReferenceTerm` au lieu de `Concept`.
  - `esm-api` : types `Concept*` remplacés par `ReferenceTerm` ; champs cliniques de `Person` (décès).
  - `esm-config` : types `ConceptUuid`, `PersonAttributeTypeUuid`, `EntityIdentifierTypeUuid`.
  - `esm-utils` : `getEntityName`, `formatEntityName`, `selectPreferredName` (noms FHIR) ; `esm-globals` : `NameUse`.
  - Dépendance `@types/fhir` retirée.

### Minor Changes

- 75af6f5: Robot assistant 3D complet : corps articulé (37 articulations), 17 gestes, marche et pas en tournant sur place, regard, clignement, mains à 5 doigts, IK des bras, états de l'assistant (écoute, réflexion, parole). Nouveaux exports `AssistantRobotScene`, `preloadAssistantRobot`, `RobotController`, `GESTURE_NAMES` et types associés ; `three` et `@react-three/fiber` sont chargés à la demande.
- cf941e7: Plan de travail : poignées d'angle à l'intersection de trois zones (latérale / centre / bas). Le curseur « déplacement » apparaît au croisement des frontières et un seul geste redimensionne les deux axes (largeur de la zone gauche ou droite + hauteur de la zone basse) ; double-clic = tailles par défaut. Les poignées linéaires existantes sont inchangées.
- 4c84714: Le styleguide ne porte plus aucun logo : suppression du sprite SVG (`#egen-logo-full-color`, `#egen-logo-icon-color`, `#egen-logo-partial-color`, `#egen-logo-white`) — en réalité un ancien logo hérité d'un autre projet —, de sa palette SCSS (`--logo-*`) et de `setupLogo()` (interne). Le framework reste générique et neutre : l'identité visuelle appartient au projet client, qui affiche son logo comme une image ordinaire. **À savoir** : tout consommateur qui référençait ces identifiants de sprite doit migrer vers son propre logo.
- 8a39e13: Rails et zones ouverts aux apps distantes/fédérées : `ToolWindowMeta.iconUrl` (icône personnalisée sûre, rendue en masque monochrome), `getToolWindowMetaProblems` + avertissement précis à l'enregistrement quand une `meta` de rail est invalide (plus d'entrée ignorée en silence), `registerToolWindow` (déclaration par le code, sans `routes.json`), `openToolWindow` (ouverture sans bascule). Guide : `packages/framework/esm-extensions/TOOL-WINDOWS.md`.

### Patch Changes

- fc70c70: Cartes du plan de travail (zones + centre) légèrement plus sombres, toujours translucides : 16 % → 24 % de noir (thème sombre), 5 % → 8 % (thème clair).
- Updated dependencies [8a39e13]
- Updated dependencies [159db44]
  - @egen-civitas/esm-extensions@2.1.0
  - @egen-civitas/esm-routes@1.1.0
  - @egen-civitas/esm-api@2.0.0
  - @egen-civitas/esm-data-api@2.0.0
  - @egen-civitas/esm-config@2.0.0
  - @egen-civitas/esm-react-utils@3.0.0
  - @egen-civitas/esm-utils@2.0.0
  - @egen-civitas/esm-globals@2.0.0
  - @egen-civitas/esm-translations@1.0.3
  - @egen-civitas/esm-state@1.0.3
  - @egen-civitas/esm-error-handling@1.0.2
  - @egen-civitas/esm-navigation@1.0.2

## 2.3.1

### Patch Changes

- 450752c: `LiveOrb` : la tête est agrandie d'environ 9 % dans sa boîte (nouvelle constante exportée `HEAD_ZOOM = 1.09`). Le zoom est appliqué à toute la scène (caméra du shader, et conteneur du repli sans GPU) : crâne, yeux, trait, oreillettes et halo grandissent du même facteur, donc les proportions mesurées sur la mascotte restent identiques. Le halo néon et la rotation maximale de la tête restent dans le cadre.

## 2.3.0

### Minor Changes

- 477171f: `LiveOrb` devient une **tête 3D de type Baymax** au lieu d'une sphère : crâne large et arrondi, deux yeux ovales reliés par un trait fin, et deux oreillettes de casque avec anneau lumineux vert → jaune. Les proportions ont été mesurées sur la mascotte EGEN (rapport largeur/hauteur de la tête ≈ 1 : 0,74, yeux ≈ 3,7 fois leur largeur d'écart, trait ≈ 15 % de la hauteur d'un œil).

  - **Rendu** : un seul fragment shader raymarché (scène SDF : crâne ellipsoïdal, oreillettes à cuvette creuse + anneau néon, raccord doux). Éclairage fixe dans le monde (ombres douces, occlusion ambiante, reflet), halo néon, silhouette anti-crénelée.
  - **La tête pivote** vers le pointeur (lacet, tangage, léger roulis) avec un ressort amorti pour un mouvement de cou naturel, et un très léger balancement au repos. Les yeux, le trait et les oreilles sont solidaires du crâne : ils épousent sa courbure et se déforment en perspective quand il tourne. Le clignement écrase les yeux, le trait reste.
  - **Suivi du pointeur** par angle (et non plus saturé à quelques pixels du centre), donc fluide même pour un avatar de 38 px ; retour à la pose neutre quand le pointeur quitte la fenêtre.
  - **Repli sans GPU** refait dans le même design (tête, yeux, trait, oreilles à dégradé néon) avec un léger parallaxe vers le pointeur ; il ne dépend plus d'aucune classe Tailwind.
  - **Robustesse** : la boucle de rendu se met en pause hors écran / onglet masqué, et une perte de contexte WebGL bascule sur le repli.
  - **API rétro-compatible** : `variant` (`white`, `black`, `webgl`, `custom`), `color`, `eyeColor`, `colors`, `interactive`, `blink`, `size`, `className` sont inchangés, donc tous les usages existants (avec leurs variantes) sont mis à jour sans modification. Nouveautés : `ears` (défaut `true`), `earColors` (deux couleurs, défaut vert → jaune ; la matière `webgl` réutilise sa palette), `label` (nom accessible, défaut `Assistant avatar`). `createLiveOrb` accepte les mêmes options ; `headRotation` est exporté depuis le module.

  Le shell est republié pour embarquer cette version du styleguide.

## 2.2.0

### Minor Changes

- 1ffdcd4: `SectionSlot` : une page expose un slot d'extensions (`<SectionSlot name="home-sections" />`) et chaque app y branche sa propre `Section` depuis son `routes.json`. Les en-têtes de section sont **collants** : l'en-tête reste en haut de la zone de défilement tant que le corps de sa section est visible, puis la section suivante prend le relais. Le mode passe par des variables CSS héritées (`--section-header-position`, `--section-sticky-top`, `--section-sticky-z`, `--section-sticky-bg`), donc il traverse les parcels single-spa sans contexte React partagé.

  `Section` gagne `stickyHeader`, `stickyOffset` et `stickyZIndex` (hérités du `SectionSlot` quand absents ; `stickyHeader={false}` pour s'en exempter). Nouveaux exports : `SectionSlot`, `SectionCard`, `SectionCardTitleButton`, `SECTION_CARD_CLASS`, `stickyStyleVars`, `STICKY_VARS`. Le shell est republié pour embarquer cette version du styleguide.

## 2.1.1

### Patch Changes

- b6c977c: Correction : `Section`, `SectionAction`, `SectionGrid` (et leurs parties) n'étaient exportés que par `public.ts` ; le point d'entrée réel du package (`internal.ts`) ne les exposait pas, donc `import { Section } from '@egen-civitas/esm-framework'` valait `undefined` à l'exécution et ne typait pas. Les deux points d'entrée les exportent désormais, avec un test garde-fou.

## 2.1.0

### Minor Changes

- d5c883a: Zones : l'en-tête expose un emplacement d'actions entre le titre et le bouton de fermeture, alimenté par le composant `ToolWindowHeader` (portail) depuis le contenu d'une fenêtre d'outils. Rendu sur place hors zone.

## 2.0.0

### Major Changes

- b8a56e7: Suppression complète de l'ancienne barre latérale (sidebar) : plus aucune app ne peut la monter. La navigation passe par les rails et zones du shell (`shell-rail-left-slot`, `shell-rail-bottom-slot`, `shell-rail-right-slot`) et la TopBar niveau 2 (`topbar-level2-nav`).

  Retirés : `LeftNavMenu`, `setLeftNav`, `unsetLeftNav`, `SetLeftNavParams`, `LeftNavStore`, `useLeftNav`, `useLeftNavStore`, `DashboardExtension`, `createDashboard` (lien de sidebar), la variable `--egen-sidenav-width`, les styles `.cds--side-nav*` / `.active-left-nav-link`, la clé de traduction `leftNavigation` et les alias `side-nav` / `sidenav` de `esm-ai-tools`.

### Patch Changes

- Updated dependencies [b8a56e7]
  - @egen-civitas/esm-react-utils@2.0.0
  - @egen-civitas/esm-extensions@2.0.0
  - @egen-civitas/esm-translations@1.0.2
  - @egen-civitas/esm-routes@1.0.3

## 1.17.0

### Minor Changes

- 0978f93: Rails : le rail droit porte aussi un groupe bas ; `ToolWindowMeta.rail` ('left' par défaut | 'right') choisit le rail d'une option de la zone basse (pleine largeur entre les rails).
- 5e15585: Ajout du squelette `Section` (Tailwind) : en-tête / corps / pied séparés par un trait fin sans bordure ni fond, dispositions configurables (`headerLayout`, `footerLayout`), repli optionnel, `classNames` par partie et variables CSS `--section-*`. Livré avec `SectionAction` (boutons de contrôle / filtres) et `SectionGrid` (grille responsive par colonnes ou par largeur minimale de carte). `ContentSection` est conservé et marqué `@deprecated`.

### Patch Changes

- Updated dependencies [0978f93]
- Updated dependencies [ac88343]
  - @egen-civitas/esm-extensions@1.5.0
  - @egen-civitas/esm-globals@1.0.3

## 1.16.0

### Minor Changes

- f3bdd5e: Animations et loader : bibliothèque d'animations SCSS (classes `egen-anim-*`, mixins, tokens de mouvement), ouverture/fermeture animées des zones du plan de travail, entrée animée du contenu des pages, loader EGEN réutilisable (`Loader`, `showPageLoader`, `usePageLoading`) retenu pendant le chargement des pages.

## 1.15.0

### Minor Changes

- af95904: Rail gauche : options globales avec sous-options.

  - `ToolWindowMeta.global` : une extension du slot `shell-rail-left-slot` (ou `shell-rail-bottom-slot`) déclarée avec `meta.global: true` reste affichée dans le rail quelle que soit l'app active, comme le rail droit. Sans ce drapeau, le comportement est inchangé (seules les extensions de l'app active apparaissent).
  - Nouveau composant `SectionNavPanel` (`section`) : contenu prêt à l'emploi d'une option globale. Il liste, dans la zone gauche, les sous-options d'une section (entrées `NavEntryMeta` déclarées par l'app sur `topbar-level2-nav`), regroupées par `group`, avec icône, et navigue vers la route de la sous-option au clic ; la sous-option de la page courante est marquée active. La zone centrale se met à jour par la navigation habituelle.
  - Liste blanche d'icônes du plan de travail étendue (`Calendar`, `CalendarCheck`, `Compass`, `Contact`, `FileCheck`, `FileText`, `Globe`, `Layers`, `Radio`, `Star`, `Zap`).

### Patch Changes

- Updated dependencies [af95904]
  - @egen-civitas/esm-extensions@1.4.0

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
