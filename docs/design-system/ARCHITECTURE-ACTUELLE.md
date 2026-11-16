# Architecture AVANT la refonte (mémo historique)

> **Ce document décrit l'ancien système, aujourd'hui supprimé** (voir ADR-006). Il est conservé pour comprendre l'origine des choix de compatibilité (`egen-theme-mode`, `theme.default.json`, séquence de démarrage). L'architecture en vigueur est décrite dans [`packages/framework/esm-theme/README.md`](../../packages/framework/esm-theme/README.md) et [`ADR.md`](ADR.md).

> Établi par lecture du code de `main` (commit `768c770`). Ce qui n'a pas pu être vérifié par lecture est marqué **« à confirmer en DS-1 »** et sera verrouillé par des tests de caractérisation.

## 1. Le dépôt

Monorepo Yarn workspaces + Turbo, publié via Changesets (`.changeset/`, `baseBranch: main`). CI : `.github/workflows/ci.yml`, `publish-next.yml`, `release.yml`. Mesures de référence (docs/baseline-2026-11.md) : install ≈ 2 min, build ≈ 3 min, tests ≈ 8 min.

- `packages/framework/*` : bibliothèques `@egen-civitas/esm-*` (api, config, state, extensions, navigation, routes, react-utils, styleguide, tenant, platform, **theme**…) et le paquet d'agrégation `esm-framework`.
- `packages/shell/esm-app-shell` : le shell (rspack, `src/run.ts` = séquence de démarrage, `src/index.ejs` = HTML, `tools/targets.js`, `tools/publish-contract.test.ts`).
- `packages/tooling/*` : outillage dont le preset Tailwind.
- Dépôt applicatif séparé : `Frontend-esm-core` (apps `esm-*-app`, dont le Theme Studio).

Conventions : voir EGEN-FRAMEWORK-DEV.md §1 (R1–R8, N1–N9) et le journal §6 (coordination entre sessions).

## 2. Le moteur de thème actuel : `@egen-civitas/esm-theme`

Paquet autonome (`packages/framework/esm-theme`) : thèmes JSON (`src/themes/theme.default.json`, publiés avec le paquet), moteur singleton.

Fonctionnement (lu dans `engine.ts`, `flatten.ts`, `inject.ts`, `singleton.ts`) :

1. **Chargement** : une liste d'URL de thèmes JSON est chargée (+ rechargement périodique `pollIntervalMs` en développement pour le hot-reload).
2. **Choix/fusion** par **priorité** (le thème par défaut a la priorité la plus basse ; des thèmes de marque peuvent le surcharger).
3. **Aplatissement** (`flattenToCssVars`) : le JSON imbriqué devient des variables CSS `--chemin-en-kebab`. Les nœuds dont les seules clés sont `light`/`dark` deviennent des jeux par mode ; le reste est « base ». Sortie : `{ base, light, dark }`.
4. **Injection** de blocs `<style>` : `:root` (base) et `[data-theme="light"|"dark"]`.
5. **Mode** clair/sombre : attribut `data-theme` sur `<html>`, mémorisé dans `localStorage` sous la clé `egen-theme-mode`.
6. **Surcharges** : *globales* (`applyGlobalThemeOverride(schema, { id, priority })` / `removeGlobalThemeOverride`) et *par application* (scope `data-egen-app`).
7. **État** : `getThemeState()`, `subscribe()`, `setThemeMode()`, `toggleThemeMode()`.
8. Validation défensive : valeurs non sûres ignorées à l'injection (pas de `;`, `{}`, `/*`…).

À confirmer en DS-1 : règle exacte de fusion entre thèmes (profonde ou par remplacement), ordre d'injection des surcharges, comportement en cas d'échec de chargement.

## 3. Qui consomme `esm-theme` (hors paquet lui-même)

| Consommateur | Usage |
|---|---|
| `shell/esm-app-shell/src/run.ts` | `setupThemeEngine({ themeUrls, onApplied, … })` au démarrage ; URLs = `theme.default.json` + `window.egenThemeUrls[]` (surcharge de déploiement) ; le démarrage attend `themeReady` avant d'importer le styleguide |
| `shell/esm-app-shell/rspack.config.js` | copie `src/themes` d'`esm-theme` vers `dist/themes` ; sert ce dossier en dev (hot-reload disque) |
| `shell/esm-app-shell/src/index.ejs` | script **anti-FOUC** : pose `data-theme` avant la CSS depuis `localStorage['egen-theme-mode']` |
| `framework/esm-styleguide` | SCSS (`_vars`, `_panel`, `_glass`, `_carbon-bridge`…) consommant **plus de 700 références** `var(--colors-*, --border-radius-*, --typography-*, --panel-*, --transitions-*…)` ; bascule de mode dans la TopBar |
| `tooling/tailwind-preset` | mappe les variables du thème vers l'échelle Tailwind |
| `shell/.../tools/publish-contract.test.ts` | contrôle que `esm-theme/src/themes` est bien publié |
| Apps du Core (`Frontend-esm-core`) | `esm-settings-app` (apparence), `esm-theme-studio-app` (port runtime) |

`esm-framework` ne ré-exporte pas `esm-theme` : les apps l'importent directement.

## 4. Le contrat qui ne doit pas casser sans décision explicite

- **Noms des variables CSS** (`--colors-primary-500`, `--panel-card-background`, …) : des centaines d'usages dans le styleguide et les apps.
- **Clé `localStorage` `egen-theme-mode`** et attribut `data-theme` (anti-FOUC dans `index.ejs`).
- **Fichier `theme.default.json`** et son format (lu par le shell, publié, copié en `dist`).
- **API publique du paquet** (consommée par le shell et les apps du Core).
- **Séquence de démarrage** : thème prêt **avant** le premier rendu du styleguide.
