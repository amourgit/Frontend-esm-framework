---
"@egen-civitas/esm-styleguide": patch
---

Le conteneur de la TopBar n'est plus redéfini dans `_panel-overrides.scss` (il écrasait le z-index/position du shell) ; le side-nav se cale sur `--egen-navbar-height` (hauteur mesurée, niveau 2 inclus).
