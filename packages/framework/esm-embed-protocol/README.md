# @egen-civitas/esm-embed-protocol

Protocole v2 d'intégration des applications **embarquées** (iframe) dans EGEN. Aucune dépendance.
Spécification : `docs/integration-apps/17-sdk-embed-protocole-v2.md` du dépôt Core.

| Module | Rôle |
| --- | --- |
| `constants` | version, limites par défaut, champs de session |
| `guards` | validation de la poignée de main (`hello`/`connect`/`port`) et des messages RPC, estimation de taille bornée |
| `capabilities` | catalogue des 12 capacités v1 (`REMOVED_CAPABILITIES` : identité, droits, thème, api, volontairement absentes) et validateurs d'arguments (`validateCall`) |
| `iframe` | droits d'iframe négociés : listes blanches `IFRAME_SANDBOX_TOKENS` / `IFRAME_ALLOW_TOKENS`, `validateIframeRights`, `effectiveIframe` (demande ∩ plafond), `sanitizeIframeRights` |
| `manifest` | `validateManifest` (déclaration `egen-config.json` : capacités, extensions, `iframe`, `config`), `validateConfig`, `effectiveGrants` (demandé ∩ approuvé), contributions d'extension (`validateExtensionDecls`, `allowedContributions`) |
| `negotiate` | `negotiateProtocol` (protocole 2 seul), `negotiateCapabilities` |
| `patterns` | motifs de sujets (`a.b`, `a.b.*`) |
| `rpc` | `RpcEndpoint` : RPC symétrique sur `MessagePort`, dispatch fermé, limites, abonnements |

## Droits d'iframe : l'app demande, l'opérateur approuve, l'hôte applique

```ts
import { effectiveGrants, effectiveIframe } from '@egen-civitas/esm-embed-protocol';

// manifest = egen-config.json de l'app ; approved = plafond de l'opérateur (external-apps.json → grants)
const grants = effectiveGrants(manifest.capabilities, approved);
const iframe = effectiveIframe(manifest.iframe, approved.iframe); // { sandbox: [...], allow: [...] }
```

Effectif = demande ∩ plafond, chaque jeton validé par liste blanche : une app ne s'accorde jamais un droit, `allow-top-navigation*` n'existe pas, et une demande absente n'accorde rien.

```ts
import { RpcEndpoint, validateCall } from '@egen-civitas/esm-embed-protocol';

const { port1, port2 } = new MessageChannel();
const host = new RpcEndpoint({ port: port1, validate: validateCall, handlers: { tenant: { get: () => ({ id: 'acme' }) } } });
const app = new RpcEndpoint({ port: port2 });
await app.call('tenant', 'get'); // { id: 'acme' }
```

Sécurité : la table de dispatch est une `Map` construite des seules propriétés propres ; `constructor`, `__proto__` ou tout chemin dynamique sont inatteignables.
