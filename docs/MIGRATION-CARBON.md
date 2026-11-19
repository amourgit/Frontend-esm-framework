# Migration : de Carbon / SCSS vers Tailwind et `esm-styleguide/src/ui`

Cette version majeure retire Carbon et SCSS. Les composants se remplacent un à un ; les noms viennent de `@egen-civitas/esm-framework` (qui ré-exporte le styleguide).

## Composants

| Carbon (`@carbon/react`) | Remplacement | Notes |
| --- | --- | --- |
| `Button kind="primary"` | `<Button>` | `kind="secondary"` → `variant="secondary"` · `tertiary` → `variant="outline"` · `ghost` → `variant="ghost"` · `danger` → `variant="destructive"` · `size="sm|md|lg"` → `size="sm|default|lg"` |
| `Button renderIcon={X} hasIconOnly iconDescription="…"` / `IconButton label="…"` | `<IconButton icon={<X />} label="…" />` | `label` = libellé accessible et infobulle |
| `Button renderIcon` (avec texte) | `<Button><X />Texte</Button>` | les `svg` enfants sont dimensionnés automatiquement |
| `Tile`, `ClickableTile` | `<Tile>` + `TileHeader` / `TileTitle` / `TileContent` | `<Tile asChild>` n'existe pas : utiliser `<Tile><a …/></Tile>` |
| `Layer` | `<Layer className="bg-…">` | simple surface |
| `InlineLoading status description` | `<InlineLoading status="active|finished|error|inactive" description />` | |
| `Loading` | `<Spinner />` | |
| `Link` | `<TextLink>` | `target="_blank"` ajoute `rel` (`Link` existe déjà dans `esm-api`) |
| `TextInput labelText helperText invalidText invalid` | `<TextInput label helperText errorText />` | |
| `Toggle labelText` | `<Switch aria-label />` | |
| `Tag type="red"` | `<Badge variant="outline" className="…">` | cf. `ClassificationTags` |
| `Modal*`, `ComposedModal` | `<Dialog>` (état local) · `ModalHeader` / `ModalBody` / `ModalFooter` (dans `showModal`) | `closeModal` → `onClose` |
| `InlineNotification`, `ActionableNotification`, `ToastNotification` | `<NotificationBanner kind title subtitle actionLabel onAction onClose />` ou `<Alert variant>` | |
| `OverflowMenu`, `OverflowMenuItem` | `DropdownMenu*` ou `CustomOverflowMenu` | |
| `Tabs`, `Tab` | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` | |
| `StructuredList*`, `DataTable` | `Table*` | |
| `Header*`, `HeaderGlobalAction` | `AppHeader*` | |
| `Pagination` | `Pagination` du styleguide | `onChange({ page, pageSize })` |
| `Breadcrumb` | `<nav><ol>` (cf. shell) | |
| `@carbon/react/icons` | `lucide-react` ou icônes du styleguide | |

## Styles

- Plus de SCSS : `*.module.scss` → `*.module.css` (CSS standard) ou classes Tailwind. `@use '@carbon/…'`, `@egen-civitas/esm-styleguide/src/vars` n'existent plus : utiliser des valeurs en `rem` ou les variables CSS du thème (`--colors-*`, `--border-radius-*`, `--ui-*`).
- Tokens `var(--cds-…)` → `var(--ui-…)`.
- `import styles from './x.scss'` → `./x.module.css`.
- Garde-fou : `esm-styleguide/src/zero-carbon.architecture.test.ts` échoue si Carbon ou SCSS revient.
