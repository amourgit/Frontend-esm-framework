---
'@egen-civitas/esm-globals': minor
'@egen-civitas/esm-framework': minor
'@egen-civitas/esm-app-shell': minor
---

Réforme multiplateforme, lot P0 (docs/EGEN-FRAMEWORK-DEV.md) :

- shell : résolution de la cible de build `EGEN_TARGET` (`web` | `android` | `ios`) via `tools/targets.js` ; pont `window.egenTarget` (cibles natives uniquement) ; validations strictes pour le natif (API https absolue, import map et routes inline, pas de bypass d'auth, production obligatoire). Build Web inchangé (vérifié : `dist` identique).
- esm-globals : `EgenTarget`, `CapabilityName`, `getEgenTarget()`, `isNativeTarget()`.
- esm-framework : ré-export du nouveau package `@egen-civitas/esm-platform`.
