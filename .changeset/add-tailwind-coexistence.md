---
'@egen-civitas/rspack-config': minor
---

Ajoute une règle rspack dédiée aux fichiers `*.tw.css` (Tailwind v4 + PostCSS), strictement séparée de la règle `.css`/`.scss` existante afin de ne jamais scoper (hasher) les classes utilitaires Tailwind ni affecter les imports CSS Modules déjà en place dans les apps consommatrices. Nouveau point d'extension exporté : `tailwindRuleConfig`. Nouvelles dépendances directes de ce package : `tailwindcss`, `@tailwindcss/postcss`, `postcss`, `postcss-loader`.
