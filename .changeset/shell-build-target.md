---
'@egen-civitas/esm-app-shell': minor
'@egen-civitas/esm-globals': minor
---

Cible de build `EGEN_TARGET` (`web` par défaut | `android` | `ios`).

- `esm-app-shell` : nouveau module `tools/targets.js` (`resolveTarget`, fonction pure) branché dans `rspack.config.js`. Sans `EGEN_TARGET`, le build Web est inchangé (dist identique octet pour octet). En natif, le build échoue si `EGEN_ENV` ≠ `production`, si `EGEN_DEV_NO_AUTH=true`, si `EGEN_API_URL` n'est pas en `https://` absolu, ou si l'import map / les routes ne sont pas fournies inline. Pont `window.egenTarget` (natif uniquement), posé avant `initializeSpa`.
- `esm-globals` : `Window.egenTarget?: 'web' | 'android' | 'ios'`.
