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

### `packages/framework/esm-ai-*` — Layer AI (interface frontend uniquement)

Le moteur IA (LLM, prompt, mémoire, STT/TTS) vit dans le **backend**. Le frontend ne fait que :
afficher, capturer/lire l'audio, et exécuter les *tools frontend* demandés par le backend (navigation, lecture d'écran…).

| Package | Rôle |
|---|---|
| `@egen-civitas/esm-ai-config` | Adresse/transport du backend IA, sécurité d'exécution des tools |
| `@egen-civitas/esm-ai-events` | Événements AI |
| `@egen-civitas/esm-ai-context` | Snapshot du contexte EGEN (utilisateur, tenant, navigation) envoyé au backend |
| `@egen-civitas/esm-ai-tools` | Tools frontend exécutables à la demande du backend (navigate, inspect-element, describe_screen...) |
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
yarn build              # nécessaire avant les trois commandes suivantes

yarn verify:publint     # forme du package publié : exports, main, types, files
yarn verify:attw        # résolution des types selon le mode du consommateur
yarn verify:pack        # test décisif : pack + install isolé (hors monorepo,
                         # sans hoisting) + import réel de chaque package
```

`verify:pack` est le plus important des trois : il construit un projet
consommateur neuf dans `/tmp`, y installe chaque package via son tarball
`npm pack` local (uniquement les vraies dépendances déclarées sont
résolues — aucun accès au reste du monorepo), puis importe réellement
chaque package. C'est ce test qui aurait détecté, avant toute publication,
n'importe quelle dépendance interne non déclarée.

Les trois commandes tournent aussi en CI (`.github/workflows/ci.yml`,
job `verify-publish`) et bloquent la release (`release.yml`) si elles
échouent.

`@arethetypeswrong/cli` (`attw`) vérifie que les types de chaque package
se résolvent correctement selon le mode de résolution du consommateur
(node10, node16 CJS/ESM, bundler). Contrairement à publint, il a besoin
de résoudre les dépendances internes `@egen-civitas/*` du package testé
depuis un vrai registre — resté volontairement débranché de la CI tant
que ce n'était pas le cas (voir historique git). Branché depuis que les
34 packages sont publiés : **état actuel, 19 packages ont une vraie
erreur de résolution 💀/🥴, pas encore triée ni corrigée** — voir
`yarn verify:attw` pour le détail. Le plus fréquent, sur au moins 11
packages, est un sous-chemin `./mock` qui pointe directement vers un
fichier `.ts`/`.tsx` source sans condition `types` explicite (fonctionne
avec les outils de test du monorepo qui compilent le TS à la volée, mais
casse la résolution de types formelle pour un consommateur externe) — à
traiter dans un passage dédié.

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
│       ├── "@egen-civitas/esm-framework": "^1.0.0"
│       ├── "@egen-civitas/esm-theme": "^1.0.0"
│       ├── "@egen-civitas/esm-styleguide": "^1.0.0"
│       └── "@egen-civitas/egen": "^1.0.0"
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
