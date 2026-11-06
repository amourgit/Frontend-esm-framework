---
'@egen-civitas/esm-app-shell': patch
---

Reconstruit avec `esm-styleguide` 3.3.0 et `esm-extensions` 2.4.0. Le shell embarque sa propre copie du styleguide dans son bundle : sans cette republication, le panneau de section du rail ne lirait pas le nouveau slot de navigation `topbar-nav-slot` (seulement l'ancien `topbar-level2-nav`), et les apps qui migrent leur `routes.json` verraient leurs sous-options disparaître.
