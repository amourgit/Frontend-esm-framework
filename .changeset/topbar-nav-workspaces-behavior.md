---
'@egen-civitas/esm-extensions': minor
'@egen-civitas/esm-framework': minor
---

Navigation de niveau 2 de la TopBar : contextualisation par espace et surcharge de comportement par app (changements additifs, sans rupture).

- `NavEntryMeta.workspaces` : espaces (`intranet`, `extranet`…) où l'entrée apparaît ; absent, vide ou `'*'` = tous. Nouveau helper `isNavEntryInWorkspace` et constante `NAV_ALL_WORKSPACES`.
- `NavEntryMeta.group` devient facultatif : une entrée sans `group` est un lien simple (une section à entrée unique devient un bouton direct, sans menu déroulant).
- `NavEntryMeta.sectionRoute` : route du bouton de la section lui-même.
- `registerNavBehavior({ entry } | { section }, { onSelect })` / `getNavBehavior` : une app remplace (ou enrichit via `ctx.runDefault()`) la logique globale appliquée au clic sur son bouton de navigation.
- Mocks `esm-framework` (`mock` et `mock-jest`) : `registerNavBehavior`, `getNavBehavior` et réexport des constantes/validateurs purs.
