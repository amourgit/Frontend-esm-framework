---
'@egen-civitas/esm-api': minor
---

Ajoute un système de middleware composable pour `egenFetch`, et une forme
d'erreur structurée conforme à RFC 9457 (Problem Details) sur
`EgenFetchError`. Purement additif — aucun comportement existant ne change.

**Middleware (`composeMiddlewares`)**

```ts
import { egenFetch, composeMiddlewares, createRetryMiddleware } from '@egen-civitas/esm-api';

const resilientFetch = composeMiddlewares(egenFetch, [createRetryMiddleware()]);
const response = await resilientFetch('/ws/rest/v1/concept');
```

- `composeMiddlewares(handler, middlewares)` compose une liste de middlewares
  autour d'un handler terminal (typiquement `egenFetch`) en une fonction avec
  la même signature d'appel `(url, init?) => Promise<FetchResponse>`.
- `createRetryMiddleware(options?)` fournit une politique de nouvelle
  tentative prête à l'emploi (backoff exponentiel + jitter complet), limitée
  par défaut aux méthodes idempotentes (GET/HEAD/PUT/DELETE/OPTIONS) — aucun
  changement de comportement pour les requêtes non éligibles.

**Erreur structurée (`EgenFetchError.problem`)**

Quand le backend répond avec un corps JSON de la forme RFC 9457 (un objet
avec au moins un champ `title` de type chaîne), `EgenFetchError` expose
désormais ce corps typé sur `err.problem` (avec `type` par défaut à
`'about:blank'` si absent), en plus de `err.responseBody` qui reste
inchangé.
