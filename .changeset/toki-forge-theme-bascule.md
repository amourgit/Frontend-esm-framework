---
'@egen-civitas/esm-theme': major
'@egen-civitas/esm-app-shell': minor
---

Bascule du moteur de thème sur TokiForge : suppression de l'ancien moteur (`setupThemeEngine`, `engine.ts`, `loader.ts`, `schema.ts`, `flatten.ts`, `inject.ts`, `types.ts`, `theme.default.json`) au profit du nouveau système `setupTheme` (styles de thème runtime, client, singleton, DTCG). `esm-app-shell` initialise désormais le thème via `setupTheme`.
