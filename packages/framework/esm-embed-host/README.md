# @egen-civitas/esm-embed-host

Hôte (côté Shell/Core) des applications **embarquées** : iframe sécurisée, poignée de main v2, application des grants,
fournisseurs de capacités, navigation partagée Core ↔ app, et compatibilité du pont 1.1 (`esm-nextjs-utils`).
Spécification : `docs/integration-apps/17-sdk-embed-protocole-v2.md` du dépôt Core.

```ts
import { effectiveGrants } from '@egen-civitas/esm-embed-protocol';
import { createEmbedHost } from '@egen-civitas/esm-embed-host';

const grants = effectiveGrants(manifest.capabilities, { notifications: {}, events: { publish: ['app.studio.*'] } });

const host = createEmbedHost({
  moduleName: manifest.name,
  src: manifest.url,
  grants,
  navigation: { route: manifest.route, mode: manifest.navigation.mode },
  providers: {
    locale: { get, subscribe },                       // services dont le Core est la source
    notifications: { show: (n, from) => toast(n) },
    events: { publish: bus.publish, subscribe: bus.subscribe },
    extensions: { list: (slot) => infos(slot), subscribe },
  },
});
host.mount(container);       // …; host.destroy() au démontage
```

- **Moindre privilège** : la table d'appels de la connexion ne contient que les capacités accordées **et** servies. Une capacité accordée sans fournisseur est refusée (`UNAVAILABLE`).
- **Règle d'or** : le Core ne relaie ni identité/session, ni droits, ni thème, ni appels API authentifiés (ils viennent de Keycloak, des backends, du service de thèmes). Aucun jeton ne transite.
- **Pont 1.1** : une app qui ne parle pas le protocole 2 continue de fonctionner (`ready`, `location`, `navigate`, `resize`, `title`, langue) — sans session. Désactivable : `legacy: false`.
- `HostConnection` est indépendante du DOM (testable avec le vrai client, voir `src/__tests__/harness.ts`).
