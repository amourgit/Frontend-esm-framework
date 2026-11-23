---
'@egen-civitas/esm-routes': patch
'@egen-civitas/esm-app-shell': patch
---

Enregistre les alias de module dans le système de configuration. Une app est connue sous son nom de paquet (clé du registre et de l'import map) et sous un alias (son espace de noms de traduction et de configuration, clé `aliases` de l'import map). Seul le nom du paquet était enregistré : une fois les alias résolus par `importDynamic`, la lecture des surcharges de traduction de l'alias (`getTranslationOverrides`) attendait indéfiniment un module jamais enregistré sous ce nom, et les composants qui suspendent sur les traductions (panneaux « Accès rapide », « Logs », composants de la TopBar…) restaient vides. `registerApp(appName, routes, aliases?)` enregistre désormais le nom du paquet ET chaque alias, `loadLifeCycles` les marque « chargés » ensemble, et le Shell fournit les alias lus dans l'import map (`invertAliases`). Sans alias, le comportement est inchangé.
