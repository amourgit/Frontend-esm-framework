---
'@egen-civitas/esm-extensions': minor
'@egen-civitas/esm-styleguide': minor
---

Rail gauche : options globales avec sous-options.

- `ToolWindowMeta.global` : une extension du slot `shell-rail-left-slot` (ou `shell-rail-bottom-slot`) déclarée avec `meta.global: true` reste affichée dans le rail quelle que soit l'app active, comme le rail droit. Sans ce drapeau, le comportement est inchangé (seules les extensions de l'app active apparaissent).
- Nouveau composant `SectionNavPanel` (`section`) : contenu prêt à l'emploi d'une option globale. Il liste, dans la zone gauche, les sous-options d'une section (entrées `NavEntryMeta` déclarées par l'app sur `topbar-level2-nav`), regroupées par `group`, avec icône, et navigue vers la route de la sous-option au clic ; la sous-option de la page courante est marquée active. La zone centrale se met à jour par la navigation habituelle.
- Liste blanche d'icônes du plan de travail étendue (`Calendar`, `CalendarCheck`, `Compass`, `Contact`, `FileCheck`, `FileText`, `Globe`, `Layers`, `Radio`, `Star`, `Zap`).
