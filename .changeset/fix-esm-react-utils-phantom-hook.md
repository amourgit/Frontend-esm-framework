---
'@egen-civitas/esm-react-utils': patch
---

Corrige `mock.tsx` et `mock-jest.tsx` : ces fichiers référençaient un hook
`useVisitContextStore` qui n'a jamais existé dans le code source du paquet
(aucune définition, aucun historique git, aucun usage réel ailleurs dans le
monorepo — du code mort orphelin). Tout import de `useVisitContextStore`
depuis `@egen-civitas/esm-react-utils/mock` ou `/mock-jest` échouait avec
une erreur de module introuvable. Supprimé proprement des deux fichiers.

Correctif sans risque de régression : puisque le module cible n'a jamais
existé, aucun code consommateur n'a jamais pu importer ce mock avec succès.
