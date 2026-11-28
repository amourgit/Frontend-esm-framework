---
'@egen-civitas/esm-styleguide': patch
---

Fond de page système par défaut : `renderPageBackground` monte désormais `<GlobalPageBackground fallback="animated">` — le fond animé d'accueil est le fond natif de TOUTES les pages, sans déclaration `<PageBackground>` (avant : `fallback="none"`, aucune page sans déclaration n'avait de fond). Une page qui veut un autre fond le déclare toujours via `<PageBackground>` ; `fallback="none"` reste disponible.

`#egen-scroll-region` n'est plus opaque : `--egen-workbench-card-bg` passe à `transparent` pour laisser voir le fond global du shell (`#egen-page-background-container`) sur toute la zone de contenu des apps. La variable reste surchargeable pour retrouver l'ancien rendu « carte ».
