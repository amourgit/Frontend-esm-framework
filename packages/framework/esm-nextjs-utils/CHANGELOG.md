# @egen-civitas/esm-nextjs-utils

## 0.2.0

### Minor Changes

- 0371cd7: Nouveau paquet `esm-nextjs-utils` : intégration d'applications autonomes (Next.js, SSR, routeur propre) par iframe et pont `postMessage` sécurisé. `getEmbedLifecycle` / `getSyncLifecycle` côté Shell (langue, session filtrée sans `sessionId`, navigation limitée aux chemins internes, hauteur, titre) ; `createEgenBridge` (entrée `/client`) côté application embarquée. Origines explicites obligatoires, jamais « * ».

### Patch Changes

- Updated dependencies [d9b2c40]
- Updated dependencies [f71c7f8]
  - @egen-civitas/esm-globals@2.5.0
  - @egen-civitas/esm-integration-utils@0.2.0
