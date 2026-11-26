# @egen-civitas/esm-embed-client

SDK côté **application embarquée** (iframe) : connexion au Shell EGEN (protocole v2) et façades typées des capacités.
Spécification : `docs/integration-apps/17-sdk-embed-protocole-v2.md` du dépôt Core.

```ts
import { connectToEgen } from '@egen-civitas/esm-embed-client';

const egen = await connectToEgen({
  moduleName: '@civitas/esm-studio-app',          // = name du egen-app.json
  hostOrigins: ['https://egen.exemple.org'],       // origines explicites du Shell, jamais *
  capabilities: ['locale', 'events', 'notifications', 'extensions'],
});

if (egen.connected) {
  const locale = await egen.locale.get();          // langue de l'interface du Core
  await egen.events.publish('app.studio.saved', { id: 42 });
  await egen.notifications.show({ kind: 'success', title: 'Enregistré' });
  const nav = await egen.extensions.list('topbar-nav-slot'); // extensions disponibles (métadonnées)
}
```

**Ce que le SDK ne transporte PAS (règle d'or, doc 17 §2)** : identité/session, droits, thème, appels API. Le Core n'en est pas la source ;
l'app les obtient directement : jeton auprès de **Keycloak** (OIDC), droits via son jeton et son backend, thème via le service de thèmes.

- **Mode autonome** : hors du Core (ou hôte sans protocole v2, ou délai dépassé), `connected === false` ; les appels sont rejetés (`DENIED`), jamais d'exception synchrone. Testez `egen.has('theme')` pour dégrader proprement.
- **Toasts sans doublon** : le Core affiche les notifications de l'app, en temps réel, attribuées à elle. N'affichez pas les vôtres : un seul point d'entrée,

  ```ts
  await egen.notify({ kind: 'success', title: 'Enregistré', id: 'theme.saved' }, (t) => sonner.success(t.title)); // 2e argument : affichage local de repli
  {!egen.coreDisplaysNotifications && <Toaster />}   // ne rendre son toaster que si le Core ne s'en charge pas
  ```

  Core affiche seul (défaut) → envoyé au Core, `local` non appelé. Capacité non accordée ou client autonome → `local`. Politique `exclusive: false` de l'opérateur → les deux. Trop de toasts (`rate`) → abandonnés. React : `useEgenNotify(local)` → `{ notify, coreDisplays }`.
- **Moindre privilège** : un appel sur une capacité non accordée est rejeté localement. Les refus de négociation sont dans `egen.denied`.
- **Extensions** : `egen.extensions.list(slot)` / `onChange` (slots à approuver : grant `extensions.discover`). Pour *contribuer* un composant à un slot du Core, déclarer `extensions[]` dans `egen-app.json` (doc 17 §5 bis).

## React

```tsx
import { EgenProvider, useEgenLocale, useEgenExtensions, useEgenEvent } from '@egen-civitas/esm-embed-client/react';

<EgenProvider options={{ moduleName, hostOrigins }} loading={<Spinner />}>
  <App />
</EgenProvider>
```

Développer sans le Core : voir `@egen-civitas/esm-embed-testing` (phase P4).
