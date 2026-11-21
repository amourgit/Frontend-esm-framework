---
'@egen-civitas/esm-nextjs-utils': minor
---

Nouveau paquet `esm-nextjs-utils` : intégration d'applications autonomes (Next.js, SSR, routeur propre) par iframe et pont `postMessage` sécurisé. `getEmbedLifecycle` / `getSyncLifecycle` côté Shell (langue, session filtrée sans `sessionId`, navigation limitée aux chemins internes, hauteur, titre) ; `createEgenBridge` (entrée `/client`) côté application embarquée. Origines explicites obligatoires, jamais « * ».
