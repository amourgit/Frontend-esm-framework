# @egen-civitas/esm-nextjs-utils

Intégration à EGEN d'une **application autonome** (Next.js, rendu serveur, routeur propre) affichée dans une **iframe** reliée au Shell par un pont `postMessage` sécurisé. Fonctionne avec n'importe quelle application web ; pensé pour Next.js.

## Pourquoi une iframe

Next.js possède son routeur, son rendu serveur et son compilateur. Le plugin Module Federation de Next (`@module-federation/nextjs-mf` 8.9) ne couvre que Next 12 à 15, alors que Next courant est la 16 : produire un conteneur Module Federation à partir du compilateur Next n'est donc pas une base fiable. L'iframe garde l'application intacte (SSR compris) et ne dépend pas de ses internes.

Ce que l'on perd : pas de partage de contexte React, de dépendances ni de styles avec le Shell ; tout passe par le pont.

## Côté Shell (le `routes.json` et l'export)

```ts
// src/start.ts de l'app « enveloppe » (peut être minuscule)
import { getSyncLifecycle } from '@egen-civitas/esm-nextjs-utils';

export const root = getSyncLifecycle({
  moduleName: '@acme/esm-mon-next',   // = name du package.json
  featureName: 'mon-next',
  url: 'https://next.exemple.org/app', // origine autorisée = origine de l'URL
});
```
`routes.json` : `{ "pages": [{ "component": "root", "routeRegex": "^mon-next(/.*)?$" }] }`.

Options : `allowedOrigin`, `sessionFields` (défaut : `authenticated, locale, allowedLocales, user.uuid, user.display, user.username` ; **jamais** `sessionId`), `sandbox`, `title`, `minHeight`, `onNavigate`.

## Côté application embarquée (Next.js)

```tsx
'use client';
import { useEffect, useState } from 'react';
import { createEgenBridge, type EgenBridge } from '@egen-civitas/esm-nextjs-utils/client';

export function useEgen() {
  const [state, setState] = useState<any>({});
  const [bridge, setBridge] = useState<EgenBridge>();
  useEffect(() => {                       // navigateur uniquement, jamais pendant le rendu serveur
    const b = createEgenBridge({
      moduleName: '@acme/esm-mon-next',
      allowedHostOrigins: ['https://shell.exemple.org'],
    });
    const off = b.subscribe(setState);
    const stopResize = b.autoResize();
    setBridge(b);
    return () => { off(); stopResize(); b.destroy(); };
  }, []);
  return { ...state, bridge };            // locale, session, spaBase ; bridge.navigate('/accueil')
}
```

## Protocole (v1)

Enveloppe `{ egen: 1, moduleName, message }`.
Shell → app : `init { moduleName, locale, spaBase, session? }`, `session`, `locale`.
App → Shell : `ready`, `navigate { to }`, `resize { height }`, `title { title }`.

## Sécurité

- Un message n'est traité que s'il vient **de l'iframe elle-même ET de l'origine autorisée** (côté app : de `window.parent` ET d'une origine listée). Aucune origine `*` acceptée ; envoi toujours avec une origine cible explicite.
- Navigation demandée par l'app : **chemins internes uniquement** (`/x`) ; `//hôte`, URL absolues et `javascript:` sont ignorés.
- `sessionId` n'est jamais transmis ; la session est filtrée par liste blanche.
- Iframe `sandbox` par défaut (`allow-scripts allow-same-origin allow-forms allow-popups`). Si l'application a la **même origine** que le Shell, ces deux options annulent le bac à sable : héberger l'app sur une autre origine (sous-domaine) ; un avertissement est journalisé sinon.

## Exploitation (à ne pas oublier)

- L'application doit **autoriser l'affichage dans une iframe** par le Shell : `Content-Security-Policy: frame-ancestors https://shell.exemple.org` (et pas de `X-Frame-Options: DENY/SAMEORIGIN`). C'est la cause n°1 d'une iframe vide.
- Le CSP du Shell doit autoriser `frame-src` vers l'application.
- Authentification : les cookies tiers sont bloqués par les navigateurs entre sites distincts. Préférer le **même site** (sous-domaines d'un même domaine) ou une session propre à l'application.
- Les apps natives (Android/iOS) exigent un contenu embarqué : une iframe distante n'y est pas adaptée.

Tests : `yarn test` (fenêtres simulées ; l'exécution inter-fenêtres dans un vrai navigateur reste à valider).

## Navigation partagée (protocole 1.1)

L'URL du Core reflète la page courante de l'application embarquée : actualisation, retour/avance et liens partageables fonctionnent comme pour une app interne.

```ts
getEmbedLifecycle({
  moduleName, featureName, url,
  navigation: { route: 'mon-app', mode: 'history' /* | 'hash' | 'none' */, sensitiveParams: ['invite'] },
});
```

Côté application : soit le script injectable `assets/egen-bridge.js` (`<script src="/egen-bridge.js" defer data-mode="history">`), soit le client (`bridge.reportLocation(path)`, `bridge.onGoto(fn)`). Sans l'option `navigation`, rien ne change. Détails, sécurité et exemples : `docs/integration-apps/16-navigation-partagee-apps-externes.md` du dépôt Core.
