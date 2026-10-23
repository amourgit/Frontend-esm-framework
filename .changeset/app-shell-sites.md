---
'@egen-civitas/esm-app-shell': patch
---

Republie l'app-shell avec le styleguide courant (≥ 1.11, catégorie `sites` incluse). Le shell fournit `@egen-civitas/esm-framework` aux apps au runtime : le bundle publié (2.4.3) contenait un styleguide plus ancien, donc `SiteCarousel`, `SiteTabbedLayout`, etc. valaient `undefined` côté apps (erreur React #130 à l'ouverture de `/sites`).
