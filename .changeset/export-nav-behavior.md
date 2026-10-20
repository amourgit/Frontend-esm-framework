---
'@egen-civitas/esm-extensions': patch
'@egen-civitas/esm-framework': patch
---

Correctif de 1.2.0 : `registerNavBehavior` et `getNavBehavior` (ainsi que les types `NavBehavior`, `NavBehaviorTarget`, `NavSelectContext`) étaient documentés dans l'API publique mais absents du point d'entrée du package, donc inutilisables par les apps. `esm-extensions` les exporte désormais, et `esm-framework` les réexporte. Un test vérifie que chaque module de l'API publique (`public.ts`) est bien exporté par `index.ts`.
