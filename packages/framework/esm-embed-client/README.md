# @egen-civitas/esm-embed-client

SDK côté **application embarquée** (iframe) : connexion au Shell EGEN (protocole v2) et façades typées des capacités.
Spécification : `docs/integration-apps/17-sdk-embed-protocole-v2.md` du dépôt Core.

```ts
import { connectToEgen } from '@egen-civitas/esm-embed-client';

const egen = await connectToEgen({
  moduleName: '@civitas/esm-tweakcn-app',          // = name du egen-app.json
  hostOrigins: ['https://egen.exemple.org'],       // origines explicites du Shell, jamais *
  capabilities: ['session', 'theme', 'events', 'notifications'],
});

if (egen.connected) {
  await egen.theme.sync();                         // variables CSS du Core sur :root
  const session = await egen.session.get();       // jamais de sessionId ni de jeton
  await egen.events.publish('app.theme-studio.saved', { id: 42 });
  await egen.notifications.show({ kind: 'success', title: 'Thème enregistré' });
}
```

- **Mode autonome** : hors du Core (ou hôte sans protocole v2, ou délai dépassé), `connected === false` ; les appels sont rejetés (`DENIED`), jamais d'exception synchrone. Testez `egen.has('theme')` pour dégrader proprement.
- **Moindre privilège** : un appel sur une capacité non accordée est rejeté localement. Les refus de négociation sont dans `egen.denied`.
- **Outils IA** : `egen.aiTools.register([{ name, description, handler }])` : le backend IA appelle, valide et garde l'autorité.

## React

```tsx
import { EgenProvider, useEgenSession, useEgenTheme, useEgenEvent } from '@egen-civitas/esm-embed-client/react';

<EgenProvider options={{ moduleName, hostOrigins }} loading={<Spinner />}>
  <App />
</EgenProvider>
```

Développer sans le Core : voir `@egen-civitas/esm-embed-testing` (phase P4).
