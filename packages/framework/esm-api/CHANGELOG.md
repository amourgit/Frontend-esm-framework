# @egen-civitas/esm-api

## 2.0.0

### Major Changes

- 159db44: Framework généraliste : suppression de la couche clinique héritée d'un autre projet (patients, FHIR, santé).

  Retirés :
  - `esm-styleguide` : `EntityBanner*`, `EntityPhoto`/`useEntityPhoto`, `NumericDataPoint`, 17 pictogrammes de départements hospitaliers (labo, pharmacie, cardiologie, radio, triage, patients…) et 15 icônes cliniques (seringue, lit d'hôpital, ordres médicaux…), clés de config `entityPhotoConceptUuid`, `contactAttributeTypes`, `excludeEntityIdentifierCodeTypes`.
  - `esm-react-utils` : `useEntity`, `usePrimaryIdentifierResource`, `useFhirFetchAll`, `useFhirInfinite`, `useFhirPagination` (utiliser `useEgenFetchAll`, `useEgenInfinite`, `useEgenPagination`).
  - `esm-data-api` : `getCurrentEntity`/`CurrentEntity`, types FHIR (`FHIRResource`, `FHIRCode`, `fhir.*`), `Task`, `CatalogItem` ; `DataPoint` et `Classification` utilisent `ReferenceTerm` au lieu de `Concept`.
  - `esm-api` : types `Concept*` remplacés par `ReferenceTerm` ; champs cliniques de `Person` (décès).
  - `esm-config` : types `ConceptUuid`, `PersonAttributeTypeUuid`, `EntityIdentifierTypeUuid`.
  - `esm-utils` : `getEntityName`, `formatEntityName`, `selectPreferredName` (noms FHIR) ; `esm-globals` : `NameUse`.
  - Dépendance `@types/fhir` retirée.

### Patch Changes

- Updated dependencies [159db44]
  - @egen-civitas/esm-config@2.0.0
  - @egen-civitas/esm-globals@2.0.0
  - @egen-civitas/esm-state@1.0.3
  - @egen-civitas/esm-error-handling@1.0.2
  - @egen-civitas/esm-navigation@1.0.2

## 1.1.3

### Patch Changes

- 5dd2fc9: Bypass d'authentification de développement (`EGEN_DEV_NO_AUTH`) : émule désormais le changement de langue, comme un vrai backend. Avant, changer de langue dans la TopBar ne produisait aucun effet en dev : `POST /session { locale }` renvoyait toujours la session en `fr` (la page se rechargeait en `fr`), et `POST /user/<uuid> { userProperties.defaultLocale }` n'était pas intercepté, partait vers un serveur sans API et échouait.

  - `POST /session { locale }` : langue de la session, conservée dans `sessionStorage` ; le store de session et `<html lang>` sont mis à jour tout de suite.
  - `POST /user/<uuid> { userProperties }` : langue par défaut, conservée dans `localStorage`.
  - Priorité à l'initialisation : langue de session, puis langue par défaut, puis `fr`. Les locales non autorisées sont ignorées.
  - Nouvelle fonction `getDevBypassSession()` (session fictive courante).
  - L'app-shell est republié car il embarque `esm-api` (le correctif n'atteint les apps que par le bundle du shell).

## 1.1.2

### Patch Changes

- d69a61c: Les fichiers `mock.ts` / `mock-jest.ts` de ces paquets importent `./src/...`, mais `src` n'était pas publié sur npm : tout test consommateur qui utilisait `@egen-civitas/esm-framework/mock` échouait avec « Failed to resolve import ./src/index ». `src` est désormais publié (sans les fichiers `*.test.*`). `esm-api` : les mocks exportent aussi `isDevAuthBypassEnabled` et `applyDevAuthBypassForLogin` (désactivés par défaut), absents jusqu'ici alors qu'ils font partie de l'API publique.
- Updated dependencies [d69a61c]
  - @egen-civitas/esm-config@1.0.2
  - @egen-civitas/esm-state@1.0.2

## 1.1.1

### Patch Changes

