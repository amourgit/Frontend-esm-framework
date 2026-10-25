---
'@egen-civitas/esm-styleguide': minor
'@egen-civitas/esm-app-shell': patch
---

Plan de travail : pastilles (compteurs) sur les boutons des rails.

- Nouvelle API `setToolWindowBadge(id, badge)` (`id` = nom de l'extension du rail) : une app publie un compteur (ou un court texte) affiché sur son bouton de rail ; `null`, `0` ou `''` le retire. Les nombres supérieurs à 99 s'affichent « 99+ ».
- Les pastilles vivent dans un store dédié (`workbenchBadgeStore`) et ne sont jamais mémorisées avec la disposition du plan de travail.
