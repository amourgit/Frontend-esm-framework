# @egen-civitas/esm-ai-channel

Canal **temps réel** (WebSocket) entre le frontend EGEN et le backend IA. C'est le **seul** point de contact avec le backend IA : le frontend n'est qu'une interface (affichage, capture/lecture audio, exécution des tools frontend demandés par le backend).

```
backend IA ◄──────────── WebSocket (egen-ai.v1) ────────────► frontend
  LLM, prompt, mémoire,        tools.sync / tools.delta  ──►  catalogue des tools frontend
  STT/TTS, orchestration  ◄──  tool.call ─ tool.result   ──►  exécution (navigation, écran, UI…)
                          ◄──  context.update            ──►  contexte EGEN (user, tenant, route, écran)
                          ◄──  conversation.* / speech.* ──►  texte, voix, audio
```

## Architecture (modulaire)

| Couche | Fichier | Rôle |
|---|---|---|
| Protocole | `protocol.ts` | Enveloppes versionnées et types de messages |
| Transport | `transport.ts` | Socket, reconnexion exponentielle + jitter, heartbeat |
| Canal | `channel.ts` | Handshake, envoi typé, `request`, `openStream`, file fiable, modules |
| Modules | `modules/` | `tools-provisioning`, `tool-dispatcher`, `context-sync`, `conversation` |
| Session | `session.ts` | Assemblage + `startAIChannel()` / `stopAIChannel()` |

Un module = `{ name, attach(channel) → detach }`. Des extensions peuvent ajouter les leurs via `startAIChannel({ modules })`.
`initAIFramework()` démarre le canal automatiquement quand l'IA est activée.

## Configuration (`@egen-civitas/esm-ai-config`)

`backend.channelUrl` (`EGEN_AI_CHANNEL_URL`, défaut `${egenBase}/api/ai/ws`), `heartbeatMs`, `reconnectMinMs`, `reconnectMaxMs`, `requestTimeoutMs`.
`ws(s)://`, `http(s)://` (converti) ou chemin relatif. Authentification : cookies de session (même origine) ; le serveur refuse avec le code de fermeture **4401/4403** (pas de reconnexion).

## Protocole v1

Sous-protocole WebSocket : `egen-ai.v1`. Chaque trame texte est une enveloppe JSON :

```json
{ "v": 1, "id": "m-…", "type": "tool.call", "ts": 1760000000000, "replyTo": "m-…", "payload": { } }
```

`replyTo` corrèle une réponse (ou un message de flux) à la requête d'origine.

### Établissement

1. Client → `session.hello` `{ clientId, protocol: 1, locale, capabilities[], resumeSessionId? }`
2. Serveur → `session.welcome` `{ sessionId, protocol: 1, heartbeatMs? }` (sans réponse sous 10 s, le client reconnecte)
3. Client → `tools.sync` puis `context.update` (à **chaque** (re)connexion)

Le client envoie `ping` toutes les `heartbeatMs` ; le serveur répond `pong`. Sans aucune trame reçue pendant 2,5 × `heartbeatMs`, le client reconnecte.

### Client → serveur

| Type | Payload |
|---|---|
| `tools.sync` | `{ revision, tools: ToolDescriptor[] }` — catalogue complet, filtré par les privilèges de l'utilisateur |
| `tools.delta` | `{ revision, upsert: ToolDescriptor[], removed: string[] }` |
| `tool.result` | `{ callId, success, data?, error?, durationMs }` |
| `context.update` | `{ revision, context, truncated, size }` |
| `conversation.message` | `{ text, mode? }` — ouvre un flux (`replyTo` = id de ce message) |
| `conversation.audio` | `{ base64Audio, mimeType, mode?, transcriptHint? }` — idem |
| `conversation.cancel` | `{ streamId }` |
| `conversation.reset` | `{}` — efface la conversation côté backend |
| `conversation.history.request` | `{}` → `conversation.history` |
| `speech.request` | `{ text, voice? }` → `speech.audio` |

`ToolDescriptor` : `{ id, name, description, parameters (JSON Schema objet), requiredPrivileges[], moduleName, metadata? }`. `id` est la valeur à passer dans `tool.call.tool`.

### Serveur → client

| Type | Payload |
|---|---|
| `tools.request_sync` | `{}` — demande un `tools.sync` complet |
| `tool.call` | `{ callId, tool, arguments, timeoutMs?, streamId? }` |
| `tool.cancel` | `{ callId }` |
| `conversation.transcript` | `{ text }` (replyTo = flux) |
| `conversation.delta` | `{ text }` (replyTo = flux) |
| `conversation.audio_chunk` | `{ base64, seq, sampleRate?, final? }` — PCM 16 bits LE mono (replyTo = flux) |
| `conversation.end` / `conversation.error` | `{ text? }` / `{ message, code? }` — terminent le flux |
| `conversation.history` | `{ messages[] }` — réponse à la requête, ou poussé spontanément |
| `speech.audio` | `{ audioBase64 \| null }` (replyTo = requête) |
| `error` | `{ message, code? }` (avec `replyTo` : échec de la requête correspondante) |

### Garanties côté frontend

- Les `tool.call` passent par le pipeline complet de `esm-ai-tools` (résolution, validation des arguments, permissions, timeout, décorateurs) et sont exécutés **séquentiellement**.
- `callId` idempotent : un appel rejoué reçoit le résultat déjà calculé sans ré-exécution.
- `tool.result` est mis en file pendant une coupure et livré à la reconnexion (60 s max).
- Hors ligne, l'UI voit un statut explicite (`useAIChannelState()`), les envois non fiables échouent avec `ChannelNotReadyError` — aucune réponse n'est jamais inventée.
