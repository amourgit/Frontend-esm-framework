---
'@egen-civitas/esm-app-shell': minor
'@egen-civitas/esm-styleguide': patch
---

Cible native : démarrage compatible avec la CSP `script-src 'self'`.

- `esm-app-shell` : en natif, le thème anti-FOUC, les ponts `window.egen*` et `initializeSpa` sont émis comme fichiers (`bootstrap-head.<hash>.js`, `bootstrap.<hash>.js`) ; les `onclick` du gabarit d'erreur deviennent `data-egen-action` ; la `<meta>` CSP issue de la cible est posée. Le HTML Web est inchangé (octet pour octet). Les sources `tools/targets.js` et `tools/bootstrap.js` sont publiées pour `egen build`.
- `esm-styleguide` : `SplineScene` (runtime 3D, qui génère du code et compile du WebAssembly) ne charge rien en natif et rend un conteneur vide ; `preloadSplineScene` ne télécharge plus rien en natif. Web inchangé.
