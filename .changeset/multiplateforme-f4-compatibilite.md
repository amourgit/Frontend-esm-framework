---
'@egen-civitas/esm-globals': minor
'@egen-civitas/esm-routes': minor
'@egen-civitas/rspack-config': minor
---

Compatibilité vérifiable entre apps et framework (F4) : `routes.json` est estampillé avec `frameworkRange` (peerDependency valide sur `esm-framework`) ; `registerApp` écarte au démarrage, en le journalisant, une app dont la plage n'est pas satisfaite par le framework du shell. `esm-globals` : type `BuildManifest` et `validateBuildManifest()`. Une app sans `frameworkRange` (ancien format) reste acceptée.
