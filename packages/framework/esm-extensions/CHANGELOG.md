# @egen-civitas/esm-extensions

## 1.2.1

### Patch Changes

- bd97b0e: Correctif de 1.2.0 : `registerNavBehavior` et `getNavBehavior` (ainsi que les types `NavBehavior`, `NavBehaviorTarget`, `NavSelectContext`) étaient documentés dans l'API publique mais absents du point d'entrée du package, donc inutilisables par les apps. `esm-extensions` les exporte désormais, et `esm-framework` les réexporte. Un test vérifie que chaque module de l'API publique (`public.ts`) est bien exporté par `index.ts`.

## 1.2.0

### Minor Changes

- 6700454: Navigation de niveau 2 de la TopBar : contextualisation par espace et surcharge de comportement par app (changements additifs, sans rupture).

  - `NavEntryMeta.workspaces` : espaces (`intranet`, `extranet`…) où l'entrée apparaît ; absent, vide ou `'*'` = tous. Nouveau helper `isNavEntryInWorkspace` et constante `NAV_ALL_WORKSPACES`.
  - `NavEntryMeta.group` devient facultatif : une entrée sans `group` est un lien simple (une section à entrée unique devient un bouton direct, sans menu déroulant).
  - `NavEntryMeta.sectionRoute` : route du bouton de la section lui-même.
  - `registerNavBehavior({ entry } | { section }, { onSelect })` / `getNavBehavior` : une app remplace (ou enrichit via `ctx.runDefault()`) la logique globale appliquée au clic sur son bouton de navigation.
  - Mocks `esm-framework` (`mock` et `mock-jest`) : `registerNavBehavior`, `getNavBehavior` et réexport des constantes/validateurs purs.

## 1.1.1

### Patch Changes

- b49f9e8: Suppression définitive de la barre latérale globale : le conteneur `#egen-left-nav-container` est retiré du shell (il n'était plus que masqué) ainsi que ses règles CSS. `LeftNavMenu`, `useLeftNav`, `setLeftNav` et `unsetLeftNav` sont marqués `@deprecated` : la navigation de niveau 2 est portée par la TopBar (slot `topbar-level2-nav`) ; une app qui veut une navigation interne affiche sa propre barre latérale.

## 1.1.0

### Minor Changes

- 48e7980: Navigation de niveau 2 pilotée par les apps : nouveau type partagé `NavEntryMeta`, constante `TOPBAR_LEVEL2_NAV_SLOT` (`topbar-level2-nav`) et validateur `isNavEntryMeta` dans `esm-extensions`. La colonne de navigation latérale globale (`leftNav`) est retirée de la grille du shell : seuls la TopBar et le footer sont globaux ; une app qui veut une sidebar la fournit dans son propre contenu.

## 1.0.2

### Patch Changes

- c82f723: Corrige une série de dépendances manquantes/mal déclarées trouvées en débloquant la CI (l'installation était bloquée depuis fin août, masquant ces problèmes) :

  - `esm-tenant` : `happy-dom` manquait alors que ses tests l'utilisent (ni dep, ni peerDep) → ajouté en devDependency.
  - `esm-ai-tools` : `swr` est chargé via un `import()` dynamique dans `native/index.ts` mais n'était déclaré nulle part → ajouté en peerDependency (`2.x`, cohérent avec `esm-styleguide`/`esm-react-utils`/`esm-framework`).
  - `esm-api`, `esm-data-api` : `rxjs` utilisé au runtime mais absent de peerDependencies → ajouté (`7.x`).
  - `esm-navigation`, `esm-styleguide`, `esm-react-utils` : `single-spa` utilisé au runtime mais absent de peerDependencies → ajouté (`6.x`).
  - `esm-extensions` : `react` utilisé au runtime mais absent de peerDependencies → ajouté (`18.x`).
  - `esm-ai-framework` : `framework.test.ts` faisait `require('@egen-civitas/esm-ai-tools')` en plein milieu du corps de 3 tests (au lieu d'un import statique en haut de fichier) — ce require contournait le mock de `@egen-civitas/esm-styleguide` et déclenchait une résolution Node native qui tentait de charger pour de vrai des fichiers `.module.scss` compilés (`Unknown file extension ".scss"`). Remplacé par un import statique de `hasTool`/`getTool`/`overrideTool`, et ajout d'un `vi.mock('@egen-civitas/esm-styleguide', ...)` en tête de fichier (même pattern déjà utilisé dans `esm-ai-tools/src/native/native.test.ts`).

  Tous les fixes vérifiés par reproduction isolée réelle (installation + exécution effective des tests concernés), pas seulement par lecture de code.

- Updated dependencies [c82f723]
  - @egen-civitas/esm-api@1.1.1
