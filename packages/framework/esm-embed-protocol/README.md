# @egen-civitas/esm-embed-protocol

Protocole v2 d'intégration des applications **embarquées** (iframe) dans EGEN. Aucune dépendance.
Spécification : `docs/integration-apps/17-sdk-embed-protocole-v2.md` du dépôt Core.

| Module | Rôle |
| --- | --- |
| `constants` | version, limites par défaut, champs de session |
| `guards` | validation de la poignée de main (`hello`/`connect`/`port`) et des messages RPC, estimation de taille bornée |
| `capabilities` | catalogue des 12 capacités v1 (`REMOVED_CAPABILITIES` : identité, droits, thème, api, volontairement absentes) et validateurs d'arguments (`validateCall`) |
| `manifest` | `validateManifest`, `effectiveGrants` (demandé ∩ approuvé), contributions d'extension (`validateExtensionDecls`, `allowedContributions`) |
| `negotiate` | `negotiateProtocol`, `negotiateCapabilities` |
| `patterns` | motifs de sujets (`a.b`, `a.b.*`) |
| `rpc` | `RpcEndpoint` : RPC symétrique sur `MessagePort`, dispatch fermé, limites, abonnements |

```ts
import { RpcEndpoint, validateCall } from '@egen-civitas/esm-embed-protocol';

const { port1, port2 } = new MessageChannel();
const host = new RpcEndpoint({ port: port1, validate: validateCall, handlers: { tenant: { get: () => ({ id: 'acme' }) } } });
const app = new RpcEndpoint({ port: port2 });
await app.call('tenant', 'get'); // { id: 'acme' }
```

Sécurité : la table de dispatch est une `Map` construite des seules propriétés propres ; `constructor`, `__proto__` ou tout chemin dynamique sont inatteignables.
