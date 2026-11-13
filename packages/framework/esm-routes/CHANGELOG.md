# @egen-civitas/esm-routes

## 1.3.0

### Minor Changes

- 12be954: Schéma JSON de `routes.json` (F3) publié avec le package (`@egen-civitas/esm-routes/routes.schema.json`) : pages, extensions, modals, workspaces, feature flags, dépendances backend, et les champs du contrat multiplateforme (`platforms`, `requiredCapabilities`, `frameworkRange`). Rejette les clés inconnues.
- cc6cd1a: Compatibilité vérifiable entre apps et framework (F4) : `routes.json` est estampillé avec `frameworkRange` (peerDependency valide sur `esm-framework`) ; `registerApp` écarte au démarrage, en le journalisant, une app dont la plage n'est pas satisfaite par le framework du shell. `esm-globals` : type `BuildManifest` et `validateBuildManifest()`. Une app sans `frameworkRange` (ancien format) reste acceptée.

### Patch Changes

- Updated dependencies [cc6cd1a]
  - @egen-civitas/esm-globals@2.4.0

## 1.2.0

### Minor Changes

- d1d2d7d: Contrat d'app multiplateforme (F2) : `EgenAppRoutes.platforms` et `requiredCapabilities`. `registerApp` écarte (sans rien enregistrer) une app non éligible à la plateforme ou dont une capacité requise manque. `esm-globals` : `setCapabilityResolver` / `hasCapability`. `esm-platform` : `registerPlatformCapabilities()`. Shell : capacités rendues consultables avant l'enregistrement des apps. Sans champs dans `routes.json`, comportement inchangé.

### Patch Changes

- Updated dependencies [d1d2d7d]
- Updated dependencies [669cbd6]
- Updated dependencies [5958a56]
  - @egen-civitas/esm-globals@2.1.0
  - @egen-civitas/esm-dynamic-loading@2.1.0
  - @egen-civitas/esm-extensions@2.4.1

## 1.1.0

### Minor Changes

- 8a39e13: Rails et zones ouverts aux apps distantes/fédérées : `ToolWindowMeta.iconUrl` (icône personnalisée sûre, rendue en masque monochrome), `getToolWindowMetaProblems` + avertissement précis à l'enregistrement quand une `meta` de rail est invalide (plus d'entrée ignorée en silence), `registerToolWindow` (déclaration par le code, sans `routes.json`), `openToolWindow` (ouverture sans bascule). Guide : `packages/framework/esm-extensions/TOOL-WINDOWS.md`.

### Patch Changes

- Updated dependencies [8a39e13]
- Updated dependencies [159db44]
  - @egen-civitas/esm-extensions@2.1.0
  - @egen-civitas/esm-config@2.0.0
  - @egen-civitas/esm-utils@2.0.0
  - @egen-civitas/esm-globals@2.0.0
  - @egen-civitas/esm-dynamic-loading@2.0.1
  - @egen-civitas/esm-feature-flags@1.0.2

## 1.0.3

### Patch Changes

- Updated dependencies [b8a56e7]
  - @egen-civitas/esm-extensions@2.0.0

## 1.0.2

### Patch Changes

- Updated dependencies [25b41d1]
  - @egen-civitas/esm-dynamic-loading@2.0.0
