---
'@egen-civitas/esm-styleguide': patch
---

Correctif : les composants de base (`Button`, `Tile`, `Dialog`, `Table`, `Checkbox`…) étaient exportés par `public.ts` mais pas par le point d'entrée principal du package (`internal.ts`, celui que résolvent `@egen-civitas/esm-styleguide` et `@egen-civitas/esm-framework`) : ils étaient introuvables à l'import. Ils sont maintenant exportés des deux côtés, avec un test qui verrouille les deux points d'entrée.
