# Migration — Couche IA : le frontend n'est plus qu'une interface

Depuis octobre 2026, **tout le moteur IA est côté backend** (LLM, prompt, mémoire, STT/TTS, orchestration).
Le frontend dialogue avec lui par **un canal temps réel unique** (`@egen-civitas/esm-ai-channel`, WebSocket
`egen-ai.v1`) : provisionnement des tools frontend, appels de tools par le backend, contexte, conversation, audio.

> Ces retraits ont été publiés en versions *mineures* (`esm-ai-config` 1.2/1.3, `esm-ai-events` 1.2,
> `esm-ai-tools` 1.1/1.2, `esm-ai-framework` 1.2/1.3) alors que, strictement, ils sont cassants. Aucun
> consommateur n'existait dans `Frontend-esm-core` ni dans ce dépôt (vérifié par recherche exhaustive).
> Ce tableau est la référence pour tout autre projet.

## Paquets

| Retiré | Remplacement |
|---|---|
| `@egen-civitas/esm-ai-memory` | Aucun côté frontend — la mémoire/l'historique sont tenus par le backend et réhydratés par `conversation.history`. |

## Configuration (`@egen-civitas/esm-ai-config`)

| Retiré | Remplacement |
|---|---|
| `provider.*` (provider, model, temperature, topP, topK, maxTokens, apiKey, apiEndpoint, stream) | Aucun — le modèle est un détail du backend. **Plus aucune clé d'API dans le frontend.** |
| `memory.*` | Aucun (backend). |
| `backend.baseUrl`, `chatEndpoint`, `streamEndpoint`, `maxRetries`, `retryDelayMs` | `backend.channelUrl` (`EGEN_AI_CHANNEL_URL`), `heartbeatMs`, `reconnectMinMs`, `reconnectMaxMs`, `requestTimeoutMs` |
| `context.includeModuleConfig`, `security.auditLog`, `observability.eventsEnabled / analyticsEnabled / logLevel` | Aucun — ces clés n'étaient lues nulle part. |
| Variables `EGEN_AI_PROVIDER/MODEL/TEMPERATURE/TOP_P/TOP_K/MAX_TOKENS/STREAM/API_KEY/API_ENDPOINT/BACKEND_URL/CHAT_ENDPOINT/STREAM_ENDPOINT/MAX_RETRIES/RETRY_DELAY/MEMORY_*/AUDIT_LOG/EVENTS_ENABLED/ANALYTICS_ENABLED/LOG_LEVEL` | `EGEN_AI_CHANNEL_URL`, `EGEN_AI_HEARTBEAT_MS`, `EGEN_AI_RECONNECT_MIN_MS`, `EGEN_AI_RECONNECT_MAX_MS` (+ inchangées : `ENABLED`, `REQUEST_TIMEOUT`, `CONTEXT_*`, `REQUIRED_PRIVILEGES`, `VALIDATE_TOOLS`, `TOOL_TIMEOUT`, `DEBUG`) |

La liste blanche des variables injectées dans le navigateur (`esm-app-shell/rspack.config.js`) est synchronisée
avec ces clés par un test (`esm-ai-config/src/env-bridge.test.ts`).

## Événements (`@egen-civitas/esm-ai-events`)

| Retiré | Remplacement |
|---|---|
| `CONFIG_CHANGED`, `CONFIG_ERROR`, `MESSAGE_STREAMING`, `MESSAGE_STREAM_END`, `PIPELINE_STARTED/COMPLETED/FAILED` (+ types de payload) | Jamais émis — rien à migrer. |
| `SESSION_ENDED.messageCount` | Retiré (valeur fictive) ; `SESSION_ENDED` est maintenant réellement émis à `cleanupAIFramework()`. |

## Tools (`@egen-civitas/esm-ai-tools`)

| Retiré / changé | Remplacement |
|---|---|
| `getToolsSchemaForLLM(privileges)` | `getToolDescriptors(privileges)` (JSON Schema + `id`, `moduleName`, `requiredPrivileges`) ; `getCapabilityDescriptors(privileges)` pour les capacités. Les deux sont provisionnés automatiquement au backend par le canal. |
| `AIToolDefinition<TArgs, TResult>` | `AIToolDefinition<TResult>` (le paramètre `TArgs` n'était pas utilisé). |
| `navigate` : URL absolue externe acceptée | Refusée — seules les routes de l'application et les URL de **même origine** sont autorisées. |
| `fetch_data` : tout endpoint | Chemin relatif à l'API uniquement (`/…`, sans `//`, `\`, `..`, ni `http…`). |
| `download_file` : toute URL | `http(s)` uniquement ; nom de fichier assaini ; contenu base64 validé. |
| `switch_tenant` : tout slug | Un seul label DNS valide. |
| Validation numérique | `''`, `'  '`, `[5]`, `true`, `Infinity` ne sont plus convertis en nombre. |

## Hooks / API (`@egen-civitas/esm-ai-framework`)

| Retiré | Remplacement |
|---|---|
| `useAvailableToolsSchema()` | Inutile : le canal provisionne le catalogue au backend. `getToolDescriptors()` si besoin d'inspecter. |
| `useAIContextJson()` | Inutile : le contexte est poussé par le canal (`context.update`). |
| Moteur LLM / client direct / prompt système côté frontend | `useAIChannelState()`, `getConversationClient()`, `onToolActivity()` (voir `esm-ai-channel/README.md`). |

## `defineAIModule` (`@egen-civitas/esm-ai-extensions`)

Comportement corrigé : la fonction de nettoyage **restaure** désormais le tool remplacé par `toolOverrides`
(ou le retire s'il n'existait pas) et nettoie dans l'ordre inverse de l'enregistrement.
