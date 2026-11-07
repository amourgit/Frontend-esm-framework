---
'@egen-civitas/esm-app-shell': minor
'@egen-civitas/esm-theme': minor
'@egen-civitas/esm-translations': patch
---

Le shell peut être reconstruit par cible chez le consommateur (`egen build`).

- `esm-app-shell` : publie `rspack.config.js`, `dependencies.json`, `src/` et `tools/` en plus de `dist/` (le `dist/` précompilé reste servi tel quel par `egen develop`). Le dossier des thèmes est résolu via le paquet `@egen-civitas/esm-theme` au lieu d'un chemin propre au monorepo.
- `esm-theme` : publie `src/themes/` et exporte `./package.json`.
- `esm-translations` : publie `translations/` (fichiers de langue importés par le shell).
