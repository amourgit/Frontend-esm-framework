---
'@egen-civitas/esm-ai-channel': minor
'@egen-civitas/esm-ai-config': minor
'@egen-civitas/esm-ai-framework': patch
'@egen-civitas/esm-app-shell': patch
---

Sécurité du canal IA : le frontend peut maintenant vérifier que les ordres `tool.call` viennent bien du backend, et refuser une destination de canal non sûre. Le frontend reste un simple exécutant — toute la décision reste côté backend.

**Appels de tools signés (standards JWS RFC 7515 / JWT RFC 7519 / JWKS RFC 7517, via `jose`)** : le backend signe l'appel entier (`jws` dans `tool.call`) avec une clé privée ; le frontend ne détient que la clé publique. Il exécute uniquement le contenu signé (`tool`, `args`) et exige : signature valide (algorithmes asymétriques en liste blanche, jamais `none`/HS*), `typ` `egen-ai-call+jwt`, `aud` `egen-ai:frontend`, `sub` = `sessionId` du `session.welcome`, `iat` ≤ 120 s, `exp`, `jti` = `callId`. Un callId authentifié ne s'exécute jamais deux fois (anti-rejeu, y compris après éviction du cache de résultats). Les appels sont admis dans leur ordre d'arrivée (vérification asynchrone, exécution toujours séquentielle) et un `tool.cancel` précoce reste pris en compte. Un appel refusé reçoit un `tool.result` d'erreur explicite (`missing`, `signature`, `expired`, `session`, `claims`, `mismatch`, `replay`, `algorithm`, `key-unavailable`).

**Désactivé par défaut — aucun changement de comportement tant que rien n'est configuré.** Déploiement progressif `EGEN_AI_SIGNED_CALLS=off → warn → enforce`. Un mode inconnu (faute de frappe) échoue fermé (`enforce`), jamais en `off`. Nouvelles variables relayées par le shell : `EGEN_AI_SIGNED_CALLS`, `EGEN_AI_CHANNEL_JWKS`, `EGEN_AI_CHANNEL_JWKS_URL`, `EGEN_AI_CHANNEL_ALGORITHMS`, `EGEN_AI_CHANNEL_ALLOWED_HOSTS`, `EGEN_AI_ALLOW_INSECURE_CHANNEL`. `validateAIConfig` rejette un JWKS contenant une clé privée ou symétrique, `enforce` sans clé, un algorithme non autorisé.

**Garde-fou sur la destination du canal (actif par défaut)** : `wss://` obligatoire hors machine locale — **un canal `ws://` vers un hôte distant est désormais refusé** sauf `EGEN_AI_ALLOW_INSECURE_CHANNEL=true` — et épinglage optionnel des hôtes (`api.exemple.ga`, `*.exemple.ga`). Vérifié à chaque (re)connexion ; l'erreur est exposée dans l'état du canal.

Documentation complète (contrat, exemples Node/Python, génération de clés, rotation, CSP recommandée, limites) dans le README d'`esm-ai-channel`.
