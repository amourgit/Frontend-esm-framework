# @egen-civitas/esm-routes

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
