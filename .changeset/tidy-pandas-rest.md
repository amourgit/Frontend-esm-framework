---
"@egen-civitas/esm-styleguide": patch
---

Fond de page système simplifié : `AnimatedHomeBackground` ne rend plus l'animation WebGL `GradientWave` (ni halo ni voiles) — c'est désormais un aplat du token `--background` (section « base » du thème), comme le fond par défaut de tout projet. Le fond système du shell, le fallback de `GlobalPageBackground` et le repli de `DefaultPageBackground` sans image suivent tous cette couleur ; dark/light réagit via le basculement des tokens. `GradientWave` reste exporté pour un usage autonome.
