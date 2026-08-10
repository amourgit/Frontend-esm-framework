# @egen/esm-framework — Framework Micro-Frontend EGEN

Monorepo du framework frontend EGEN. Fournit l'ensemble des packages nécessaires pour construire des applications micro-frontend basées sur **Single-SPA**, **React 18**, **RxJS**, et **@carbon/react**.

## Architecture

Ce repo contient **3 familles de packages** :

### `packages/framework/` — Framework runtime

| Package | Rôle |
|---|---|
| `@egen/esm-globals` | Types FHIR, globals Single-SPA |
| `@egen/esm-utils` | Utilitaires généraux |
| `@egen/esm-state` | Store réactif (RxJS) |
| `@egen/esm-translations` | Internationalisation (i18next) |
| `@egen/esm-config` | Configuration dynamique runtime |
| `@egen/esm-theme` | Moteur de thème dynamique (tokens CSS) |
| `@egen/esm-navigation` | Router SPA |
| `@egen/esm-api` | Couche HTTP (fetch + SWR) |
| `@egen/esm-data-api` | Abstraction données (FHIR-ready) |
| `@egen/esm-error-handling` | Gestion des erreurs |
| `@egen/esm-feature-flags` | Feature flags runtime |
| `@egen/esm-context` | Contexte React partagé |
| `@egen/esm-tenant` | Support multi-tenant |
| `@egen/esm-offline` | Mode hors-ligne (IndexedDB/Dexie) |
| `@egen/esm-extensions` | Système de plugins/extensions |
| `@egen/esm-dynamic-loading` | Chargement dynamique de modules |
| `@egen/esm-react-utils` | Hooks React réutilisables |
| `@egen/esm-routes` | Système de routing |
| `@egen/esm-styleguide` | Design system + composants UI |
| `@egen/esm-expression-evaluator` | Évaluateur d'expressions |
| **`@egen/esm-framework`** | **Façade publique — point d'entrée unique** |

### `packages/ai/` (dans `packages/framework/`) — Layer AI

| Package | Rôle |
|---|---|
| `@egen/esm-ai-config` | Configuration AI |
| `@egen/esm-ai-events` | Événements AI |
| `@egen/esm-ai-context` | Contexte de conversation |
| `@egen/esm-ai-tools` | Outils natifs (inspect-element, describe_screen...) |
| `@egen/esm-ai-extensions` | Bridge AI ↔ extensions |
| **`@egen/esm-ai-framework`** | **Façade publique AI** |

### `packages/tooling/` — Outils de build

| Package | Rôle |
|---|---|
| `browserslist-config-egen` | Cibles de compatibilité navigateurs |
| `@egen/rspack-config` | Configuration Rspack partagée |
| `@egen/webpack-config` | Configuration Webpack partagée |
| `@eigen/storybook` | Storybook du styleguide |
| `@eigen/typedoc-plugin-file-categories` | Plugin TypeDoc |
| `egen` | CLI : `serve`, `build`, `develop` |

### `packages/shell/` — Template de shell

| Package | Rôle |
|---|---|
| `@eigen/esm-app-shell` | Template Single-SPA root-config (à copier dans tes projets) |

---

## Stack technologique

- **Build** : Yarn 4 Berry + Turborepo + Rspack + SWC
- **Runtime** : React 18 + Single-SPA 6 + RxJS 6
- **UI** : @carbon/react + Framer Motion + D3 + GSAP
- **Styling** : SASS + CSS Variables
- **Tests** : Vitest + @testing-library + Playwright
- **Versionnement** : Changesets

---

## Utiliser ce framework dans un projet

### Installation

```bash
# Dans le package.json de ton projet
yarn add @egen/esm-framework @egen/esm-theme @egen/esm-styleguide

# Pour le layer AI (optionnel)
yarn add @eigen/esm-ai-framework

# CLI de développement
yarn add --dev eigen
```

### Dans une app micro-frontend

```tsx
// mon-app/src/index.tsx
import { defineConfigSchema, getConfig, subscribe } from '@eigen/esm-framework';
import { useConfig, usePatient } from '@eigen/esm-framework';

export function start() {
  // Ton app Single-SPA
}
```

### Démarrer en développement

```bash
# Depuis la racine de TON projet consommateur
npx eigen develop --sources "packages/apps/*"
```

---

## Développer ce framework

### Prérequis
- Node.js >= 20.11.0
- Yarn 4.x (`corepack enable`)

### Installation

```bash
git clone https://github.com/ton-org/Frontend-esm-framework
cd Frontend-esm-framework
yarn install
yarn build
```

### Build

```bash
yarn build           # Build tous les packages (ordonné par Turborepo)
yarn test            # Tests unitaires
yarn verify          # lint + test + typescript
yarn storybook       # Storybook du styleguide
```

### Publier une nouvelle version

Ce repo utilise [Changesets](https://github.com/changesets/changesets) :

```bash
# 1. Créer un changeset (décrire tes changements)
yarn changeset

# 2. Sur CI, la release PR est créée automatiquement
# 3. Merger la release PR publie sur npm
```

---

## Structure d'un projet consommateur

```
Mon-Projet/
├── package.json
│   └── dependencies:
│       ├── "@eigen/esm-framework": "^9.0.0"
│       ├── "@eigen/esm-theme": "^9.0.0"
│       ├── "@eigen/esm-styleguide": "^9.0.0"
│       └── "eigen": "^9.0.0"
├── packages/
│   ├── shell/                   ← copié depuis packages/shell/esm-app-shell
│   └── apps/
│       ├── mon-app-1/
│       └── mon-app-2/
└── turbo.json
```

---

## Licence

MPL-2.0
