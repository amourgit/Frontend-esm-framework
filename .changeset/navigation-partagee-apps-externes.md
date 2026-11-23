---
'@egen-civitas/esm-nextjs-utils': minor
---

Navigation partagée Shell ↔ application embarquée (protocole 1.1, additif) : l'URL du Core reflète la page courante de l'app (actualisation, retour/avance, partage).

- Hôte : option `navigation` de `getEmbedLifecycle` (`route`, `mode` `history` | `hash` | `none`, `sensitiveParams`, `pathMap`, `onTitle`) ; messages `hello`, `location`, `goto`.
- Client : `reportLocation()` et `onGoto()`.
- Script injectable sans dépendance `assets/egen-bridge.js` (export `@egen-civitas/esm-nextjs-utils/egen-bridge.js`).
- Fonctions pures exportées (`normalizeAppPath`, `stripSensitive`, `coreSubpath`, `buildCoreUrl`, `buildEmbedSrc`…). Paramètres sensibles jamais recopiés dans l'URL du Core.
- Sans l'option `navigation`, comportement inchangé.
