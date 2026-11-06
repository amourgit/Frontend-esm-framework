---
'@egen-civitas/esm-api': major
'@egen-civitas/esm-data-api': major
'@egen-civitas/esm-styleguide': major
'@egen-civitas/esm-translations': patch
'@egen-civitas/esm-react-utils': patch
'@egen-civitas/esm-globals': patch
'@egen-civitas/esm-framework': major
---

Framework neutre : suppression des derniers résidus hospitaliers (FHIR, patients, établissement de santé).

Retirés :

- `esm-api` : `fhirBaseUrl` et le traitement spécifique des URL FHIR (`_summary=data`) dans `egenFetch`.
- `esm-data-api` : type `FHIRLocationResource`.
- `esm-styleguide` : composant `LocationPicker` (basé sur l'API FHIR `Location` et le tag « Login Location ») ; pictogrammes médicaux `AppointmentsPictogram`, `AppointmentsAltPictogram`, `Assessment1Pictogram`, `Assessment2Pictogram`, `FacilityPictogram`, `RegistrationPictogram` (identifiants `egen-pict-appointments`, `-assessment-1`, `-assessment-2`, `-facility`, `-registration`) ; icônes `GenderFemaleIcon`, `GenderMaleIcon`, `GenderOtherIcon`, `GenderUnknownIcon`.
- `esm-translations` : clés `errorLoadingLoginLocations`, `searchForLocation` et clés orphelines patient/clinique (`Clinic`, `patientAvatarAlt`, `patientIdentifierSticker`, `patientLists`, `patientPhotoAlt`, `patientPhotoPlaceholder`, `seeMoreLists`) dans toutes les langues.

Ajouté : `HomePictogram` est désormais un pictogramme de maison neutre (`egen-pict-home`) au lieu d'un alias du bâtiment d'hôpital.

Vocabulaire neutre dans la documentation, les exemples, les stories et les tests (patient, médicaments, rendez-vous, pharmacie remplacés).
