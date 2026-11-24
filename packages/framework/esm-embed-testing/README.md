# @egen-civitas/esm-embed-testing

Développer et tester une app embarquée **sans le Core**. Spécification : `docs/integration-apps/17-sdk-embed-protocole-v2.md` (dépôt Core).

## 1. Hôte de test en mémoire (tests unitaires de votre app)

Un vrai `HostConnection` (mêmes grants, mêmes refus, même dispatch fermé que le Core), sans navigateur :

```ts
import { connectToEgen } from '@egen-civitas/esm-embed-client';
import { createTestHost } from '@egen-civitas/esm-embed-testing';

const sim = createTestHost({
  session: { authenticated: true, user: { display: 'Sam' } },
  manifestCapabilities: { notifications: {} },
  approved: { notifications: {} },
});
const egen = await connectToEgen({ ...sim.connectOptions, capabilities: ['session', 'notifications'] });
await egen.notifications.show({ kind: 'success', title: 'OK' });
expect(sim.notifications).toEqual([{ kind: 'success', title: 'OK' }]);
sim.emit.theme({ mode: 'dark', tokens: { '--primary': '#000' } }); // le Core pousse un changement
```

`sim.calls` (journal des services sollicités), `sim.published`, `sim.tools` + `sim.invokeTool()` (agent IA), `sim.emit.*`.

## 2. Suite de conformité

```ts
import { describe, it, expect } from 'vitest';
import { defineConformance } from '@egen-civitas/esm-embed-testing';
defineConformance(myConnectFn, { describe, it, expect }); // SDK officiel ou implémentation tierce de même forme
```

## 3. Simulateur de Shell dans le navigateur

```bash
npx egen-embed-sim --app http://localhost:3000 --manifest egen-app.json
# → déclarez dans l'app : hostOrigins: ['http://127.0.0.1:4100']
```

Page avec votre app dans une iframe, l'hôte EGEN réel (`esm-embed-host`), des boutons (thème, langue, session, événement) et le journal de tous les échanges. Par défaut les capacités demandées par le manifeste sont approuvées ; `--strict` n'approuve que les capacités « par défaut ».