- c82f723: Corrige une série de dépendances manquantes/mal déclarées trouvées en débloquant la CI (l'installation était bloquée depuis fin août, masquant ces problèmes) :

  - `esm-tenant` : `happy-dom` manquait alors que ses tests l'utilisent (ni dep, ni peerDep) → ajouté en devDependency.
  - `esm-ai-tools` : `swr` est chargé via un `import()` dynamique dans `native/index.ts` mais n'était déclaré nulle part → ajouté en peerDependency (`2.x`, cohérent avec `esm-styleguide`/`esm-react-utils`/`esm-framework`).
  - `esm-api`, `esm-data-api` : `rxjs` utilisé au runtime mais absent de peerDependencies → ajouté (`7.x`).
  - `esm-navigation`, `esm-styleguide`, `esm-react-utils` : `single-spa` utilisé au runtime mais absent de peerDependencies → ajouté (`6.x`).
  - `esm-extensions` : `react` utilisé au runtime mais absent de peerDependencies → ajouté (`18.x`).
  - `esm-ai-framework` : `framework.test.ts` faisait `require('@egen-civitas/esm-ai-tools')` en plein milieu du corps de 3 tests (au lieu d'un import statique en haut de fichier) — ce require contournait le mock de `@egen-civitas/esm-styleguide` et déclenchait une résolution Node native qui tentait de charger pour de vrai des fichiers `.module.scss` compilés (`Unknown file extension ".scss"`). Remplacé par un import statique de `hasTool`/`getTool`/`overrideTool`, et ajout d'un `vi.mock('@egen-civitas/esm-styleguide', ...)` en tête de fichier (même pattern déjà utilisé dans `esm-ai-tools/src/native/native.test.ts`).

  Tous les fixes vérifiés par reproduction isolée réelle (installation + exécution effective des tests concernés), pas seulement par lecture de code.

- Updated dependencies [c82f723]
  - @egen-civitas/esm-navigation@1.0.2

## 1.1.0

### Minor Changes

- 9eb32b2: Ajoute un système de middleware composable pour `egenFetch`, et une forme
  d'erreur structurée conforme à RFC 9457 (Problem Details) sur
  `EgenFetchError`. Purement additif — aucun comportement existant ne change.

  **Middleware (`composeMiddlewares`)**

  ```ts
  import { egenFetch, composeMiddlewares, createRetryMiddleware } from '@egen-civitas/esm-api';

  const resilientFetch = composeMiddlewares(egenFetch, [createRetryMiddleware()]);
  const response = await resilientFetch('/ws/rest/v1/concept');
  ```

  - `composeMiddlewares(handler, middlewares)` compose une liste de middlewares
    autour d'un handler terminal (typiquement `egenFetch`) en une fonction avec
    la même signature d'appel `(url, init?) => Promise<FetchResponse>`.
  - `createRetryMiddleware(options?)` fournit une politique de nouvelle
    tentative prête à l'emploi (backoff exponentiel + jitter complet), limitée
    par défaut aux méthodes idempotentes (GET/HEAD/PUT/DELETE/OPTIONS) — aucun
    changement de comportement pour les requêtes non éligibles.

  **Erreur structurée (`EgenFetchError.problem`)**

  Quand le backend répond avec un corps JSON de la forme RFC 9457 (un objet
  avec au moins un champ `title` de type chaîne), `EgenFetchError` expose
  désormais ce corps typé sur `err.problem` (avec `type` par défaut à
  `'about:blank'` si absent), en plus de `err.responseBody` qui reste
  inchangé.

## 1.0.2

### Patch Changes

- 8688154: Corrige le bypass d'authentification dev (`EGEN_DEV_NO_AUTH`) et le système
  multi-tenant (`EGEN_TENANT_*`), inertes depuis que `esm-app-shell` est
  consommé comme paquet npm pré-compilé par une app séparée.

  - `esm-api` : `isDevAuthBypassEnabled()` lit désormais `window.egenDevNoAuth`
    (canal runtime) en plus de `process.env.EGEN_DEV_NO_AUTH` (canal
    build-time historique, insuffisant seul pour un paquet déjà compilé).
  - `esm-globals` : déclaration TypeScript de `window.egenDevNoAuth`.
  - `esm-app-shell` : `run.ts` utilise `isDevAuthBypassEnabled()` comme
    source de vérité unique (au lieu d'un second check dupliqué) ; le défaut
    `EGEN_DEV_NO_AUTH` du `DefinePlugin` vient maintenant de
    `resolvePublicEnv()` (voir `rspack-config`) au lieu d'un `|| 'false'`
    codé en dur.
  - `rspack-config` : nouveau fichier `.env.defaults` (valeurs par défaut du
    framework, surchargeables en totalité par le `.env` du consommateur) ;
    `PUBLIC_ENV_PREFIXES` (`EGEN_AI_`, `EGEN_DEV_`, `EGEN_TENANT_`) remplace
    l'ancien `ADDITIONAL_RUNTIME_KEYS` codé en dur sur une seule clé ;
    `resolvePublicEnv()` exportée comme source unique de la hiérarchie
    framework-defaults < .env consommateur < process.env.
  - `egen` : `egen develop` calcule désormais ce pont runtime
    (`RUNTIME_BRIDGED_VARS` — `EGEN_DEV_NO_AUTH` et les 7 variables
    `EGEN_TENANT_*`) et l'injecte dans le `index.html` servi, avant l'appel à
    `initializeSpa()`.

- Updated dependencies [8688154]
  - @egen-civitas/esm-globals@1.0.2
