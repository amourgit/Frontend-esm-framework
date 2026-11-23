# @egen-civitas/esm-nextjs-utils

## 0.3.1

### Patch Changes

- 1d47a26: L'iframe créée par `getEmbedLifecycle` porte désormais `data-egen-fill` :
  le conteneur single-spa reçoit `height: 100%` de `#egen-scroll-region`
  (règle opt-in du styleguide), sans travail requis côté application
  embarquée.

## 0.3.0

### Minor Changes

- 3f171d9: Navigation partagée Shell ↔ application embarquée (protocole 1.1, additif) : l'URL du Core reflète la page courante de l'app (actualisation, retour/avance, partage).

  - Hôte : option `navigation` de `getEmbedLifecycle` (`route`, `mode` `history` | `hash` | `none`, `sensitiveParams`, `pathMap`, `onTitle`) ; messages `hello`, `location`, `goto`.
  - Client : `reportLocation()` et `onGoto()`.
  - Script injectable sans dépendance `assets/egen-bridge.js` (export `@egen-civitas/esm-nextjs-utils/egen-bridge.js`).
  - Fonctions pures exportées (`normalizeAppPath`, `stripSensitive`, `coreSubpath`, `buildCoreUrl`, `buildEmbedSrc`…). Paramètres sensibles jamais recopiés dans l'URL du Core.
  - Sans l'option `navigation`, comportement inchangé.

## 0.2.0

### Minor Changes

- 0371cd7: Nouveau paquet `esm-nextjs-utils` : intégration d'applications autonomes (Next.js, SSR, routeur propre) par iframe et pont `postMessage` sécurisé. `getEmbedLifecycle` / `getSyncLifecycle` côté Shell (langue, session filtrée sans `sessionId`, navigation limitée aux chemins internes, hauteur, titre) ; `createEgenBridge` (entrée `/client`) côté application embarquée. Origines explicites obligatoires, jamais « * ».

### Patch Changes

- Updated dependencies [d9b2c40]
- Updated dependencies [f71c7f8]
  - @egen-civitas/esm-globals@2.5.0
  - @egen-civitas/esm-integration-utils@0.2.0
