---
'@egen-civitas/esm-react-utils': patch
---

Retire l'import mort de `useVisitContextStore` dans `mock.tsx`/`mock-jest.tsx`. Ce fichier n'existe plus dans `src/` depuis la purge des références OpenMRS, ce qui faisait échouer la résolution de module (Vite/Vitest) pour tout consommateur du mock — notamment `@egen-civitas/esm-framework` dont les tests importent ce mock en cascade.
