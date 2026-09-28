---
'@egen-civitas/esm-app-shell': patch
---

Rebuild du shell avec esm-framework 1.1.0 / esm-styleguide 1.2.0 : le singleton partagé (Module Federation) embarquait esm-framework 1.0.1 sans TopBar, ce qui rendait `TopBar` undefined dans les apps du core (React #130).
