---
'@egen-civitas/esm-styleguide': patch
'@egen-civitas/esm-app-shell': patch
---

Plan de travail du shell : chaque racine (rails gauche/droit, zones gauche/droite/bas) est maintenant décorée par `egenComponentDecorator`. Avant, `renderWorkbench` montait `createRoot(...).render(<ToolWindowZone />)` sans `ComponentContext` : dès qu'on choisissait un outil dans un rail, la zone rendait son `ExtensionSlot` et levait « ComponentContext has not been provided. This should come from @egen-civitas/esm-react-utils ». Les composants du plan de travail ont aussi accès au namespace i18n `@egen-civitas/esm-styleguide`, à SWR et à la garde d'erreur, comme les autres apps. Test de régression : `workbench.render.test.tsx` (échoue sans le correctif). L'app-shell est republié car il embarque le styleguide.
