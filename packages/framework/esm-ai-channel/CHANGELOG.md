# @egen-civitas/esm-ai-channel

## 2.2.0

### Minor Changes

- 4bab617: Sécurité du canal IA : le frontend peut maintenant vérifier que les ordres `tool.call` viennent bien du backend, et refuser une destination de canal non sûre. Le frontend reste un simple exécutant — toute la décision reste côté backend.

  **Appels de tools signés (standards JWS RFC 7515 / JWT RFC 7519 / JWKS RFC 7517, via `jose`)** : le backend signe l'appel entier (`jws` dans `tool.call`) avec une clé privée ; le frontend ne détient que la clé publique. Il exécute uniquement le contenu signé (`tool`, `args`) et exige : signature valide (algorithmes asymétriques en liste blanche, jamais `none`/HS*), `typ` `egen-ai-call+jwt`, `aud` `egen-ai:frontend`, `sub` = `sessionId` du `session.welcome`, `iat` ≤ 120 s, `exp`, `jti` = `callId`. Un callId authentifié ne s'exécute jamais deux fois (anti-rejeu, y compris après éviction du cache de résultats). Les appels sont admis dans leur ordre d'arrivée (vérification asynchrone, exécution toujours séquentielle) et un `tool.cancel` précoce reste pris en compte. Un appel refusé reçoit un `tool.result` d'erreur explicite (`missing`, `signature`, `expired`, `session`, `claims`, `mismatch`, `replay`, `algorithm`, `key-unavailable`).

  **Désactivé par défaut — aucun changement de comportement tant que rien n'est configuré.** Déploiement progressif `EGEN_AI_SIGNED_CALLS=off → warn → enforce`. Un mode inconnu (faute de frappe) échoue fermé (`enforce`), jamais en `off`. Nouvelles variables relayées par le shell : `EGEN_AI_SIGNED_CALLS`, `EGEN_AI_CHANNEL_JWKS`, `EGEN_AI_CHANNEL_JWKS_URL`, `EGEN_AI_CHANNEL_ALGORITHMS`, `EGEN_AI_CHANNEL_ALLOWED_HOSTS`, `EGEN_AI_ALLOW_INSECURE_CHANNEL`. `validateAIConfig` rejette un JWKS contenant une clé privée ou symétrique, `enforce` sans clé, un algorithme non autorisé.

  **Garde-fou sur la destination du canal (actif par défaut)** : `wss://` obligatoire hors machine locale — **un canal `ws://` vers un hôte distant est désormais refusé** sauf `EGEN_AI_ALLOW_INSECURE_CHANNEL=true` — et épinglage optionnel des hôtes (`api.exemple.ga`, `*.exemple.ga`). Vérifié à chaque (re)connexion ; l'erreur est exposée dans l'état du canal.

  Documentation complète (contrat, exemples Node/Python, génération de clés, rotation, CSP recommandée, limites) dans le README d'`esm-ai-channel`.

### Patch Changes

- Updated dependencies [4bab617]
  - @egen-civitas/esm-ai-config@1.4.0

## 2.1.0

### Minor Changes

- a158b96: Audit des modules IA : suppression du code mort et correction d'imperfections.

  - `esm-ai-channel` : les capacités déclaratives (`registerCapability`) sont désormais provisionnées au backend (`tools.sync.capabilities`, `tools.delta.capabilitiesUpsert/capabilitiesRemoved`) ; un canal arrêté n'est plus redémarrable silencieusement (erreur explicite).
  - `esm-ai-config` : suppression des clés jamais lues (`context.includeModuleConfig`, `security.auditLog`, `observability.eventsEnabled/analyticsEnabled/logLevel`).
  - `esm-ai-events` : suppression des événements jamais émis (`CONFIG_*`, `MESSAGE_STREAMING`, `MESSAGE_STREAM_END`, `PIPELINE_*`) ; `SESSION_ENDED` est maintenant émis à l'arrêt et son payload ne porte plus de `messageCount` fictif.
  - `esm-ai-tools` : suppression de `getToolsSchemaForLLM` (remplacé par `getToolDescriptors`) ; ajout de `getCapabilityDescriptors` ; le paramètre de type `TArgs` inutilisé de `AIToolDefinition` est retiré.
  - `esm-ai-extensions` : `defineAIModule` restaure à son démontage les tools remplacés par un override (fuite corrigée) et nettoie dans l'ordre inverse ; tests ajoutés.
  - `esm-ai-framework` : suppression des hooks obsolètes `useAvailableToolsSchema` et `useAIContextJson` ; `useExecuteTool` utilise `useState` (shim inutile supprimé) ; export de `getToolDescriptors` / `getCapabilityDescriptors`.

### Patch Changes

- Updated dependencies [a158b96]
  - @egen-civitas/esm-ai-config@1.3.0
  - @egen-civitas/esm-ai-events@1.2.0
  - @egen-civitas/esm-ai-tools@1.2.0

## 2.0.1

### Patch Changes

- 098d8dc: Documentation et test de la lecture audio en direct : les fragments `conversation.audio_chunk` sont relayés dès réception, avant la fin du flux de réponse.

## 2.0.0

### Major Changes

- cd1ccd2: Canal temps réel frontend ↔ backend IA (nouveau paquet `esm-ai-channel`, WebSocket `egen-ai.v1`) : provisionnement du catalogue de tools frontend au backend (`tools.sync` / `tools.delta`), exécution des `tool.call` du backend, synchronisation du contexte, conversation texte/voix et TTS.

  - `esm-ai-config` : `backend` ne porte plus d'URL HTTP ni d'endpoints chat/stream, mais `channelUrl`, `heartbeatMs`, `reconnectMinMs`, `reconnectMaxMs`, `requestTimeoutMs`.
  - `esm-ai-tools` : `getToolDescriptors()` / `AIToolDescriptor`.
  - `esm-ai-framework` : démarre/arrête le canal, ré-exporte l'API du canal (`useAIChannelState`, `getConversationClient`, `onToolActivity`…).

### Patch Changes

- Updated dependencies [cd1ccd2]
  - @egen-civitas/esm-ai-config@1.2.0
  - @egen-civitas/esm-ai-tools@1.1.0
