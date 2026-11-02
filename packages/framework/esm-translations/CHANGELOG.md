# @egen-civitas/esm-translations

## 1.0.3

### Patch Changes

- 159db44: Framework généraliste : suppression de la couche clinique héritée d'un autre projet (patients, FHIR, santé).

  Retirés :
  - `esm-styleguide` : `EntityBanner*`, `EntityPhoto`/`useEntityPhoto`, `NumericDataPoint`, 17 pictogrammes de départements hospitaliers (labo, pharmacie, cardiologie, radio, triage, patients…) et 15 icônes cliniques (seringue, lit d'hôpital, ordres médicaux…), clés de config `entityPhotoConceptUuid`, `contactAttributeTypes`, `excludeEntityIdentifierCodeTypes`.
  - `esm-react-utils` : `useEntity`, `usePrimaryIdentifierResource`, `useFhirFetchAll`, `useFhirInfinite`, `useFhirPagination` (utiliser `useEgenFetchAll`, `useEgenInfinite`, `useEgenPagination`).
  - `esm-data-api` : `getCurrentEntity`/`CurrentEntity`, types FHIR (`FHIRResource`, `FHIRCode`, `fhir.*`), `Task`, `CatalogItem` ; `DataPoint` et `Classification` utilisent `ReferenceTerm` au lieu de `Concept`.
  - `esm-api` : types `Concept*` remplacés par `ReferenceTerm` ; champs cliniques de `Person` (décès).
  - `esm-config` : types `ConceptUuid`, `PersonAttributeTypeUuid`, `EntityIdentifierTypeUuid`.
  - `esm-utils` : `getEntityName`, `formatEntityName`, `selectPreferredName` (noms FHIR) ; `esm-globals` : `NameUse`.
  - Dépendance `@types/fhir` retirée.

## 1.0.2

### Patch Changes

- b8a56e7: Suppression complète de l'ancienne barre latérale (sidebar) : plus aucune app ne peut la monter. La navigation passe par les rails et zones du shell (`shell-rail-left-slot`, `shell-rail-bottom-slot`, `shell-rail-right-slot`) et la TopBar niveau 2 (`topbar-level2-nav`).

  Retirés : `LeftNavMenu`, `setLeftNav`, `unsetLeftNav`, `SetLeftNavParams`, `LeftNavStore`, `useLeftNav`, `useLeftNavStore`, `DashboardExtension`, `createDashboard` (lien de sidebar), la variable `--egen-sidenav-width`, les styles `.cds--side-nav*` / `.active-left-nav-link`, la clé de traduction `leftNavigation` et les alias `side-nav` / `sidenav` de `esm-ai-tools`.

## 1.0.1

### Patch Changes

- d69a61c: Les fichiers `mock.ts` / `mock-jest.ts` de ces paquets importent `./src/...`, mais `src` n'était pas publié sur npm : tout test consommateur qui utilisait `@egen-civitas/esm-framework/mock` échouait avec « Failed to resolve import ./src/index ». `src` est désormais publié (sans les fichiers `*.test.*`). `esm-api` : les mocks exportent aussi `isDevAuthBypassEnabled` et `applyDevAuthBypassForLogin` (désactivés par défaut), absents jusqu'ici alors qu'ils font partie de l'API publique.
