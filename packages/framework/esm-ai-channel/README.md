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
La destination est vérifiée à chaque connexion : `wss://` obligatoire hors machine locale (`EGEN_AI_ALLOW_INSECURE_CHANNEL=true` pour déroger), hôtes épinglables via `EGEN_AI_CHANNEL_ALLOWED_HOSTS`.

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
| `tools.sync` | `{ revision, tools: ToolDescriptor[], capabilities: CapabilityDescriptor[] }` — catalogue complet, filtré par les privilèges de l'utilisateur |
| `tools.delta` | `{ revision, upsert, removed, capabilitiesUpsert, capabilitiesRemoved }` |
| `tool.result` | `{ callId, success, data?, error?, durationMs }` |
| `context.update` | `{ revision, context, truncated, size }` |
| `conversation.message` | `{ text, mode? }` — ouvre un flux (`replyTo` = id de ce message) |
| `conversation.audio` | `{ base64Audio, mimeType, mode?, transcriptHint? }` — idem |
| `conversation.cancel` | `{ streamId }` |
| `conversation.reset` | `{}` — efface la conversation côté backend |
| `conversation.history.request` | `{}` → `conversation.history` |
| `speech.request` | `{ text, voice? }` → `speech.audio` |

`ToolDescriptor` : `{ id, name, description, parameters (JSON Schema objet), requiredPrivileges[], moduleName, metadata? }`. `id` est la valeur à passer dans `tool.call.tool`.
`CapabilityDescriptor` : `{ id, name, description, requiredPrivileges[], parameters?, metadata? }` — ce que le frontend sait faire sans tool exécutable associé (information pour le planificateur de l'agent, non appelable).

### Serveur → client

| Type | Payload |
|---|---|
| `tools.request_sync` | `{}` — demande un `tools.sync` complet |
| `tool.call` | `{ callId, tool, arguments, timeoutMs?, streamId?, jws? }` — `jws` : appel signé par le backend (voir « Sécurité ») |
| `tool.cancel` | `{ callId }` |
| `conversation.transcript` | `{ text }` (replyTo = flux) |
| `conversation.delta` | `{ text }` (replyTo = flux) |
| `conversation.audio_chunk` | `{ base64, seq, sampleRate?, final? }` — PCM 16 bits LE mono (replyTo = flux). **Lu en direct** : chaque fragment est planifié bout à bout dès réception, sans attendre la fin de la réponse. Envoyer le premier fragment au plus tard avec les premiers `conversation.delta`, `seq` croissant, `final: true` sur le dernier. |
| `conversation.end` / `conversation.error` | `{ text? }` / `{ message, code? }` — terminent le flux |
| `conversation.history` | `{ messages[] }` — réponse à la requête, ou poussé spontanément |
| `speech.audio` | `{ audioBase64 \| null }` (replyTo = requête) |
| `error` | `{ message, code? }` (avec `replyTo` : échec de la requête correspondante) |

### Garanties côté frontend

- Les `tool.call` passent par le pipeline complet de `esm-ai-tools` (résolution, validation des arguments, permissions, timeout, décorateurs) et sont exécutés **séquentiellement**.
- `callId` idempotent : un appel rejoué reçoit le résultat déjà calculé sans ré-exécution.
- `tool.result` est mis en file pendant une coupure et livré à la reconnexion (60 s max).
- Hors ligne, l'UI voit un statut explicite (`useAIChannelState()`), les envois non fiables échouent avec `ChannelNotReadyError` — aucune réponse n'est jamais inventée.

## Sécurité : authentifier les ordres du backend

Le frontend n'a aucune intelligence propre : il exécute ce que le backend lui demande. Toute la décision (validation, confirmation, garde-fous) reste côté backend. Reste à garantir que **l'ordre vient bien de VOTRE backend** — ni d'un proxy qui terminerait TLS, ni d'un canal redirigé par une config altérée, ni d'un script de la page qui fabriquerait une trame `tool.call`.

La réponse repose sur des **standards**, pas sur un format maison : **JWS** compact (RFC 7515) / **JWT** (RFC 7519), clés publiques en **JWKS** (RFC 7517), typage explicite du jeton (RFC 8725), vérification par la bibliothèque [`jose`](https://github.com/panva/jose) (WebCrypto, zéro dépendance). Le backend signe avec une clé **privée** qui ne quitte jamais le serveur ; le frontend ne détient que la clé **publique** — la lire ne permet rien de forger.

### Contrat du `tool.call` signé

Trame : `{ callId, tool, arguments, jws }`. `jws` est un JWS compact :

| Élément | Valeur |
|---|---|
| En-tête `alg` | `ES256` (par défaut ; supporté par tous les navigateurs). `EdDSA` : seulement Chrome ≥ 137 / Firefox ≥ 129 / Safari ≥ 17 |
| En-tête `typ` | `egen-ai-call+jwt` — empêche de réutiliser un autre JWT du système comme ordre |
| En-tête `kid` | identifiant de la clé (rotation) |
| `aud` | `egen-ai:frontend` |
| `sub` | **`sessionId` annoncé dans `session.welcome`** — l'ordre n'est valable que pour CETTE session |
| `jti` | le `callId` (unicité : un callId ne s'exécute jamais deux fois) |
| `iat`, `exp` | émission et expiration ; un jeton émis il y a plus de **120 s** est refusé (dérive d'horloge tolérée : 30 s) |
| `tool`, `args` | **ce qui sera exécuté** — le frontend ignore les champs `tool`/`arguments` non signés de la trame |
| `timeoutMs?`, `streamId?` | optionnels, signés eux aussi |

Les valeurs ci-dessus sont exportées par `EGEN_AI_TOOL_CALL_CONTRACT`.

**Backend Node (`jose`)**

```ts
import { SignJWT } from 'jose';

const jws = await new SignJWT({ tool, args, timeoutMs, streamId })
  .setProtectedHeader({ alg: 'ES256', typ: 'egen-ai-call+jwt', kid: 'k-2026-10' })
  .setAudience('egen-ai:frontend')
  .setSubject(sessionId) //  celui du session.welcome
  .setJti(callId)
  .setIssuedAt()
  .setExpirationTime('60s')
  .sign(privateKey);
send({ type: 'tool.call', payload: { callId, tool, arguments: args, jws } });
```

**Backend Python (`PyJWT`)**

```python
now = int(time.time())
jws = jwt.encode(
    {"tool": tool, "args": args, "aud": "egen-ai:frontend", "sub": session_id,
     "jti": call_id, "iat": now, "exp": now + 60},
    private_key_pem, algorithm="ES256",
    headers={"typ": "egen-ai-call+jwt", "kid": "k-2026-10"},
)
```

**Générer la paire de clés** (la clé privée va dans le coffre-fort du backend, jamais dans le frontend) :

```js
import { generateKeyPair, exportJWK, exportPKCS8 } from 'jose';
const { publicKey, privateKey } = await generateKeyPair('ES256', { extractable: true });
console.log(JSON.stringify({ keys: [{ ...(await exportJWK(publicKey)), kid: 'k-2026-10', alg: 'ES256', use: 'sig' }] }));
console.log(await exportPKCS8(privateKey));
```

### Configuration frontend

| Variable | Défaut | Rôle |
|---|---|---|
| `EGEN_AI_SIGNED_CALLS` | `off` | `off` : comportement historique · `warn` : vérifie, journalise, exécute quand même · `enforce` : **refuse tout appel sans signature valide** (échec fermé) |
| `EGEN_AI_CHANNEL_JWKS` | — | JWKS **public** (JSON) épinglé dans le build — recommandé |
| `EGEN_AI_CHANNEL_JWKS_URL` | — | JWKS distant (https) pour la rotation ; ignoré si `EGEN_AI_CHANNEL_JWKS` est défini |
| `EGEN_AI_CHANNEL_ALGORITHMS` | `ES256` | Algorithmes acceptés — asymétriques uniquement (jamais `none`/HS*) |
| `EGEN_AI_CHANNEL_ALLOWED_HOSTS` | — | Épinglage des hôtes du canal : `api.exemple.ga`, `ai.exemple.ga:8443`, `*.exemple.ga` |
| `EGEN_AI_ALLOW_INSECURE_CHANNEL` | `false` | Autorise `ws://` vers un hôte non local (déconseillé) |

La configuration est validée au chargement (`validateAIConfig`) : `enforce` sans clé, JWKS contenant une clé privée ou symétrique, algorithme non autorisé, mode inconnu (une faute de frappe échoue **fermé**, jamais en « off ») sont des erreurs.

### Déploiement progressif

1. `EGEN_AI_SIGNED_CALLS=warn` + `EGEN_AI_CHANNEL_JWKS=…` : les appels non signés ou invalides sont **signalés** (console, dédoublonnés 60 s) mais exécutés.
2. Le backend commence à signer ; plus aucun avertissement.
3. `EGEN_AI_SIGNED_CALLS=enforce` : un appel refusé reçoit un `tool.result` d'erreur `Appel refusé (<code>) : …` (`missing`, `signature`, `expired`, `session`, `claims`, `mismatch`, `replay`, `algorithm`, `key-unavailable`) — visible côté backend et dans l'activité des tools.

**Rotation** : publier la nouvelle clé (nouveau `kid`) dans le JWKS **avant** de signer avec, retirer l'ancienne après expiration (≤ 2 minutes de jetons en vol). Avec un JWKS épinglé, cela suppose un redéploiement du frontend ; avec `EGEN_AI_CHANNEL_JWKS_URL`, la rotation est immédiate (au prix de faire confiance à l'URL — https obligatoire).

### Ce que cela protège — et ce que cela ne protège pas

- ✅ Trames `tool.call` forgées par un script de la page, une extension, un proxy ou un faux serveur de canal.
- ✅ Rejeu d'un ordre capturé (session, âge, `jti` unique) et altération de `tool`/`args` en transit.
- ✅ Confusion d'algorithme (`none`, HS256 signé avec la clé publique), mauvais destinataire, mauvais type de jeton.
- ❌ Un **XSS** : un script qui s'exécute dans la page agit comme l'utilisateur, avec ou sans canal. La protection est la CSP ci-dessous.
- ❌ `tool.cancel` n'est pas signé : un tiers peut seulement empêcher l'exécution d'un appel encore en file (jamais en déclencher un).
- Un backend légitime mais **compromis** signe de vrais ordres : sa sécurité (validation, confirmation, journalisation) reste de son ressort.

### Durcir l'hébergement du shell

La CSP vit dans les en-têtes HTTP du serveur qui sert le shell (pas dans le code). À déployer d'abord en **Report-Only** — le shell charge des micro-apps dynamiquement, la liste `script-src` doit couvrir leurs origines :

```
Content-Security-Policy-Report-Only:
  default-src 'self';
  script-src 'self' 'wasm-unsafe-eval' https://cdn.exemple.ga;
  connect-src 'self' https://api.exemple.ga wss://api.exemple.ga;
  object-src 'none'; base-uri 'self'; frame-ancestors 'self';
  require-trusted-types-for 'script'; report-to csp-endpoint
```

Côté serveur du canal : vérifier l'en-tête `Origin` à l'upgrade WebSocket (sinon un autre site peut ouvrir le canal avec les cookies de l'utilisateur) et, idéalement, remplacer le cookie nu par un **ticket à usage unique** délivré par une API authentifiée.

