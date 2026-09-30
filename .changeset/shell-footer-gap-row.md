---
"@egen-civitas/esm-app-shell": patch
"@egen-civitas/esm-styleguide": patch
---

Footer : l'espace réservé au footer fixe est désormais une ligne de grille vide (`footerGap`, hauteur `--egen-footer-height`) au lieu d'un `padding-bottom` sur le body, que les resets globaux (`html, body { padding: 0 }`) écrasaient — la zone de scroll passait donc sous le footer. La zone de scroll se termine maintenant exactement au bord haut du footer, symétrique de la TopBar.
