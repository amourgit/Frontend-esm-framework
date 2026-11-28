---
'@egen-civitas/esm-styleguide': patch
---

Fond de page monochrome dérivé du thème + zones de workbench transparentes :

- `PageBackground` / `AnimatedHomeBackground` : la palette n'est plus multicolore. Elle interpole `--background` → la couleur de marque (`--primary`, replis `accent`/`chart-1`) en OKLab — fond de base + 5 teintes croissantes d'une unique couleur. Les tokens basculant avec le mode, le fond réagit fortement au dark/light comme une page normale ; le halo reprend la même teinte.
- Zones gauche/droite/bas du workbench : `.compartment` n'a plus de fond (`--egen-zone-card-bg: transparent`, surchargeable) et son texte passe à `--foreground` — le PageBackground de la page reste visible derrière les panneaux d'extension.
