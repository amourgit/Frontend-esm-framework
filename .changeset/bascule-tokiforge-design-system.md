---
'@egen-civitas/esm-styleguide': major
'@egen-civitas/tailwind-preset': major
'@egen-civitas/esm-ai-tools': major
---

Fin de la bascule du système de design : le styleguide et le preset Tailwind passent au contrat de variables Tweakcn écrit par `@egen-civitas/esm-theme` 2.

- `esm-styleguide` : plus aucune variable de l'ancien contrat (`--colors-*`, `--panel-*`, `--typography-*`, `--border-radius-*`…). Les clés sémantiques (`--background`, `--primary`, `--card`, `--border`, `--radius`, `--shadow-*`, `--font-sans`…) viennent du thème ; les échelles dérivées (`--primary-50…950`, `--neutral-*`, `--destructive-*`) et les constantes (`--success-*`, `--warning-*`, `--info-*`, `--secondary-*`, `--radius-*`, `--transition-*`, `--z-*`, `--text-*`…) sont déclarées une seule fois dans `styles.css`. Le mode sombre est la classe `dark` sur la racine (et non plus un attribut). Les composants « verre » et les propriétés `glass` sont conservés avec la même API, rendus sur des surfaces pleines du thème.
- `tailwind-preset` : les utilitaires sont rattachés aux variables du thème par `@theme inline` (les auto-références qui ne pouvaient pas fonctionner sont supprimées) ; échelle `secondary-*` complète ; le variant `dark:` suit désormais la classe `dark` au lieu de la préférence système du navigateur.
- `esm-ai-tools` : l'état de page expose `theme.isDark` (booléen, lu sur la classe `dark`) à la place de `theme.dataTheme`.
