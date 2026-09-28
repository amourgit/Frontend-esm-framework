---
'@egen-civitas/tailwind-preset': minor
---

Nouveau package : point d'entrée Tailwind v4 partagé (`tailwind.tw.css`), pont vers les tokens `--colors-*`/`--border-radius-*` de `@egen-civitas/esm-theme`, preflight désactivé (contexte single-spa multi-apps). Documente le modificateur `!` de Tailwind v4 comme mécanisme validé pour surcharger un composant `esm-styleguide` stylé en SCSS (le SCSS existant n'étant pas dans un `@layer`, une classe Tailwind normale ne le bat pas — une classe important, si).
