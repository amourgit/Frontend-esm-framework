---
"@egen-civitas/esm-app-shell": patch
"@egen-civitas/esm-styleguide": patch
---

Footer fixe : `#egen-footer-app-container` sort de la grille du body (`position: fixed` en bas de la fenêtre) et ne défile plus. Il partage avec la TopBar le niveau d'empilement `--egen-shell-bar-z-index` (8100, au-dessus de la side-nav Carbon et des rails tablette, sous les modales). Le body réserve `--egen-footer-height` en `padding-bottom` : la zone de scroll s'arrête au bord haut du footer et y est coupée net. Les rails d'action tablette se posent au-dessus du footer.
