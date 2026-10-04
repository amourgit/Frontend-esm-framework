---
'@egen-civitas/esm-styleguide': minor
'@egen-civitas/esm-app-shell': minor
---

Arrière-plan de page monté une seule fois, dans le shell. L'état de `page-background` passe d'un contexte React (qui ne traversait pas les racines React des apps) à un store global `@egen-civitas/esm-state` : `<PageBackground>` fonctionne désormais depuis n'importe quelle app, sans provider. Nouveau `renderPageBackground(conteneur)` (appelé par le shell, conteneur `#egen-page-background-container`, rendu vide tant qu'aucune page ne déclare de fond) ; `<GlobalPageBackground>` gagne `fallback="animated" | "none"`. Le démontage d'une page ne libère que son propre fond (un démontage tardif n'efface plus celui de la page suivante) et un changement de props ne repasse plus par le fond par défaut. `<PageBackgroundProvider>` est déprécié et ne fait plus que rendre ses enfants. Styles : le fond de canevas est porté par `html` seul (`body` transparent) pour ne pas masquer l'arrière-plan global.
