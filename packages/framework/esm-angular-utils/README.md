# @egen-civitas/esm-angular-utils

Intégration des applications **Angular** (composants autonomes, *signals*) à EGEN. Pendant de `@egen-civitas/esm-react-utils` : mêmes noms (`getSyncLifecycle`, `getAsyncLifecycle`) et même contrat. Repose sur `single-spa-angular` et `@egen-civitas/esm-integration-utils`.

Conception volontairement **sans décorateur ni gabarit** : le paquet n'embarque aucun composant, il fournit des fonctions et des fournisseurs (`inject()`), donc rien à compiler côté bibliothèque.

## Export d'app (lu par le Shell)

```ts
// src/start.ts (source exposée en ./start)
import { Component } from '@angular/core';
import { getSyncLifecycle, injectConfig, injectTranslate } from '@egen-civitas/esm-angular-utils';

@Component({ selector: 'mon-app-page', template: `<h1>{{ t('title', 'Ma page') }}</h1>` })
class PageComponent {
  config = injectConfig<{ color: string }>();
  t = injectTranslate();
}

const options = { moduleName: '@acme/esm-mon-app', featureName: 'mon-app' }; // moduleName = name du package.json
export const root = getSyncLifecycle(PageComponent, options);
```

`routes.json` : `{ "pages": [{ "component": "root", "route": "mon-app" }] }`.

Le composant racine doit avoir un `selector` d'élément simple (`mon-app-page`).

## Options

`moduleName`, `featureName` (obligatoires) · `providers` (routeur, HttpClient…) · `zone` (`false` par défaut) · `singleSpa` (options passées à `single-spa-angular`, ex. `Router`/`NavigationStart`) · `throwErrorsToConsole`.

**Sans zone par défaut** : `zone.js` modifie des API globales partagées par toutes les apps de la page ; le mode sans zone (détection par *signals*) évite ce risque. Pour utiliser zone.js : le charger dans l'app, `zone: true` et `provideZoneChangeDetection()` dans `providers`.

## Fonctions d'injection (contexte d'injection requis)

| | |
| --- | --- |
| `injectComponentContext()` | `{ moduleName, featureName, extension? }` |
| `injectEgenProps()` | props Single-SPA (état d'une extension) en signal, mises à jour par `update` |
| `injectConfig<T>()` | configuration du module (+ extension) ; `null` tant que non chargée |
| `injectSession()` | session ; `null` tant que non chargée |
| `injectStore(store, select?)` | valeur dérivée d'un magasin zustand |
| `injectFeatureFlag(nom)` | drapeau de fonctionnalité |
| `injectTranslate()` | `t(clé, défaut?, options?)` réactive, espace de noms = `moduleName` |
| `injectExtensionSlot(nom, state?)` | extensions assignées à un slot (signal) |
| `injectExtensionMounter()` | monte une extension dans un élément ; démontage automatique |

Les erreurs non gérées passent par un `ErrorHandler` EGEN (`reportComponentError`).

## Afficher les extensions d'un slot

```ts
@Component({
  selector: 'mon-slot',
  template: `<div #host *ngFor="let e of slot.extensions()"></div>`,
})
class SlotComponent {
  slot = injectExtensionSlot('home-sections');
  mount = injectExtensionMounter();
  // pour chaque extension : this.mount(el, { extensionId: e.id, extensionSlotName: 'home-sections',
  //   extensionSlotModuleName: this.slot.extensionSlotModuleName }, state)
}
```

## Compatibilité

- `single-spa-angular` suit la version majeure d'Angular (22.x ↔ Angular 22) : installer la version correspondant à votre Angular (`peerDependencies`).
- Testé avec Angular 22 (compilation JIT en test). Non vérifié sous Angular CLI en compilation AOT.
- Routeur Angular : non testé ; ajouter `provideSingleSpaPlatform()` (de `single-spa-angular`) dans `providers` et passer `Router`/`NavigationStart` via `singleSpa`.

Tests : `yarn test` (Angular et single-spa-angular réels, services EGEN simulés).
