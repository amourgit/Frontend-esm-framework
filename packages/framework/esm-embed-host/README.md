# @egen-civitas/esm-embed-host

Hôte (côté Shell/Core) des applications **embarquées** : iframe sécurisée, poignée de main v2, application des grants,
fournisseurs de capacités, navigation partagée Core ↔ app, et compatibilité du pont 1.1 (`esm-nextjs-utils`).
Spécification : `docs/integration-apps/17-sdk-embed-protocole-v2.md` du dépôt Core.

```ts
import { effectiveGrants } from '@egen-civitas/esm-embed-protocol';
import { createEmbedHost, createFetchApiProvider } from '@egen-civitas/esm-embed-host';

const grants = effectiveGrants(manifest.capabilities, { theme: {}, notifications: {}, events: { publish: ['app.studio.*'] } });

const host = createEmbedHost({
  moduleName: manifest.name,
  src: manifest.url,
  grants,
  navigation: { route: manifest.route, mode: manifest.navigation.mode },
  providers: {
    session: { get, subscribe },                      // services du Core
    theme: { get, subscribe },
    notifications: { show: (n, from) => toast(n) },
    events: { publish: bus.publish, subscribe: bus.subscribe },
    api: createFetchApiProvider({ baseUrl: API_URL, getHeaders: authHeaders }),
  },
});
host.mount(container);       // …; host.destroy() au démontage
```

- **Moindre privilège** : la table d'appels de la connexion ne contient que les capacités accordées **et** servies. Une capacité accordée sans fournisseur est refusée (`UNAVAILABLE`).
- **Jamais de jeton ni de `sessionId`** : `session` est filtrée par liste blanche ; `api.fetch` s'exécute côté Core (`createFetchApiProvider`), sans cookies ni authentification vers les hôtes externes, sans redirection.
- **Pont 1.1** : une app qui ne parle pas le protocole 2 continue de fonctionner (`ready`, `location`, `navigate`, `resize`, `title`). Désactivable : `legacy: false`.
- `HostConnection` est indépendante du DOM (testable avec le vrai client, voir `src/__tests__/harness.ts`).
