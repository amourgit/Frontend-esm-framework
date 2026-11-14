---
'@egen-civitas/esm-context': patch
---

Correctifs : `unregisterContext` prévient désormais les abonnés (ils reçoivent `null`) au lieu de muter l'état en place sans notification ; `subscribeToContext` ne déclenche plus de notification parasite au premier changement d'un autre espace de noms. Premiers tests du paquet.
