---
'@egen-civitas/esm-ai-memory': patch
---

Corrige une condition de course qui pouvait vider la conversation active. Après la connexion, l'hydratation backend relisait la conversation dans IndexedDB puis écrasait l'état en mémoire avec cette copie ; or les mutations (`persistActive`) mettent l'état à jour avant d'écrire en base, donc un message envoyé pendant ce rafraîchissement disparaissait (conversation remise à `[]` dans le cas observé). Le rafraîchissement fusionne désormais la copie de la base avec l'état courant (`mergeActiveConversation`) et réconcilie la liste des résumés. Ce défaut rendait aussi instable le test `store.test.ts` en CI.
