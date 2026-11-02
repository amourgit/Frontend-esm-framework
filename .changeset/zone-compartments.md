---
'@egen-civitas/esm-extensions': minor
'@egen-civitas/esm-styleguide': minor
---

Compartiments verticaux dans les zones gauche et droite. Chaque zone devient une pile de compartiments dont les hauteurs (en % de la zone) totalisent toujours 100 : aucun débordement, contenu défilant en interne, redimensionnement libre entre voisins (les autres s'ajustent selon leurs minimum et maximum). La zone actuelle devient le compartiment par défaut (dimensions fixées par le shell) et porte désormais le fond sombre à la place de la zone. Une app choisit, dans la `meta` de son option de rail, d'afficher dans le compartiment par défaut ou dans un compartiment propre via `meta.compartment` (`{ height, minHeight, maxHeight }` en %, valeurs par défaut `DEFAULT_COMPARTMENT_HEIGHTS`). Nouveaux exports : `getToolWindowCompartment`, `DEFAULT_COMPARTMENT_HEIGHTS`, `ToolWindowCompartment`, `closeToolWindow(anchor, id?)` pour fermer un seul compartiment.
