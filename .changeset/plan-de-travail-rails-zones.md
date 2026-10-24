---
'@egen-civitas/esm-extensions': minor
'@egen-civitas/esm-styleguide': minor
'@egen-civitas/esm-app-shell': minor
---

Shell : plan de travail façon IntelliJ (rails fixes et zones redimensionnables).

- `esm-extensions` : contrat des fenêtres d'outils — slots `shell-rail-left-slot`, `shell-rail-bottom-slot` et `shell-rail-right-slot`, `ToolWindowMeta` (`title`, `titleKey`, `icon`, `order`) et `isToolWindowMeta`.
- `esm-styleguide` : composants `LeftRail`, `RightRail`, `ToolWindowZone` et `Splitter`, store `workbenchStore` (tailles et fenêtres actives mémorisées dans le navigateur), `renderWorkbench`, `useToolWindows`, `useActiveAppModules`. La grille du body passe à rail | zone gauche | centre | zone droite | rail | workspaces, avec une zone basse entre les rails ; la zone centrale devient une carte arrondie.
- `esm-app-shell` : nouveaux conteneurs `egen-rail-*-container` et `egen-zone-*-container`, montés au démarrage par `renderWorkbench`.

Le rail gauche (groupe haut → zone gauche, groupe bas → zone basse) n'affiche que les outils de l'app montée ; le rail droit est global. Rails et zones sont masqués sur les routes publiques, en dessous de 768 px et à l'impression.
