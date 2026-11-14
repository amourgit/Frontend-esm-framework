# @egen-civitas/esm-context

## 1.0.3

### Patch Changes

- f56b2de: Correctifs : `unregisterContext` prévient désormais les abonnés (ils reçoivent `null`) au lieu de muter l'état en place sans notification ; `subscribeToContext` ne déclenche plus de notification parasite au premier changement d'un autre espace de noms. Premiers tests du paquet.

## 1.0.2

### Patch Changes

- Updated dependencies [159db44]
  - @egen-civitas/esm-globals@2.0.0
  - @egen-civitas/esm-state@1.0.3
