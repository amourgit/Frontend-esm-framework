---
'@egen-civitas/esm-styleguide': major
'@egen-civitas/esm-framework': major
'@egen-civitas/esm-app-shell': major
'@egen-civitas/rspack-config': major
'@egen-civitas/webpack-config': major
'@egen-civitas/tailwind-preset': major
'@egen-civitas/esm-ai-tools': major
'@egen-civitas/egen': major
---

**Retrait complet de Carbon et de SCSS.** Tailwind v4 est le seul système de style ; les composants de base sont les nôtres (`esm-styleguide/src/ui`, copiés de shadcn/ui et Radix, MIT).

- `@egen-civitas/esm-styleguide` : plus de `@carbon/react`, `@carbon/charts` ni `sass`. Nouveaux composants exportés : `Button`, `IconButton`, `Link`, `Badge`, `Separator`, `Label`, `Input`, `TextInput`, `Switch`, `Spinner`, `InlineLoading`, `Layer`, `Tooltip`, `Tile*`, `Alert*`, `NotificationBanner`, `Dialog*`, `DropdownMenu*`, `Tabs*`, `Table*`, `ModalHeader` / `ModalBody` / `ModalFooter`, `AppHeader*`. `cn` utilise désormais `tailwind-merge`. Le type `CarbonTagColor` devient `TagColor` (et `carbonTagColors` → `tagColors`). Les composants du framework qui reposaient sur Carbon (modales, notifications, snackbars, tags, pagination, menu déroulant, barre d'actions par lots, sélecteur de dates, fenêtres d'espace de travail) sont réécrits sans lui.
- Feuille globale : `@egen-civitas/esm-styleguide/styles` pointe sur un **fichier CSS standard** (`dist/styles.css`) ; l'export SCSS `./src/vars` et tous les partiels `.scss` disparaissent. Les modules `*.module.scss` sont devenus `*.module.css` (mêmes noms de classes). Les jetons `--cds-*` sont renommés `--ui-*`.
- `@egen-civitas/rspack-config`, `@egen-civitas/webpack-config` : plus de règle `sass-loader`, `scssRuleConfig` supprimé, `.scss` retiré des extensions résolues.
- `@egen-civitas/esm-app-shell` : la feuille globale est lue telle quelle (plus de compilation Sass) ; `@carbon/react` n'est plus une dépendance partagée ; la page d'erreur et le fil d'Ariane n'utilisent plus de classes Carbon.
- `@egen-civitas/tailwind-preset` : importe `tw-animate-css` (animations des composants).
- `@egen-civitas/esm-ai-tools` : l'identité des composants vient du `data-slot` des composants EGEN (`source: 'slot'`, champ `slot`) à la place du bloc Carbon (`source: 'carbon'`, champ `carbon`) ; `theme.carbonTheme` est supprimé.
- `@egen-civitas/egen` : les dépendances `sass*` ne sont plus fournies.

Guide de migration : `docs/MIGRATION-CARBON.md`.
