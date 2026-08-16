# @egen-civitas/esm-framework — Framework Micro-Frontend EGEN

Monorepo du framework frontend EGEN. Fournit l'ensemble des packages nécessaires pour construire des applications micro-frontend basées sur **Single-SPA**, **React 18**, **RxJS**, et **@carbon/react**.

## Architecture

Ce repo contient **3 familles de packages** :

### `packages/framework/` — Framework runtime

| Package | Rôle |
|---|---|
| `@egen-civitas/esm-globals` | Types FHIR, globals Single-SPA |
| `@egen-civitas/esm-utils` | Utilitaires généraux |
| `@egen-civitas/esm-state` | Store réactif (RxJS) |
| `@egen-civitas/esm-translations` | Internationalisation (i18next) |
| `@egen-civitas/esm-config` | Configuration dynamique runtime |
| `@egen-civitas/esm-theme` | Moteur de thème dynamique (tokens CSS) |
| `@egen-civitas/esm-navigation` | Router SPA |
| `@egen-civitas/esm-api` | Couche HTTP (fetch + SWR) |
| `@egen-civitas/esm-data-api` | Abstraction données (FHIR-ready) |
| `@egen-civitas/esm-error-handling` | Gestion des erreurs |
| `@egen-civitas/esm-feature-flags` | Feature flags runtime |
| `@egen-civitas/esm-context` | Contexte React partagé |
| `@egen-civitas/esm-tenant` | Support multi-tenant |
| `@egen-civitas/esm-offline` | Mode hors-ligne (IndexedDB/Dexie) |
| `@egen-civitas/esm-extensions` | Système de plugins/extensions |
| `@egen-civitas/esm-dynamic-loading` | Chargement dynamique de modules |
| `@egen-civitas/esm-react-utils` | Hooks React réutilisables |
| `@egen-civitas/esm-routes` | Système de routing |
| `@egen-civitas/esm-styleguide` | Design system + composants UI |
| `@egen-civitas/esm-expression-evaluator` | Évaluateur d'expressions |
| **`@egen-civitas/esm-framework`** | **Façade publique — point d'entrée unique** |

### `packages/ai/` (dans `packages/framework/`) — Layer AI

| Package | Rôle |
|---|---|
| `@egen-civitas/esm-ai-config` | Configuration AI |
| `@egen-civitas/esm-ai-events` | Événements AI |
| `@egen-civitas/esm-ai-context` | Contexte de conversation |
| `@egen-civitas/esm-ai-tools` | Outils natifs (inspect-element, describe_screen...) |
| `@egen-civitas/esm-ai-extensions` | Bridge AI ↔ extensions |
| **`@egen-civitas/esm-ai-framework`** | **Façade publique AI** |

### `packages/tooling/` — Outils de build

| Package | Rôle |
|---|---|
| `browserslist-config-egen` | Cibles de compatibilité navigateurs |
| `@egen-civitas/rspack-config` | Configuration Rspack partagée |
| `@egen-civitas/webpack-config` | Configuration Webpack partagée |
| `@egen-civitas/storybook` | Storybook du styleguide |
| `@egen-civitas/typedoc-plugin-file-categories` | Plugin TypeDoc |
| `@egen-civitas/egen` | CLI (commande : `egen`) : `serve`, `build`, `develop` |

### `packages/shell/` — Template de shell

| Package | Rôle |
|---|---|
| `@egen-civitas/esm-app-shell` | Template Single-SPA root-config (à copier dans tes projets) |

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
yarn add @egen-civitas/esm-framework @egen-civitas/esm-theme @egen-civitas/esm-styleguide

# Pour le layer AI (optionnel)
yarn add @egen-civitas/esm-ai-framework

# CLI de développement
yarn add --dev @egen-civitas/egen
```

### Dans une app micro-frontend

```tsx
// mon-app/src/index.tsx
import { defineConfigSchema, getConfig, subscribe } from '@egen-civitas/esm-framework';
import { useConfig, usePatient } from '@egen-civitas/esm-framework';

export function start() {
  // Ton app Single-SPA
}
```

### Démarrer en développement

```bash
# Depuis la racine de TON projet consommateur
npx @egen-civitas/egen develop --sources "packages/apps/*"
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

### Vérifier qu'un package est réellement installable (avant de publier)

Dans le monorepo, Yarn hoiste tous les `node_modules` à la racine : un
package qui importe une dépendance `@egen-civitas/*` sans la déclarer dans
son propre `package.json` peut sembler fonctionner alors qu'il est cassé
pour n'importe quel consommateur externe. Ces deux commandes le détectent,
**après un `yarn build`** :

```bash
yarn build              # nécessaire avant les deux commandes suivantes

yarn verify:publint     # forme du package publié : exports, main, types, files
yarn verify:pack        # test décisif : pack + install isolé (hors monorepo,
                         # sans hoisting) + import réel de chaque package
```

`verify:pack` est le plus important des deux : il construit un projet
consommateur neuf dans `/tmp`, y installe chaque package via son tarball
`npm pack` local (uniquement les vraies dépendances déclarées sont
résolues — aucun accès au reste du monorepo), puis importe réellement
chaque package. C'est ce test qui aurait détecté, avant toute publication,
n'importe quelle dépendance interne non déclarée.

Les deux commandes tournent aussi en CI (`.github/workflows/ci.yml`,
job `verify-publish`) et bloquent la release (`release.yml`) si elles
échouent.

`@arethetypeswrong/cli` (`attw`) est aussi disponible en devDependency
pour une vérification plus fine de la résolution des types selon le mode
de résolution du consommateur (`npx attw --pack .` dans un package). Il
n'est volontairement pas branché en CI pour l'instant : tant qu'aucun
package `@egen-civitas/*` n'est publié sur un registre, `attw --pack`
essaie de récupérer les dépendances internes du package testé depuis le
vrai registre npm et échoue systématiquement dessus — un faux négatif
plutôt qu'un vrai signal. À rebrancher une fois le premier `npm publish`
réel effectué (ou via un registre local type Verdaccio en CI).

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
│       ├── "@egen-civitas/esm-framework": "^9.0.0"
│       ├── "@egen-civitas/esm-theme": "^9.0.0"
│       ├── "@egen-civitas/esm-styleguide": "^9.0.0"
│       └── "@egen-civitas/egen": "^9.0.0"
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
