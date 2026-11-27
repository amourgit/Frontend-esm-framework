---
'@egen-civitas/esm-embed-host': patch
---

Retrait du paquet `@egen-civitas/esm-nextjs-utils` (pont 1.1 et script `egen-bridge.js`) : le SDK `esm-embed-client` est l'unique voie d'intégration d'une app embarquée. Les versions déjà publiées de `esm-nextjs-utils` doivent être marquées dépréciées sur npm (`npm deprecate`).
