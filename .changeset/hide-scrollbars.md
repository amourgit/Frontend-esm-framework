---
'@egen-civitas/esm-styleguide': minor
'@egen-civitas/esm-app-shell': patch
---

Scrollbars invisibles dans toutes les apps et tous les composants (le défilement reste intact). Règle globale dans la feuille de style du shell, avec `!important` pour neutraliser aussi les réglages locaux (`scrollbar-thin`, `scrollbar-thumb-*`, Carbon). Exception ponctuelle : attribut `data-scrollbar="visible"` sur l'élément concerné.
