---
'@egen-civitas/esm-app-shell': patch
---

Republication du shell pour qu'il embarque `@egen-civitas/esm-framework` / `esm-extensions` 1.2.1. Le shell est livré pré-compilé avec le framework : le 2.4.2 (17 octobre) contenait encore l'ancien code de navigation et n'exposait donc ni `isNavEntryInWorkspace` ni `getNavBehavior`/`registerNavBehavior` aux apps (une app qui les appelle plante au rendu). Aucun changement de code dans le shell.
