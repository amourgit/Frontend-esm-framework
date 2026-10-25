---
'@egen-civitas/esm-styleguide': patch
'@egen-civitas/esm-app-shell': patch
---

Plan de travail : corrige l'erreur « ComponentContext has not been provided » à l'ouverture d'une zone (clic sur un bouton de rail). Les zones sont montées par le shell hors de tout décorateur de composant ; elles fournissent maintenant leur propre `ComponentContext` à l'`ExtensionSlot` qui rend la fenêtre d'outils active.
