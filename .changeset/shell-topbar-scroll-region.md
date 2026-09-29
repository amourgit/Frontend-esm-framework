---
"@egen-civitas/esm-app-shell": minor
"@egen-civitas/esm-styleguide": minor
---

Layout du shell : le contenu défile dans `#egen-scroll-region` (sous la TopBar) au lieu de la fenêtre, donc il est coupé net à la frontière TopBar/body et ne passe plus derrière la barre. La TopBar a une hauteur automatique (niveau 1 + niveau 2) mesurée en direct par le shell (`layout-sync.ts`) dans `--egen-navbar-height`, ce qui décale correctement le début du contenu. Le pied de page défile avec le contenu. Impression inchangée.
