---
'@egen-civitas/esm-app-shell': minor
'@egen-civitas/esm-styleguide': minor
'@egen-civitas/esm-react-utils': patch
'@egen-civitas/esm-extensions': patch
'@egen-civitas/esm-framework': patch
---

Suppression définitive de la barre latérale globale : le conteneur `#egen-left-nav-container` est retiré du shell (il n'était plus que masqué) ainsi que ses règles CSS. `LeftNavMenu`, `useLeftNav`, `setLeftNav` et `unsetLeftNav` sont marqués `@deprecated` : la navigation de niveau 2 est portée par la TopBar (slot `topbar-level2-nav`) ; une app qui veut une navigation interne affiche sa propre barre latérale.
