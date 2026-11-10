---
'@egen-civitas/esm-globals': minor
'@egen-civitas/esm-app-shell': minor
---

Service worker séparé des données hors ligne (E1) : `SpaConfig.serviceWorker` (défaut : la valeur de `offline`, comportement inchangé) et `window.serviceWorkerEnabled`. Une cible native garde le mode hors ligne des données (`offline`) sans service worker (fichiers embarqués) ; auparavant elle coupait les deux. Web : HTML et comportement inchangés.
