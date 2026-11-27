# @egen-civitas/esm-embed-host

Hôte (côté Shell/Core) des applications **embarquées** : iframe sécurisée, poignée de main v2, application des grants,
fournisseurs de capacités, navigation partagée Core ↔ app. Une seule voie : le protocole 2 (SDK `esm-embed-client`).
Spécification : `docs/integration-apps/17-sdk-embed-protocole-v2.md` du dépôt Core.

```ts
import { effectiveGrants, effectiveIframe } from '@egen-civitas/esm-embed-protocol';
import { createEmbedHost } from '@egen-civitas/esm-embed-host';

const approved = { notifications: {}, events: { publish: ['app.studio.*'] }, iframe: { sandbox: ['allow-downloads'], allow: ['clipboard-write'] } };
const grants = effectiveGrants(manifest.capabilities, approved);
const iframe = effectiveIframe(manifest.iframe, approved.iframe); // droits d'iframe effectifs (demande ∩ plafond)

const host = createEmbedHost({
  moduleName: manifest.name,
  src: manifest.url,
  grants,
  iframe,
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
- **Droits d'iframe négociés** : le socle (`allow-scripts allow-same-origin allow-forms allow-popups`) s'applique à toute app ; `iframe` (droits effectifs) ne peut que l'étendre (`allow-downloads`, `allow-modals`, `clipboard-*`, `fullscreen`…). L'hôte revalide chaque jeton par liste blanche et pose `sandbox` et `allow`. `allow-same-origin` + `allow-scripts` sur la même origine que le Shell est signalé (bac à sable sans effet).
- **Voie unique** : le pont 1.1 (`{ egen: 1 }`) est retiré ; ses messages sont ignorés. Une app doit adopter `@egen-civitas/esm-embed-client`.
- `HostConnection` est indépendante du DOM (testable avec le vrai client, voir `src/__tests__/harness.ts`).
