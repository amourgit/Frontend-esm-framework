---
'@egen-civitas/esm-app-shell': minor
---

Le shell devient neutre : il n'embarque plus l'ancien favicon hérité, ni l'ancien slogan du manifest PWA, ni la couleur de thème `#005d5d`. Il livre un favicon et une icône PWA génériques (`src/assets/favicon.ico`, `src/assets/icon-512.png`) et le projet client fournit les siens via la nouvelle variable `EGEN_BRAND_DIR` (dossier dont `favicon.ico` et `icon-512.png` remplacent ceux du shell). Nouvelles variables : `EGEN_PAGE_DESCRIPTION` (défaut : le titre de la page) et `EGEN_THEME_COLOR` (défaut : `#161616`). Suppression de `src/assets/logo.svg` (un PNG renommé, jamais référencé).
