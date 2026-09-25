---
'@egen-civitas/esm-styleguide': minor
---

Nouveau module `page-background` (100% Tailwind, sans SCSS ni CSS Modules) : système d'arrière-plan de page porté depuis Civitas-GED, où il habillait déjà toutes les pages de l'intranet — `<PageBackgroundProvider>` / `<GlobalPageBackground>` (à monter une fois dans le shell), `<PageBackground>` (déclaratif, par page) et `<GradientWave>` (fond animé WebGL, réutilisable seul).

Corrigé lors du portage : le listener `resize` de `GradientWave` n'était jamais désinscrit (une arrow function anonyme était attachée dans `init()`, différente de la référence `handleResize` retirée dans `destroy()`) — fuite mémoire à chaque montage/démontage. Le composant réutilise maintenant la même référence liée pour l'attachement et le retrait.

Guide d'utilisation complet en commentaire en bas de `page-background.component.tsx` et `gradient-wave.component.tsx`.
