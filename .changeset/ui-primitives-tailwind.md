---
'@egen-civitas/esm-styleguide': minor
'@egen-civitas/tailwind-preset': minor
---

Premiers composants de base 100 % Tailwind, sans Carbon ni SCSS (chantier de retrait de Carbon, phase 0 et 1) : `Button`, `IconButton`, `Link`, `Badge`, `Separator`, `Label`, `Input`, `TextInput`, `Switch`, `Spinner`, `InlineLoading`, `Layer`, `Tooltip` et `Tile` (+ `TileHeader`, `TileTitle`, `TileDescription`, `TileAction`, `TileContent`, `TileFooter`), exportés par `@egen-civitas/esm-styleguide`, avec l'utilitaire `cn` (clsx + tailwind-merge). Code copié de shadcn/ui (MIT, avis dans `THIRD_PARTY_NOTICES.md`) puis adapté ; comportements accessibles via Radix. Ils lisent les jetons de thème existants (`bg-primary`, `bg-card`, `border-input`…), donc suivent le moteur de thème.

`@egen-civitas/tailwind-preset` importe désormais `tw-animate-css` (classes `animate-in`, `fade-in-0`, `zoom-in-95`…, requises par les infobulles et bientôt les menus et modales).

Garde-fou : un test d'architecture (`zero-carbon.architecture.test.ts`) interdit tout nouvel import Carbon ou fichier `.scss` ; sa liste blanche (`carbon-scss-allowlist.json`, 88 fichiers) ne peut que rétrécir.
