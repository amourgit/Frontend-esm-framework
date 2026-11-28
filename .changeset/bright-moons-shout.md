---
'@egen-civitas/esm-styleguide': patch
---

`PageBackground` : la palette n'utilise plus que `--primary` (une seule source). Rampe monochrome OKLab : 3 nuances foncées → `--primary` → 2 nuances claires. Chaque mode charge sa propre valeur du token ; le fond de page reste `bg-background` derrière le canvas, qui bascule light/dark — les vagues n'apportent que la teinte du thème.

Nettoyage des couleurs en dur du pipeline : la prop `colors` par défaut de `GradientWave` et le repli du halo (`FALLBACK_GLOW_ACCENT`) passent sur la rampe teal monochrome par défaut — plus aucune palette multicolore codée en dur.
