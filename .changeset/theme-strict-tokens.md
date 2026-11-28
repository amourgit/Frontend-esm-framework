---
"@egen-civitas/esm-styleguide": minor
"@egen-civitas/esm-app-shell": patch
---

Thème : rendu strictement aligné sur les tokens Tweakcn (background, card, sidebar, muted, accent, border, ring…).

- Fond de page du shell : `html` et la zone de contenu utilisent `--background` (plus `--muted` ni voile `--shadow-color`) ; le composant de fond animé est inchangé.
- Compartiments de zones : `--sidebar` / `--sidebar-foreground` ; boutons de rail : `--sidebar-accent`.
- Composants du styleguide : suppression des échelles dérivées (`primary-300`, `success-400`…) et des mélanges `color-mix(...)` avec `--shadow-color` / `--surface-inverse-foreground` au profit des tokens directs (`card`, `border`, `muted`, `accent`, `muted-foreground`).
