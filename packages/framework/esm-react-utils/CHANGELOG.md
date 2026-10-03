# @egen-civitas/esm-react-utils

## 1.0.4

### Patch Changes

- d69a61c: Les fichiers `mock.ts` / `mock-jest.ts` de ces paquets importent `./src/...`, mais `src` n'était pas publié sur npm : tout test consommateur qui utilisait `@egen-civitas/esm-framework/mock` échouait avec « Failed to resolve import ./src/index ». `src` est désormais publié (sans les fichiers `*.test.*`). `esm-api` : les mocks exportent aussi `isDevAuthBypassEnabled` et `applyDevAuthBypassForLogin` (désactivés par défaut), absents jusqu'ici alors qu'ils font partie de l'API publique.
- Updated dependencies [d69a61c]
  - @egen-civitas/esm-utils@1.0.2
  - @egen-civitas/esm-api@1.1.2
  - @egen-civitas/esm-config@1.0.2
  - @egen-civitas/esm-state@1.0.2

## 1.0.3

### Patch Changes

- 4e5e0a1: Retire l'import mort de `useVisitContextStore` dans `mock.tsx`/`mock-jest.tsx`. Ce fichier n'existe plus dans `src/` depuis la purge des références OpenMRS, ce qui faisait échouer la résolution de module (Vite/Vitest) pour tout consommateur du mock — notamment `@egen-civitas/esm-framework` dont les tests importent ce mock en cascade.
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
  - @egen-civitas/esm-data-api@1.0.2
  - @egen-civitas/esm-extensions@1.0.2
  - @egen-civitas/esm-navigation@1.0.2
  - @egen-civitas/esm-tenant@1.0.2

## 1.0.2

### Patch Changes

- 60eda59: Corrige `mock.tsx` et `mock-jest.tsx` : ces fichiers référençaient un hook
  `useVisitContextStore` qui n'a jamais existé dans le code source du paquet
  (aucune définition, aucun historique git, aucun usage réel ailleurs dans le
  monorepo — du code mort orphelin). Tout import de `useVisitContextStore`
  depuis `@egen-civitas/esm-react-utils/mock` ou `/mock-jest` échouait avec
  une erreur de module introuvable. Supprimé proprement des deux fichiers.

  Correctif sans risque de régression : puisque le module cible n'a jamais
  existé, aucun code consommateur n'a jamais pu importer ce mock avec succès.

- Updated dependencies [9eb32b2]
  - @egen-civitas/esm-api@1.1.0
