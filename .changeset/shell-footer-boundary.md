---
"@egen-civitas/esm-app-shell": minor
"@egen-civitas/esm-styleguide": minor
---

Shell : la frontière basse du body est traitée comme la frontière haute. Le footer a une hauteur automatique mesurée en direct (`layout-sync.ts` → `--egen-footer-height`, en plus de `--egen-navbar-height`) ; la zone de scroll occupe exactement l'espace entre la TopBar et le footer et coupe son contenu net à chaque frontière. Les éléments positionnés par rapport à la fenêtre (side-nav, workspaces, action-menu) tiennent compte de la hauteur du footer. `setupNavbarHeightSync` devient `setupLayoutHeightSync` (alias conservé).
