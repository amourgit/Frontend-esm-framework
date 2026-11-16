# @egen-civitas/esm-theme

Couche d'intégration EGEN du **Design System** : modèle de thème, orchestration, application à chaud et persistante.
La transformation d'un thème en CSS est assurée par **[TokiForge](https://github.com/TokiForge/tokiforge)** (`@tokiforge/core`, AGPL-3.0). Conception : [`docs/design-system/`](../../../docs/design-system/README.md).

## Principes

- Le **document de thème EGEN** (JSON) est le concept central ; il ne dépend d'aucun moteur.
- Variables CSS générées : **`--egen-<chemin>`** (ex. `--egen-colors-primary-500`, `--egen-border-radius-md`, `--egen-panel-card-background`).
- Un nœud dont les seules clés sont `light` / `dark` définit une valeur par mode.
- Composants : `components.<composant>.<variante>.<état>.<propriété>` → `--egen-components-<composant>-<variante>-<état>-<propriété>`.
- Valeurs validées par liste blanche (pas de `;`, `{}`, `/* */`, URL non `https://`/relative) ; clé `value` réservée.

## Utilisation

```ts
import { setupThemeEngine, setThemeMode, applyGlobalThemeOverride, isGlobalThemeOverrideApplied } from '@egen-civitas/esm-theme';

// Au boot du shell : charge les thèmes (le plus prioritaire gagne) et injecte les variables.
await setupThemeEngine({
  themeUrls: ['/themes/theme.default.json', ...(window.egenThemeUrls ?? [])],
  pollIntervalMs: 0, // 4000 en développement (hot-reload)
});

setThemeMode('dark'); // data-theme + mémorisation (clé `egen-theme-mode`)

// Surcharge GLOBALE ; `persist: true` la conserve et la réapplique au prochain démarrage.
applyGlobalThemeOverride(document, { id: 'theme-studio', priority: 100, persist: true });
isGlobalThemeOverrideApplied('theme-studio'); // état réel du moteur

// Surcharge limitée à une application : [data-egen-app='mon-app']
applyAppThemeOverride('mon-app', { colors: { primary: { '500': '#16a34a' } } }, { id: 'tenant', priority: 5 });
```

Un document invalide lève `ThemeValidationError` (liste des problèmes dans `.errors`). Hors navigateur ou sans stockage, la persistance est simplement inactive.

## API

| Export | Rôle |
|---|---|
| `setupThemeEngine`, `getThemeEngine`, `getThemeState`, `reloadTheme` | cycle de vie |
| `setThemeMode`, `toggleThemeMode` | mode clair / sombre |
| `applyGlobalThemeOverride`, `removeGlobalThemeOverride`, `isGlobalThemeOverrideApplied` | surcharge globale (persistante en option) |
| `applyAppThemeOverride`, `removeAppThemeOverride` | surcharge par application |
| `themeToCssVars(document)` | variables `{ base, light, dark }` d'un document (aperçu, outils, Theme Studio) |
| `validateThemeDocument`, `validateThemeOverride`, `ThemeValidationError` | validation |
| `deepMerge`, `mergeByPriority` | fusion de documents |

## Thèmes fournis

`src/themes/theme.default.json` (priorité 1) est publié avec le paquet et servi par le shell. Une surcharge de déploiement se déclare via `window.egenThemeUrls[]` (priorité supérieure).

## Développement

```bash
yarn workspace @egen-civitas/esm-theme test
node scripts/migrate-theme-vars.mjs . --write   # migration des variables (idempotente)
```

Le test `consumers.test.ts` garantit qu'aucun fichier du dépôt n'utilise l'ancien nommage ni les anciennes API.
