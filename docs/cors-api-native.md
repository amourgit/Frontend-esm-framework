# Contrat CORS de l'API pour une app native (D6, dépendance X-1)

En natif, l'origine du WebView (`http://localhost` ou équivalent) n'est pas celle de l'API : toute requête est **cross-origin** et exige un preflight (`OPTIONS`). Le backend doit répondre pour l'origine locale du Host.

## En-têtes que le framework ajoute d'office (`egenFetch`)

Liste figée par le test `packages/framework/esm-api/src/egen-fetch.headers.test.ts` : un nouvel en-tête automatique le fait échouer, et doit être ajouté ici.

| En-tête | Quand | Origine |
|---|---|---|
| `Accept` | toujours (`application/json`, sauf si l'appelant le retire) | `egenFetch` |
| `Authorization` | natif : jeton fourni par le Host (`platform.session`) ; **jamais en Web** (cookie) | `egenFetch` + fournisseur d'autorisation (D1) |
| `Disable-WWW-Authenticate` | requêtes sous `restBaseUrl` | `egenFetch` |
| `X-Tenant-ID` | quand un tenant est actif | `esm-api/tenant.ts` |
| `Content-Type` | corps JSON, posé **par l'appelant** | appelant |

Les apps peuvent en ajouter d'autres : elles doivent alors les déclarer au backend.

## Ce que le backend doit répondre

- `Access-Control-Allow-Origin` : l'origine locale du Host (liste fermée, pas `*` : les requêtes natives n'envoient **pas** de cookie, `credentials: 'omit'`).
- `Access-Control-Allow-Headers` : au minimum `Accept, Authorization, Content-Type, Disable-WWW-Authenticate, X-Tenant-ID`.
- `Access-Control-Allow-Methods` : celles utilisées par l'API (`GET, POST, PUT, DELETE, OPTIONS`).
- `Access-Control-Max-Age` : une valeur raisonnable pour limiter les preflights.
- Réponse `401` **sans** `WWW-Authenticate` bloquant (le framework envoie `Disable-WWW-Authenticate`), pour déclencher le rafraîchissement unique puis le rejeu (D3).
