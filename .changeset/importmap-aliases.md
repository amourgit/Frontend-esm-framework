---
'@egen-civitas/esm-globals': minor
'@egen-civitas/esm-dynamic-loading': minor
---

L'import map accepte une table facultative `aliases` (`{ "<alias>": "<nom réel>" }`) : `importDynamic` retrouve alors un paquet par un nom alternatif (par exemple un espace de noms i18n différent du nom du paquet). Une clé présente dans `imports` prime toujours sur un alias, la lecture de l'import map reste incluse dans le délai maximal de chargement, et les import maps sans `aliases` se comportent comme avant.
