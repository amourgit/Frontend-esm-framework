---
'@egen-civitas/esm-app-shell': patch
---

Republication du Shell avec les évolutions récentes du Framework embarquées : prise en charge de la table `aliases` de l'import map par `importDynamic` (esm-dynamic-loading 2.2.0, esm-globals 2.5.0), qui permet de retrouver un module par un nom alternatif (par exemple un espace de noms i18n différent du nom du paquet). Le Shell 3.0.7 avait été construit avant cette évolution et ne la contient pas. Aucun changement de l'API ni de la configuration du Shell.
