---
'@egen-civitas/esm-styleguide': patch
---

`Section` : le tone par défaut passe de `onDark` à `onLight`. Les sections posées sur le fond de page (toutes les sections home : À la une, Actualités, Événements, Annonces, Annuaires, Sites, Réseaux) avaient des titres en `surface-inverse-foreground`/`primary-foreground` — invisibles en light et calqués sur le fond en dark. `onLight` suit désormais `--foreground`/`--muted-foreground`/`--border` dans les deux modes ; `tone="onDark"` reste disponible pour les sections sur média sombre.
