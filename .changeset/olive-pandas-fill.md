---
'@egen-civitas/esm-styleguide': patch
'@egen-civitas/esm-app-shell': patch
---

Hauteur de la zone de scroll propagée aux applications : `#egen-apps-container` prend désormais `height: 100%` de `#egen-scroll-region` (avec `min-height: 400px`) et ne clippe plus le débordement (`overflow: visible`), ce qui fait de `#egen-scroll-region` le scroller unique. Les racines d'apps montées (`div#single-spa-application:*` non vides) reçoivent `min-height: 100%`, rendant `height: 100%` résolvable jusqu'à la racine de l'app — une app peut remplir la zone en temps réel au lieu de déborder. `overflow-x` de la zone passe de `hidden` à `auto` pour laisser remonter le débordement horizontal. Shell reconstruit pour embarquer le styleguide à jour.
