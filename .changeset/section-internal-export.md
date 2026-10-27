---
'@egen-civitas/esm-styleguide': patch
---

Correction : `Section`, `SectionAction`, `SectionGrid` (et leurs parties) n'étaient exportés que par `public.ts` ; le point d'entrée réel du package (`internal.ts`) ne les exposait pas, donc `import { Section } from '@egen-civitas/esm-framework'` valait `undefined` à l'exécution et ne typait pas. Les deux points d'entrée les exportent désormais, avec un test garde-fou.
