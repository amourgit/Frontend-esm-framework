# @egen-civitas/esm-ai-memory

Persistance de conversation pour l'assistant IA EGEN — historique complet
(messages **et** appels de tools avec leur résultat brut, sans exception),
scopé strictement par utilisateur authentifié, stocké localement (IndexedDB)
et synchronisé vers un backend interchangeable.

## Pourquoi ce package existe

Sans lui, l'état de la conversation vivait uniquement dans le `useState`
local du composant React affichant le widget — fermer le panneau (démontage
du composant) ou recharger la page effaçait tout. Ce package déplace la
source de vérité dans un store global persistant, indépendant du cycle de
vie de n'importe quel composant.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  React (hooks.ts)                                            │
│  useConversationMessages() / useConversationSummaries() / …  │
└───────────────────────────┬───────────────────────────────────┘
                             │ useSyncExternalStore-like
┌───────────────────────────▼───────────────────────────────────┐
│  store.ts — source de vérité réactive (survit au démontage)   │
│  s'abonne à sessionStore (@egen-civitas/esm-api) : toute       │
│  connexion/déconnexion/changement d'utilisateur recharge       │
│  intégralement l'historique pour le nouvel utilisateur         │
└──────────┬────────────────────────────────────┬────────────────┘
           │ écrit à CHAQUE interaction          │ toutes les ~20s,
           │ (immédiat)                          │ synchronise ce qui a
           ▼                                     │ plus de 3 min d'attente
┌────────────────────────┐          ┌────────────▼─────────────────┐
│  IndexedDB (local)      │◄─────────┤  sync-orchestrator.ts         │
│  indexeddb-adapter.ts   │  hydrate │  dirty-tracking, débounce,    │
│  scopé par userId       │  au login│  fusion "dernière écriture    │
└────────────────────────┘          │  gagne"                       │
                                     └────────────┬───────────────────┘
                                                  ▼
                                     ┌────────────────────────────────┐
                                     │  Backend (backend-adapter.ts)   │
                                     │  REST via egenFetch — dégrade   │
                                     │  toujours silencieusement si    │
                                     │  absent (aujourd'hui : absent)  │
                                     └────────────────────────────────┘
```

## Le point d'extension central : `ConversationStorageAdapter`

Toute la logique métier ne parle **qu'à travers** cette interface (voir
`types.ts`) — jamais directement à IndexedDB ou à une API REST :

```ts
interface ConversationStorageAdapter {
  listConversations(userId: string): Promise<ConversationSummary[]>;
  getConversation(userId: string, conversationId: string): Promise<StoredConversation | null>;
  saveConversation(conversation: StoredConversation): Promise<void>;
  deleteConversation(userId: string, conversationId: string): Promise<void>;
}
```

Changer de stockage (local → un autre backend, une autre techno locale que
IndexedDB…) = écrire un nouvel adaptateur qui implémente cette interface,
sans toucher au reste du package. C'est ce qui rend le passage du "tout en
local aujourd'hui" au "local + backend une fois prêt" possible sans
réécriture.

## Pourquoi IndexedDB et pas `localStorage`

`localStorage` est limité à ~5-10 Mo par origine et son API est synchrone.
Avec la règle "tout est conservé, y compris le résultat brut de chaque appel
de tool" (voir `@egen-civitas/esm-ai-tools`, dont certains tools comme
`inspect_interface` peuvent renvoyer des centaines de Ko par appel),
`localStorage` saturerait vite. IndexedDB est asynchrone et dispose d'un
quota bien plus large.

## Règle de synchronisation (3 minutes)

- Le **local** est mis à jour à **chaque** interaction — immédiat.
- Le **backend** n'est sollicité qu'après qu'une conversation soit restée
  "dirty" (modifiée localement, pas encore synchronisée) pendant **3
  minutes**, pour ne pas multiplier les requêtes réseau à chaque message.
- Un flush best-effort supplémentaire est déclenché sur `visibilitychange`
  (onglet caché) et `pagehide` (fermeture) pour limiter la perte des toutes
  dernières minutes.
- À la connexion, `hydrateFromBackend()` rapatrie l'historique backend et le
  fusionne dans le local **avant** que la conversation ne reprenne (fusion
  "dernière écriture gagne" par comparaison de `updatedAt`).

## Contrat REST attendu côté backend (pas encore implémenté)

```
GET    /ai/conversations         → ConversationSummary[] (utilisateur authentifié implicite)
GET    /ai/conversations/:id     → StoredConversation
PUT    /ai/conversations/:id     → upsert intégral, body = StoredConversation
DELETE /ai/conversations/:id     → 204
```

Tant que ce backend n'existe pas, `backend-adapter.ts` dégrade toujours
silencieusement (`ok: false` traité comme "rien à faire") — le
fonctionnement en local seul n'est jamais interrompu.

## Usage

```ts
// Une seule fois, au boot de l'app assistant :
import { initConversationMemory } from '@egen-civitas/esm-ai-memory';
initConversationMemory();

// Dans les composants React :
import { useConversationMessages, useConversationMemoryStatus } from '@egen-civitas/esm-ai-memory';

function ChatPanel() {
  const messages = useConversationMessages();
  const status = useConversationMemoryStatus();
  // ...
}

// Mutations (typiquement depuis le hook de conversation, ex: useAIChat) :
import { addUserMessage, addAssistantMessage, recordToolCall, startNewConversation } from '@egen-civitas/esm-ai-memory';
```

## Tests

```
yarn workspace @egen-civitas/esm-ai-memory test
```

Utilise `fake-indexeddb` (voir `src/test-setup.ts`) pour une IndexedDB en
mémoire fidèle à la spec, sans dépendre d'un vrai navigateur.
