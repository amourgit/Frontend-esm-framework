# @egen-civitas/esm-globals

## 2.3.0

### Minor Changes

- a5d28d9: Service worker séparé des données hors ligne (E1) : `SpaConfig.serviceWorker` (défaut : la valeur de `offline`, comportement inchangé) et `window.serviceWorkerEnabled`. Une cible native garde le mode hors ligne des données (`offline`) sans service worker (fichiers embarqués) ; auparavant elle coupait les deux. Web : HTML et comportement inchangés.

## 2.2.0

### Minor Changes

- 340f5fe: Registre de capacités (C6).

  - `esm-platform` : `src/registry.ts` devient l'unique description des capacités (version, méthodes, adaptateurs Web et natif) ; le gabarit « indisponible », les adaptateurs, le handshake et la disponibilité en sont dérivés. Une capacité n'est disponible que si le Host l'annonce dans une version supérieure ou égale à celle du registre. `Platform` est dérivé de `CapabilityInterfaces`, extensible par fusion de déclaration. Procédure « ajouter une capacité » dans le README ; comportement des 9 capacités v1 inchangé.
  - `esm-globals` : `EgenCapabilityExtensions` permet d'étendre `CapabilityName` sans modifier ce paquet. Les 9 noms v1 restent une union fermée.

## 2.1.0

### Minor Changes

- d1d2d7d: Contrat d'app multiplateforme (F2) : `EgenAppRoutes.platforms` et `requiredCapabilities`. `registerApp` écarte (sans rien enregistrer) une app non éligible à la plateforme ou dont une capacité requise manque. `esm-globals` : `setCapabilityResolver` / `hasCapability`. `esm-platform` : `registerPlatformCapabilities()`. Shell : capacités rendues consultables avant l'enregistrement des apps. Sans champs dans `routes.json`, comportement inchangé.
- 669cbd6: Réforme multiplateforme, lot P0 (docs/EGEN-FRAMEWORK-DEV.md) :

  - esm-globals : `EgenTarget`, `CapabilityName`, `getEgenTarget()`, `isNativeTarget()`.
  - esm-platform (nouveau package, 1.0.0) : contrats des capacités (annexe 2), `PlatformError`, détection de la cible, `getPlatform()` (adaptateur Web : session vide, `openExternal`, `lifecycle`, `files.select`, `camera`, `permissions` ; jamais de faux coffre ni de biométrie simulée. En natif, aucune capacité tant que le client de pont n'est pas branché, `ready` rejette `INCOMPATIBLE` sans Host), `createMockPlatform` (sous-chemin `/testing`).
  - esm-framework : ré-export de `@egen-civitas/esm-platform` (`index`, `internal`, mocks).
  - egen (CLI) : option `build --platform web|android|ios`.
  - esm-api : `setAuthorizationProvider` (jeton fourni par la plateforme, rafraîchissement unique sur 401, rejeu GET/HEAD, politique `credentials`) ; `FetchConfig.replayOnUnauthorized` ; `isDevAuthBypassEnabled()` inerte en natif. Sans fournisseur, comportement inchangé.
  - esm-dynamic-loading : overrides d'import map et de route map désactivés en cible native.

### Patch Changes

- 5958a56: Framework neutre : suppression des derniers résidus hospitaliers (FHIR, patients, établissement de santé).

  Retirés :

  - `esm-api` : `fhirBaseUrl` et le traitement spécifique des URL FHIR (`_summary=data`) dans `egenFetch`.
  - `esm-data-api` : type `FHIRLocationResource`.
  - `esm-styleguide` : composant `LocationPicker` (basé sur l'API FHIR `Location` et le tag « Login Location ») ; pictogrammes médicaux `AppointmentsPictogram`, `AppointmentsAltPictogram`, `Assessment1Pictogram`, `Assessment2Pictogram`, `FacilityPictogram`, `RegistrationPictogram` (identifiants `egen-pict-appointments`, `-assessment-1`, `-assessment-2`, `-facility`, `-registration`) ; icônes `GenderFemaleIcon`, `GenderMaleIcon`, `GenderOtherIcon`, `GenderUnknownIcon`.
  - `esm-translations` : clés `errorLoadingLoginLocations`, `searchForLocation` et clés orphelines patient/clinique (`Clinic`, `patientAvatarAlt`, `patientIdentifierSticker`, `patientLists`, `patientPhotoAlt`, `patientPhotoPlaceholder`, `seeMoreLists`) dans toutes les langues.

  Ajouté : `HomePictogram` est désormais un pictogramme de maison neutre (`egen-pict-home`) au lieu d'un alias du bâtiment d'hôpital.

  Vocabulaire neutre dans la documentation, les exemples, les stories et les tests (patient, médicaments, rendez-vous, pharmacie remplacés).

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

## 1.0.3

### Patch Changes

- ac88343: `egen develop` : hub de logs du terminal. Toute la sortie (processus principal, serveur de dev de chaque app, processus `develop`) est structurée (source, niveau, horodatage, ANSI conservé) et diffusée en temps réel (SSE) sur `<spaPath>/__egen_logs__/stream` (+ `/history`, `/health`), exposée au navigateur via `window.egenLogsUrl`. Écoute locale uniquement (127.0.0.1), absente en production.

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
