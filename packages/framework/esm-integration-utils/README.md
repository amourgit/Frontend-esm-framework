# @egen-civitas/esm-integration-utils

Socle commun d'intégration des applications EGEN, **indépendant de toute technologie d'interface**. Il porte en logique pure ce que `esm-react-utils` fait avec React ; les paquets `esm-vue-utils` (et, ensuite, Angular) ne sont que de fines couches d'adaptation par-dessus.

| Besoin | API |
| --- | --- |
| Contrat d'export lu par le Shell | `LifecycleExport`, `toLifecycleExport`, `toAsyncLifecycleExport` |
| Contexte d'un composant | `assertLifecycleOptions` (« Invalid options »), `createComponentConfig`, `extensionFromProps` |
| Cible de montage (page ou parcel) | `resolveMountTarget` : `domElement`, sinon `#single-spa-application:<nom>` |
| Erreurs | `reportComponentError` |
| Magasins (zustand) | `watchStore` |
| Configuration | `watchComponentConfig`, `whenConfigLoaded` (module + extension, comme `useConfig`) |
| Session / drapeaux | `watchSession`, `whenSessionLoaded`, `watchFeatureFlag` |
| Traductions | `createTranslator(moduleName)`, `watchTranslations` (instance `window.i18next` du Shell) |
| Extensions | `connectExtensionSlot` (slot), `mountExtension` (parcel) |

Toutes les fonctions `watch*` renvoient une fonction de désabonnement.

Tests : `yarn test`. Aucune dépendance d'interface (ni React, ni Vue, ni Angular).
