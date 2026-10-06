# @egen-civitas/esm-ai-memory

## 1.0.3

### Patch Changes

- ba95948: Corrige une condition de course qui pouvait vider la conversation active. Après la connexion, l'hydratation backend relisait la conversation dans IndexedDB puis écrasait l'état en mémoire avec cette copie ; or les mutations (`persistActive`) mettent l'état à jour avant d'écrire en base, donc un message envoyé pendant ce rafraîchissement disparaissait (conversation remise à `[]` dans le cas observé). Le rafraîchissement fusionne désormais la copie de la base avec l'état courant (`mergeActiveConversation`) et réconcilie la liste des résumés. Ce défaut rendait aussi instable le test `store.test.ts` en CI.

## 1.0.2

### Patch Changes

- Fix incorrect peerDependencies ranges for `@egen-civitas/esm-api` and `@egen-civitas/esm-state` (were pinned to `9.x`, a version that has never existed — should match the `^1.0.0` range already used in `dependencies`/`devDependencies` for the same packages).
