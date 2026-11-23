---
"@egen-civitas/esm-nextjs-utils": patch
---

L'iframe créée par `getEmbedLifecycle` porte désormais `data-egen-fill` :
le conteneur single-spa reçoit `height: 100%` de `#egen-scroll-region`
(règle opt-in du styleguide), sans travail requis côté application
embarquée.
