# @egen-civitas/esm-ai-config

## 1.4.0

### Minor Changes

- 4bab617: Sécurité du canal IA : le frontend peut maintenant vérifier que les ordres `tool.call` viennent bien du backend, et refuser une destination de canal non sûre. Le frontend reste un simple exécutant — toute la décision reste côté backend.

  **Appels de tools signés (standards JWS RFC 7515 / JWT RFC 7519 / JWKS RFC 7517, via `jose`)** : le backend signe l'appel entier (`jws` dans `tool.call`) avec une clé privée ; le frontend ne détient que la clé publique. Il exécute uniquement le contenu signé (`tool`, `args`) et exige : signature valide (algorithmes asymétriques en liste blanche, jamais `none`/HS*), `typ` `egen-ai-call+jwt`, `aud` `egen-ai:frontend`, `sub` = `sessionId` du `session.welcome`, `iat` ≤ 120 s, `exp`, `jti` = `callId`. Un callId authentifié ne s'exécute jamais deux fois (anti-rejeu, y compris après éviction du cache de résultats). Les appels sont admis dans leur ordre d'arrivée (vérification asynchrone, exécution toujours séquentielle) et un `tool.cancel` précoce reste pris en compte. Un appel refusé reçoit un `tool.result` d'erreur explicite (`missing`, `signature`, `expired`, `session`, `claims`, `mismatch`, `replay`, `algorithm`, `key-unavailable`).

  **Désactivé par défaut — aucun changement de comportement tant que rien n'est configuré.** Déploiement progressif `EGEN_AI_SIGNED_CALLS=off → warn → enforce`. Un mode inconnu (faute de frappe) échoue fermé (`enforce`), jamais en `off`. Nouvelles variables relayées par le shell : `EGEN_AI_SIGNED_CALLS`, `EGEN_AI_CHANNEL_JWKS`, `EGEN_AI_CHANNEL_JWKS_URL`, `EGEN_AI_CHANNEL_ALGORITHMS`, `EGEN_AI_CHANNEL_ALLOWED_HOSTS`, `EGEN_AI_ALLOW_INSECURE_CHANNEL`. `validateAIConfig` rejette un JWKS contenant une clé privée ou symétrique, `enforce` sans clé, un algorithme non autorisé.

  **Garde-fou sur la destination du canal (actif par défaut)** : `wss://` obligatoire hors machine locale — **un canal `ws://` vers un hôte distant est désormais refusé** sauf `EGEN_AI_ALLOW_INSECURE_CHANNEL=true` — et épinglage optionnel des hôtes (`api.exemple.ga`, `*.exemple.ga`). Vérifié à chaque (re)connexion ; l'erreur est exposée dans l'état du canal.

  Documentation complète (contrat, exemples Node/Python, génération de clés, rotation, CSP recommandée, limites) dans le README d'`esm-ai-channel`.

## 1.3.1

### Patch Changes

- e716981: Durcissement des tools appelés à distance par le backend IA : `navigate` / `navigate_and_inspect` refusent les destinations externes ; `fetch_data` n'accepte que des chemins d'API relatifs (egenFetch envoyait sinon les credentials vers n'importe quel hôte) ; `download_file` refuse `javascript:` / `data:` et assainit le nom de fichier ; `switch_tenant` valide le slug ; la validation numérique ne convertit plus `''`, `[5]`, `true` en nombre ; les clés `__proto__` / `constructor` ne sont plus transmises ; le masquage des secrets dans les événements fonctionne (clé `apiKey` jamais masquée auparavant) et couvre les objets imbriqués ; des arguments absents ne font plus planter l'exécuteur.

  Correctif : la liste blanche des variables `EGEN_AI_*` du shell ne contenait pas les variables du canal (`EGEN_AI_CHANNEL_URL`, `HEARTBEAT_MS`, `RECONNECT_*`) qui étaient donc ignorées dans le navigateur, et embarquait encore `EGEN_AI_API_KEY`. Elle est resynchronisée et gardée par un test. Le mock de `esm-ai-framework` est aligné sur la config.

  Voir `MIGRATION-AI.md` pour le tableau complet des retraits d'API publique.

## 1.3.0

### Minor Changes

- a158b96: Audit des modules IA : suppression du code mort et correction d'imperfections.

  - `esm-ai-channel` : les capacités déclaratives (`registerCapability`) sont désormais provisionnées au backend (`tools.sync.capabilities`, `tools.delta.capabilitiesUpsert/capabilitiesRemoved`) ; un canal arrêté n'est plus redémarrable silencieusement (erreur explicite).
  - `esm-ai-config` : suppression des clés jamais lues (`context.includeModuleConfig`, `security.auditLog`, `observability.eventsEnabled/analyticsEnabled/logLevel`).
  - `esm-ai-events` : suppression des événements jamais émis (`CONFIG_*`, `MESSAGE_STREAMING`, `MESSAGE_STREAM_END`, `PIPELINE_*`) ; `SESSION_ENDED` est maintenant émis à l'arrêt et son payload ne porte plus de `messageCount` fictif.
  - `esm-ai-tools` : suppression de `getToolsSchemaForLLM` (remplacé par `getToolDescriptors`) ; ajout de `getCapabilityDescriptors` ; le paramètre de type `TArgs` inutilisé de `AIToolDefinition` est retiré.
  - `esm-ai-extensions` : `defineAIModule` restaure à son démontage les tools remplacés par un override (fuite corrigée) et nettoie dans l'ordre inverse ; tests ajoutés.
  - `esm-ai-framework` : suppression des hooks obsolètes `useAvailableToolsSchema` et `useAIContextJson` ; `useExecuteTool` utilise `useState` (shim inutile supprimé) ; export de `getToolDescriptors` / `getCapabilityDescriptors`.

## 1.2.0

### Minor Changes

- cd1ccd2: Canal temps réel frontend ↔ backend IA (nouveau paquet `esm-ai-channel`, WebSocket `egen-ai.v1`) : provisionnement du catalogue de tools frontend au backend (`tools.sync` / `tools.delta`), exécution des `tool.call` du backend, synchronisation du contexte, conversation texte/voix et TTS.

  - `esm-ai-config` : `backend` ne porte plus d'URL HTTP ni d'endpoints chat/stream, mais `channelUrl`, `heartbeatMs`, `reconnectMinMs`, `reconnectMaxMs`, `requestTimeoutMs`.
  - `esm-ai-tools` : `getToolDescriptors()` / `AIToolDescriptor`.
  - `esm-ai-framework` : démarre/arrête le canal, ré-exporte l'API du canal (`useAIChannelState`, `getConversationClient`, `onToolActivity`…).

## 1.1.0

### Minor Changes

- e44019d: Le moteur IA est entièrement côté backend ; le frontend n'est plus qu'une interface.

  - Suppression du paquet `@egen-civitas/esm-ai-memory` (la mémoire de conversation est gérée par le backend).
  - `esm-ai-config` : suppression de `provider` (modèle, température, clé API, mode direct) et de `memory` ; `backend.stream` remplace `provider.stream`.
  - `esm-ai-events` : suppression des évènements `MEMORY_*`.
  - `esm-ai-framework` : ne ré-exporte plus `AIProviderConfig` ni `AIMemoryConfig`.
