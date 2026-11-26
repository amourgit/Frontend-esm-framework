---
'@egen-civitas/esm-styleguide': minor
'@egen-civitas/esm-app-shell': patch
---

Le fond de page animé (`AnimatedHomeBackground`, `DefaultPageBackground`, `GlobalPageBackground`) dérive désormais ses couleurs des tokens du thème (`--background`, `--primary`, `--accent`, `--chart-*`) au lieu de couleurs figées : le dégradé WebGL, le fond de secours et le halo suivent le thème clair/sombre et les surcharges à chaud. Nouvelle dépendance `culori` (même version que `esm-theme`) pour la conversion des couleurs. Le canvas `GradientWave` est remonté via `key` quand la palette change. `esm-app-shell` est republié (patch) car il bundle `esm-styleguide` : le fond dynamique arrive aux applications via la prochaine version du shell.
