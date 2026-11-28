---
'@egen-civitas/esm-app-shell': patch
---

Partage `@egen-civitas/esm-theme` en singleton Module Federation : `setupTheme()` du shell initialisait une copie privée du runtime, donc `getThemeMode()`/`toggleThemeMode()`/`subscribe()` appelés depuis les apps distantes tombaient sur une instance non initialisée (bascule clair/sombre inopérante). Avec le partage, shell et apps utilisent la même instance.
