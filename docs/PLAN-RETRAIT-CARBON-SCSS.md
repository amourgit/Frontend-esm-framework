# Plan — Retrait complet de Carbon et de SCSS (framework + core)

> **Décision (Kim)** : plus aucune trace de Carbon (`@carbon/*`) ni de SCSS dans le projet. Tailwind (v4, CSS-first) est le seul
> système de style. Les composants de base sont de simples composants à nous, copiés depuis des projets open source
> permissifs puis adaptés, vivant dans `esm-styleguide`. Priorité produit : modularité, flexibilité et personnalisation
> totales (l'entreprise qui déploie adapte tout).

## 1. Inventaire (mesuré sur `main`)

| | Framework | Core |
| --- | --- | --- |
| Fichiers `.scss` | 65 (dont 6 globaux : `_all`, `_carbon-bridge` 194 l., `_overrides` 731 l., `_vars`, `_glass`, `_panel`) | 75 (17 `implementer-tools`, 16 `offline-tools`, 5 `login`, 5 `ai-assistant`, 4 `quick-access`…) |
| `.ts/.tsx` important `@carbon/*` | 25 (24 dans `esm-styleguide`, 1 dans `esm-app-shell`) | 45 (18 `implementer-tools`, 12 `offline-tools`, 5 `login`, 3 `help-menu`…) |
| SCSS important `@carbon/*` | 26 | `@carbon/layout` 37×, `@carbon/type` 17×, thème/boutons/couleurs ~11× |
| Dépendances | `@carbon/react`, `@carbon/charts`, `sass`, `sass-loader`, `sass-embedded` (styleguide, shell, egen, rspack/webpack-config, storybook) | `@carbon/react`, `@carbon/styles`, `@carbon/icons-react` (apps), `sass` |
| Icônes `@carbon/icons-react` | 0 (le framework a ses propres icônes) | 0 |

Composants Carbon réellement utilisés : `Button` (18), `Tile`, `Layer`, `IconButton`, `InlineLoading`, `Link`, `TextInput`, `Toggle`,
`StructuredList*`, `Modal*` (Header/Body/Footer), `ActionableNotification`/`Notification`, `Header*`/`SwitcherItem` (shell, offline-tools),
`Pagination`, `OverflowMenu`, `DataTable` (types de la barre d'actions par lots), `@carbon/charts` (2 composants du styleguide).

**Point dur à connaître** : `_all.scss` embarque le *reset* global de Carbon (`@forward '@carbon/styles'`), non layeré, qui écrase
`padding/margin/border/font` des éléments de base ; c'est ce qui force aujourd'hui le `!` Tailwind et les utilitaires hors `@layer`
(voir `tailwind-preset/tailwind.tw.css`). Le retirer **supprime ce contournement** : Tailwind redevient normal (preflight en `@layer base`).

## 2. Cible

- **Style** : Tailwind v4 seul. Jetons de thème = variables CSS `--colors-*`, `--border-radius-*`, `--typography-*` du moteur `esm-theme`, déjà
  reliées à Tailwind par `@egen-civitas/tailwind-preset` (`bg-background`, `bg-card`, `bg-primary`, `border-input`…, noms shadcn) ; elles
  remplacent `_vars.scss` et les jetons Carbon (`$layer`, `$text-primary`, `spacing-*`, `type-style(...)`).
- **Composants de base** (dans `esm-styleguide/src/ui/`) : copiés de **shadcn/ui** (MIT) ; comportements accessibles via **Radix
  Primitives** (MIT, sans style) ; `class-variance-authority` + `tailwind-merge` + `clsx` pour les variantes ; icônes `lucide-react`
  (déjà présent). Un composant copié = *nôtre* : on le modifie librement ; l'avis de licence d'origine est conservé dans
  `THIRD_PARTY_NOTICES.md` (obligation MIT, rien d'autre).
- **Contrat public conservé** : mêmes noms exportés par `@egen-civitas/esm-styleguide` (`Button`, `Tile`…) tant que c'est raisonnable, afin
  que les apps du core changent peu ; les props propres à Carbon (`kind`, `size="lg"`, `renderIcon`…) sont mappées vers des variantes.
- **Garde-fous** : un test d'architecture (framework et core) échoue s'il reste un `@carbon/`, un `.scss`, `sass` ou `@use` dans les sources
  ou les `package.json` ; l'ESLint `no-restricted-imports` bloque `@carbon/*`.

## 3. Phases (ordre d'exécution ; une phase = une PR/un push validé : tsc, eslint, tests, build)

**Phase 0 — Fondations (framework) — FAIT**
1. `THIRD_PARTY_NOTICES.md` ; dépendances de base (`@radix-ui/*` utiles, `class-variance-authority`, `tailwind-merge`, `clsx`).
2. `esm-styleguide/src/ui/cn.ts` ; jetons `--egen-*` dans `tailwind-preset` (palette sombre « verre », espacements, rayons, typo).
3. Tailwind devient le style de base du styleguide (le styleguide importe lui-même la feuille Tailwind) ; règle rspack `*.tw.css` conservée.
4. Tests d'architecture « zéro Carbon / zéro SCSS » écrits d'abord, **allow-list** des fichiers restants (elle ne fait que rétrécir).

**Phase 1 — Primitives simples (`esm-styleguide/src/ui/`) — FAIT (Button, IconButton, Link, Tile, Layer, Spinner/InlineLoading, Input/TextInput, Switch, Tooltip, Badge, Separator, Label)**
`Button` (+ `IconButton`), `Link`, `Tile`/`Card` (+ `Layer` = simple surface), `Spinner`/`InlineLoading`, `TextInput`, `Toggle` (Switch),
`Tooltip`, `Badge`/`Tag`, `Separator`. Chacune : source copiée, adaptée, **test de rendu**, exportée sous l'ancien nom.

**Phase 2 — Composants à comportement**
`Modal` (Dialog Radix : en-tête/corps/pied), `OverflowMenu` (DropdownMenu Radix), `Notification` / `ActionableNotification` / `Snackbar` /
`Toast` (Alert + sonner ou nos toasts existants), `Pagination`, `StructuredList` (simple liste/table sémantique), `Tabs`.
Barre d'actions par lots : on remplace les types `DataTable` de Carbon par nos types.

**Phase 3 — Reste du styleguide (65 fichiers SCSS → Tailwind)**
Par dossier, du plus simple au plus gros : `animations` (→ `@keyframes` dans la feuille Tailwind), `components`, `spinner`, `toasts`,
`snackbars`, `notifications`, `cards/*`, `carousel`, `empty-card`, `error-state`, `modals`, `dialogs`, `sheet`, `pagination`,
`selections/*`, `master-detail`, `workbench`, `workspaces`, `workspaces2`. Fichiers globaux supprimés en dernier : `_carbon-bridge`,
`_overrides` (731 l. : chaque règle est soit reportée dans le composant concerné, soit abandonnée), `_vars`, `_glass`, `_panel`, `_all`.
Graphiques `@carbon/charts` (2 composants) → `recharts` (MIT) ou suppression si inutilisés.

**Phase 4 — Shell et outillage**
`esm-app-shell` (`breadcrumbs.tsx`, en-tête) ; retrait de `sass`, `sass-loader`, `sass-embedded` de `egen`, `rspack-config`, `webpack-config`,
`storybook` ; export `./styles` et `./src/vars` (`sass`) du styleguide supprimés ; `@carbon/*` retiré de tous les `package.json`.

**Phase 5 — Publication framework**
Changesets en `major` pour `esm-styleguide`, `esm-framework`, `esm-app-shell`, `egen`, `rspack-config`, `webpack-config`, `tailwind-preset`
(+ `MIGRATION.md` : correspondance ancien composant Carbon → nouveau). Merge sur `main` → PR de release automatique → publication npm.

**Phase 6 — Core (75 SCSS + 45 TSX)**
`yarn deps:egen` sur les nouvelles versions, puis, **app par app, du plus lourd au plus léger** : `implementer-tools` (35), `offline-tools` (28),
`login` (10), `ai-assistant`, `quick-access`, `devtools`, `help-menu`, `home`, `language`, `user-profile`, `side-panel`, `footer`…
Chaque app : composants Carbon → composants du styleguide, `.scss` → classes Tailwind (ou variables CSS pour les valeurs dynamiques),
suppression de `@carbon/*`/`sass` de son `package.json`, tests, build, push sur `main`.
Fin : test d'architecture sans allow-list, `@carbon/*` et `sass` retirés de la racine, `yarn.lock` régénéré, suivi mis à jour.

## 4. Règles de travail

- On ne mélange pas : une phase finie (tests + build verts) avant la suivante ; push sur `main` après chaque phase validée.
- Copie propre : chaque fichier copié garde son en-tête d'origine (auteur, licence, URL) ; sources autorisées : MIT/Apache-2.0/BSD/ISC.
  Rien de GPL/AGPL/« source-available ». Composants copiés dans `esm-styleguide`, jamais importés depuis un registre à l'exécution.
- Les composants que Kim copie et adapte lui-même dans `esm-styleguide` priment sur ceux de ce plan (ne pas les écraser).
- Aucune suppression de comportement sans équivalent : accessibilité (focus, clavier, ARIA) vérifiée par test sur chaque composant à comportement.

## 5. Risques

- Poids du chantier (~140 SCSS, ~70 TSX) : d'où l'allow-list décroissante et les phases livrables séparément.
- Changement visuel : le reset Carbon disparaît ; certaines pages bougeront d'un pixel avant ajustement (vérification visuelle par phase).
- Version majeure : les apps du core cassent tant qu'elles ne sont pas migrées (phase 6) → on ne publie le framework qu'à la phase 5,
  et le core reste sur l'ancienne version publiée jusque-là.
