---
'@egen-civitas/esm-styleguide': patch
---

Corrige 1.4.0 : importer le styleguide déclenchait le préchargement réseau de la scène Spline (1,3 Mo) pour toutes les apps. `SplineScene` charge désormais Spline à la demande (`React.lazy`) et le préchargement devient explicite via `preloadSplineScene(url)`.
