# Baseline du dépôt — novembre 2026 (tâche A1)

**Commit de référence** : `460edd3` (branche `main`). Mesurée le 2026-11-06, à partir d'un clone propre.
Ce document décrit l'existant. **Rien n'a été corrigé ici** (règle A1) : les points rouges sont listés pour être traités à part.

## Environnement de mesure

| Élément | Valeur |
|---|---|
| Node | 20.20.2 (voir « Particularités » : Node 22.23.4 testé, `yarn install` impossible) |
| Yarn | 4.10.3 (`packageManager`) |
| Machine | conteneur Linux, 4 Go de RAM |

## Commandes et résultats

| Commande | Résultat | Durée |
|---|---|---|
| `yarn install` | OK (avertissements de peer deps `YN0002` uniquement) | 2 min 14 s |
| `yarn build` (turbo, 36 paquets) | **OK** | 3 min 03 s |
| `yarn turbo run test typescript --continue` | 55 tâches sur 56 vertes (1 échec de charge, cf. ci-dessous) | 8 min 24 s |
| `yarn lint` | **ROUGE dans tous les paquets** (cf. défaut n°1) | — |

## Points rouges existants (à traiter hors des tâches de la doc)

### Défaut n°1 — `yarn lint` cassé sur une installation propre
`.eslintrc` (ligne 13) étend `plugin:playwright/recommended`, mais `eslint-plugin-playwright` n'est déclaré dans **aucun** `package.json`
(seul `@playwright/test` l'est). ESLint s'arrête avec « The plugin "eslint-plugin-playwright" was referenced from the config file ».
Conséquence : `yarn verify` ne peut pas être vert, ni en local ni en CI, tant que ce plugin n'est pas ajouté aux devDependencies racine.
Preuve : `cd packages/framework/esm-tenant && yarn lint`.

### Défaut n°2 — `build.integration.test.ts` fragile sous charge
`packages/tooling/egen/src/commands/build.integration.test.ts` : 3 tests sur 5 échouent par dépassement de délai (~90 s) lorsque turbo
lance tous les paquets en parallèle ; lancé seul, le fichier passe (5/5, ≈ 22 s par build de shell). Le test fait un vrai build du shell.
À traiter : augmenter le délai ou l'isoler de la parallélisation turbo.

## Particularités de l'environnement de mesure (sans lien avec le code)

- `yarn install` avec `.yarn/releases/yarn-4.10.3.cjs` échoue ici (`failed to compile wasm module … maximum function size`), sous Node 22 comme sous Node 20.
  Le paquet officiel `@yarnpkg/cli-dist@4.10.3` fonctionne. À garder en tête pour la reproductibilité (« un tiers refait les mêmes commandes »).
- Le binaire `eslint` de la racine n'est pas résolu par `yarn run` depuis un sous-paquet avec ce yarn : `node_modules/.bin` doit être dans le `PATH`.

## A3 — Contenu publié du paquet Shell (⚠️ → ✅)

`npm pack --dry-run` sur `@egen-civitas/esm-app-shell@2.8.2` : **seuls `README.md`, `package.json` et `dist/` sont publiés** (378 fichiers).
`rspack.config.js`, `src/index.ejs` et `tools/` sont **absents**, alors que `tooling/egen/src/utils/config.ts` fait
`require('@egen-civitas/esm-app-shell/rspack.config.js')` (utilisé par `egen build` et `egen debug`).

**Le remède proposé par la doc (ajouter ces 3 entrées à `files`) ne suffit pas.** Le config lit aussi, à l'exécution :
`dependencies.json`, `src/index.ts` (point d'entrée, en TypeScript), `src/assets/`, et
`../../framework/esm-theme/src/themes` (chemin qui n'existe que dans le monorepo). Rendre `egen build` possible hors monorepo demande donc
de publier les sources du shell et de remplacer ce chemin relatif : **décision de conception à prendre** (voir le rapport de session).
En contrepartie, `egen develop` et `egen start` n'ont pas ce problème : ils servent le `dist` précompilé (`develop.ts`, l.97).

## A4 — Qui produit `service-worker.js` ? (⚠️ → ✅)

Après `yarn build`, `packages/shell/esm-app-shell/dist` (287 fichiers) **ne contient pas de `service-worker.js`**.
`rspack.config.js` n'a qu'un seul point d'entrée et aucun plugin d'émission de service worker ; `run.ts` enregistre pourtant
`${spaPath}/service-worker.js`. Seul `tooling/egen/src/commands/develop.ts` référence ce fichier. En Web production, l'enregistrement
échoue donc silencieusement, ou le fichier doit être fourni par le consommateur. **Non tranché** : à confirmer avec l'équipe.
(La doc décide qu'en natif le SW est désactivé ; le sujet ne concerne que le Web.)

## Écarts entre la doc de développement et le code (à reporter dans `EGEN-FRAMEWORK-DEV.md`)

1. **`env-bridge.test.ts` (B3, G1)** : le « garde-fou existant » est dans `esm-ai-config/src/env-bridge.test.ts` et ne couvre que `EGEN_AI_*`
   (synchro avec `defaults.ts`). Il n'y a **aucun** test sur le pont `EGEN_TENANT_*`. Le test pour `egenTarget` et le contrôle
   `SECRET/TOKEN/…` sont donc à **créer** dans le shell.
2. **`resolveTarget(process.env)` (B1/B2)** : les validations « `EGEN_ENV` ≠ production » et « `EGEN_DEV_NO_AUTH` » ne peuvent pas lire `process.env` brut :
   `EGEN_ENV` est résolu par `resolveEnvironment(mode)` (repli sur `NODE_ENV`/mode) et `EGEN_DEV_NO_AUTH` par `resolvePublicEnv()` (fichiers `.env*`).
   L'appel se fait donc **dans** `module.exports`, avec ces deux valeurs résolues injectées dans l'objet passé à `resolveTarget`.
3. **`isMeaningfulImportmap` (B1)** : définie dans `rspack.config.js`, elle n'est pas importable depuis `tools/targets.js` (dépendance circulaire).
   Elle est déplacée dans `tools/helpers.js` et importée aux deux endroits (une seule définition).
4. **`resolveTarget` homonyme** : `esm-ai-tools/src/native/target.ts` exporte aussi un `resolveTarget` (cible d'outils IA). Pas de collision (autre paquet), mais à connaître.
