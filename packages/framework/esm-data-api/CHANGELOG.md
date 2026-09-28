# @egen-civitas/esm-data-api

## 1.0.2

### Patch Changes

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
