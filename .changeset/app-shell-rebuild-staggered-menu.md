---
'@egen-civitas/esm-app-shell': patch
---

Reconstruit avec `esm-styleguide` 3.2.0 et `esm-extensions` 2.3.0. Le shell embarque sa propre copie du styleguide dans son bundle : sans cette republication, les applications continuaient d'exécuter l'ancien `StaggeredMenuPanel` (sans bouton de fermeture ni extensions) même après la mise à jour des dépendances du core.
