# @egen-civitas/esm-embed-protocol

Protocole v2 d'intégration des applications **embarquées** (iframe) dans EGEN. Aucune dépendance.
Spécification : `docs/integration-apps/17-sdk-embed-protocole-v2.md` du dépôt Core.

| Module | Rôle |
| --- | --- |
| `constants` | version, limites par défaut, champs de session |
| `guards` | validation de la poignée de main (`hello`/`connect`/`port`) et des messages RPC, estimation de taille bornée |
| `capabilities` | catalogue des 15 capacités v1 et validateurs d'arguments (`validateCall`) |
| `manifest` | `validateManifest`, `effectiveGrants` (demandé ∩ approuvé) |
| `negotiate` | `negotiateProtocol`, `negotiateCapabilities` |
| `patterns` | motifs de sujets (`a.b`, `a.b.*`) |
| `rpc` | `RpcEndpoint` : RPC symétrique sur `MessagePort`, dispatch fermé, limites, abonnements |

```ts
import { RpcEndpoint, validateCall } from '@egen-civitas/esm-embed-protocol';

const { port1, port2 } = new MessageChannel();
const host = new RpcEndpoint({ port: port1, validate: validateCall, handlers: { session: { get: () => ({ authenticated: true }) } } });
const app = new RpcEndpoint({ port: port2 });
await app.call('session', 'get'); // { authenticated: true }
```

Sécurité : la table de dispatch est une `Map` construite des seules propriétés propres ; `constructor`, `__proto__` ou tout chemin dynamique sont inatteignables.
