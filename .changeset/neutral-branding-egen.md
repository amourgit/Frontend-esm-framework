---
'@egen-civitas/egen': minor
---

Support de `EGEN_BRAND_DIR` (variable d'environnement ou `.env*` du monorepo consommateur) : `egen develop` sert ce dossier avant le `dist` pré-compilé de l'app-shell, et `egen build` le transmet au shell avec un chemin absolu (le build s'exécute depuis `node_modules`, où un chemin relatif ne désignerait plus rien). Le projet client peut ainsi fournir son favicon et son icône PWA sans qu'aucune identité visuelle ne soit embarquée dans le framework. Un chemin invalide est ignoré avec un avertissement.
