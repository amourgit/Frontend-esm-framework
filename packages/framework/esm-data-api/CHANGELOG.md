# @egen-civitas/esm-data-api

## 3.0.0

### Major Changes

- 5958a56: Framework neutre : suppression des derniers résidus hospitaliers (FHIR, patients, établissement de santé).

  Retirés :

  - `esm-api` : `fhirBaseUrl` et le traitement spécifique des URL FHIR (`_summary=data`) dans `egenFetch`.
  - `esm-data-api` : type `FHIRLocationResource`.
  - `esm-styleguide` : composant `LocationPicker` (basé sur l'API FHIR `Location` et le tag « Login Location ») ; pictogrammes médicaux `AppointmentsPictogram`, `AppointmentsAltPictogram`, `Assessment1Pictogram`, `Assessment2Pictogram`, `FacilityPictogram`, `RegistrationPictogram` (identifiants `egen-pict-appointments`, `-assessment-1`, `-assessment-2`, `-facility`, `-registration`) ; icônes `GenderFemaleIcon`, `GenderMaleIcon`, `GenderOtherIcon`, `GenderUnknownIcon`.
  - `esm-translations` : clés `errorLoadingLoginLocations`, `searchForLocation` et clés orphelines patient/clinique (`Clinic`, `patientAvatarAlt`, `patientIdentifierSticker`, `patientLists`, `patientPhotoAlt`, `patientPhotoPlaceholder`, `seeMoreLists`) dans toutes les langues.

  Ajouté : `HomePictogram` est désormais un pictogramme de maison neutre (`egen-pict-home`) au lieu d'un alias du bâtiment d'hôpital.

  Vocabulaire neutre dans la documentation, les exemples, les stories et les tests (patient, médicaments, rendez-vous, pharmacie remplacés).

### Patch Changes

- Updated dependencies [669cbd6]
- Updated dependencies [5958a56]
  - @egen-civitas/esm-api@3.0.0
  - @egen-civitas/esm-offline@1.0.4

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
  - @egen-civitas/esm-api@2.0.0
  - @egen-civitas/esm-offline@1.0.3
  - @egen-civitas/esm-state@1.0.3

## 1.0.2

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
  - @egen-civitas/esm-api@1.1.1
