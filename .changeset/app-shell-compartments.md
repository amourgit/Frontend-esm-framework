---
'@egen-civitas/esm-app-shell': minor
---

Republie le shell avec le plan de travail à compartiments verticaux (esm-styleguide 3.1.0, esm-extensions 2.2.0) : le `dist` précompilé du shell embarque les rails et zones, il doit donc être reconstruit pour que `meta.compartment` des options de rail soit pris en compte (compartiment propre à côté du compartiment par défaut).
