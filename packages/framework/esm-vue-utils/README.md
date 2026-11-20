# @egen-civitas/esm-vue-utils

Intégration des applications **Vue 3** à EGEN. Pendant de `@egen-civitas/esm-react-utils`, mêmes noms et même contrat : passer de l'un à l'autre, c'est changer l'import.

Repose sur `single-spa-vue` (adaptateur existant) et sur `@egen-civitas/esm-integration-utils`.

## Exports d'app (lus par le Shell)

```ts
// src/index.ts (ou la source exposée en ./start)
import { getSyncLifecycle, getAsyncLifecycle } from '@egen-civitas/esm-vue-utils';
import Page from './Page.vue';

const options = { moduleName: '@acme/esm-mon-app', featureName: 'mon-app' }; // moduleName = name du package.json

export const root = getSyncLifecycle(Page, options);
export const modal = getAsyncLifecycle(() => import('./Modal.vue'), options);
export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');
```

`routes.json` : `{ "pages": [{ "component": "root", "route": "mon-app" }] }` (voir `docs/integration-apps` du Core).

Options : `moduleName`, `featureName` (obligatoires), `plugins` (routeur, Pinia…), `configure(app, props)`, `throwErrorsToConsole`.

## Composables

| | |
| --- | --- |
| `useComponentContext()` | `{ moduleName, featureName, extension? }` |
| `useConfig<T>()` | configuration du module (+ extension) ; `null` tant que non chargée |
| `useSession()` | session ; `null` tant que non chargée |
| `useStore(store, select?)` | valeur dérivée d'un magasin zustand |
| `useFeatureFlag(nom)` | drapeau de fonctionnalité |
| `useTranslation()` | `{ t(clé, défaut?, options?) }` réactive, espace de noms = `moduleName` |
| `useExtensionSlot(nom, state?)` | extensions assignées à un slot |

## Composants

`ExtensionSlot` (prop `name`, `select`, `state` ; slot par défaut `{ extension, state }`), `Extension`, `EgenErrorBoundary` (repli « An error has occurred… » comme côté React).

## Points d'attention

- Props Single-SPA internes (`name`, `singleSpa`, `mountParcel`, `domElement`, `_extensionContext`) **non transmises** au composant racine ; l'état d'une extension l'est, et `update` redessine le composant.
- Vue n'est pas partagé par le Shell : le déclarer en `peerDependencies` le partage entre apps Vue (singleton Module Federation), sinon il est embarqué.
- Aucun `ExtensionSlot` n'est enregistré hors d'un composant monté par ces fabriques (contexte requis).

Tests : `yarn test` (Vue 3 et single-spa-vue réels, services EGEN simulés).
