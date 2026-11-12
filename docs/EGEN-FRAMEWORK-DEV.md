# EGEN Framework — Document de développement « Multiplateforme » (Web · Android · iOS)

**Statut** : document de référence du dépôt `Frontend-esm-framework` pour la réforme multiplateforme.
**Date de rédaction** : 2026-11-06 · **Base de code lue** : analyse sur `fd3d468` ; existence des chemins cités revérifiée sur `7f6775a` (écarts sur les fichiers concernés : mineurs).
**Public** : développeurs du framework. Chaque tâche indique *où toucher*, *quoi faire*, *quoi ne pas faire*, *comment valider*.

> **Honnêteté sur l'état des connaissances.** Tout ce qui est marqué ✅ a été lu dans le code. Tout ce qui est marqué ⚠️ est une hypothèse ou un point à confirmer *avant* d'écrire du code (chaque ⚠️ a une tâche de vérification). Les chemins de fichiers cités existent ; les numéros de ligne sont indicatifs (le code bouge).

---

## 0. Contexte et décisions déjà prises

| Décision | Conséquence pour le framework |
|---|---|
| Composition **au build** : les apps embarquées sont déclarées dès le départ, **aucun chargement à chaud** | Le Shell reste le seul orchestrateur ; pas de registre distant à l'exécution ; overrides d'import map **interdits** en natif |
| **4 briques** : `egen-framework` → `egen-core` → `egen-distributions` → `egen-mobile` | Ce dépôt ne contient **ni apps métier, ni code natif, ni manifestes de produit** |
| Host natif = **Capacitor** (dans `egen-mobile`), isolé derrière `@egen-civitas/esm-platform` | Le framework **ne dépend jamais** de `@capacitor/*` ; il définit un *contrat de Host* |
| Le Web ne doit **pas régresser** | Toute nouvelle option a une valeur par défaut = comportement actuel |

### Vocabulaire
- **Cible (`target`)** : `web` | `android` | `ios`. Fixée **au build**, jamais devinée au runtime.
- **Host** : enveloppe native (dans `egen-mobile`) qui charge le SPA et sert les capacités natives.
- **Capacité** : service de plateforme nommé et versionné (`session`, `secureStorage`, `files`…).
- **Artefact SPA** : dossier statique produit par `egen-distributions` (shell + apps + import map + routes + `build-manifest.json`).
- **Lockdown** : mode natif où tout ce qui permet de charger/exécuter du code non prévu est désactivé.

---

## 1. Règles invariantes (à relire avant chaque PR)

**À FAIRE**
- **R1** Une seule base de code Shell. Les différences entre cibles vivent **uniquement** dans : `tools/targets.js` (build), `@egen-civitas/esm-platform` (runtime), et le Host (hors dépôt).
- **R2** Valeurs par défaut = comportement Web actuel. Un build sans `EGEN_TARGET` doit produire **exactement** le même résultat qu'aujourd'hui.
- **R3** Toute nouvelle variable de build passe par `targets.js` et est couverte par un test.
- **R4** Toute interaction native passe par `esm-platform`. Les apps ne voient jamais le pont.
- **R5** Toute erreur de plateforme est un `PlatformError` typé (jamais une `Error` générique, jamais une chaîne).
- **R6** Tout changement public = **changeset** (`.changeset/*.md`) + semver correct.
- **R7** Un nouveau package suit le **gabarit `esm-tenant`** (§ C1). Pas d'écart de structure.
- **R8** Réutiliser l'existant avant de créer : `egenFetch`, `esm-state`, `esm-config`, pont `window.*` du shell, `composeMiddlewares`. Une abstraction nouvelle n'est acceptée que si elle a ≥ 2 usages réels.

**À NE PAS FAIRE**
- **N1** Aucun `if (platform === 'ios')` / `if (target === …)` en dehors de `esm-platform` et `targets.js`.
- **N2** Aucun import de `@capacitor/*`, API Android ou iOS dans ce dépôt.
- **N3** Aucun secret (clé privée, jeton, mot de passe, clé API privée) dans un bundle, un `.html`, un `.env` embarqué, ni dans la liste blanche des ponts `EGEN_*` → `window.*`.
- **N4** Aucun sniffing de User-Agent pour détecter la plateforme.
- **N5** Aucun stockage de jeton dans `localStorage` / IndexedDB en cible native.
- **N6** Aucune dépendance runtime ajoutée sans justification écrite dans la PR (taille, maintenance, alternative existante).
- **N7** Ne pas « corriger au passage » du code hors périmètre de la tâche.
- **N8** Ne pas créer de configuration Rspack séparée par cible (un seul `rspack.config.js`).
- **N9** Ne pas ajouter de package par capacité tant qu'aucune n'est partagée par ≥ 2 apps.

---

## 2. Carte des changements

| Chantier | Paquets / fichiers touchés | Nature |
|---|---|---|
| **A** Baseline & vérités | `scripts/`, shell `package.json`, `src/service-worker/` | vérification + 1 script |
| **B** Cible de build | `shell/esm-app-shell/{rspack.config.js, src/index.ejs, tools/targets.js}`, `tooling/egen/src/{cli.ts, utils/config.ts, commands/build.ts}` | modif + 1 fichier nouveau |
| **C** `esm-platform` | `framework/esm-platform/**` (nouveau), `esm-framework/{package.json, src/index.ts, src/internal.ts, mock.tsx}`, shell `dependencies.json` | **nouveau package** + câblage |
| **D** Auth & API | `esm-api/src/{egen-fetch.ts, current-user.ts, dev-auth-bypass.ts, config-schema.ts, index.ts}`, `esm-globals/src/types.ts` | modif |
| **E** Hors ligne & stockage | `esm-offline/src/*`, `shell/src/{index.ts, run.ts}`, `esm-globals/src/types.ts` | modif |
| **F** Composition & contrats | `esm-globals/src/types.ts` (`EgenAppRoutes`), `esm-routes/src/loaders/{pages.ts, components.ts}`, `esm-dynamic-loading/src/{import-maps.ts, route-maps.ts}`, `tooling/rspack-config/src/index.ts` | modif |
| **G** Sécurité | `shell/{rspack.config.js, src/index.ejs, src/run.ts}`, `esm-api/src/dev-auth-bypass.ts`, tests de garde-fou | modif |
| **H** Qualité & release | racine (`package.json`, `turbo.json`, `scripts/`, `.changeset/`), e2e | outillage |

---

## 3. Ordre d'exécution et dépendances

```
A (baseline) ──► B (targets) ──► B5 (CSP)  ┐
      │              │                      ├─► H2 (e2e SPA statique)
      │              └──► F1 (lockdown) ───┘
      └──► C (esm-platform) ──► D (auth) ──► E (offline)
                    └──► F2/F3 (contrat routes)
```

| Lot | Tâches | Bloque |
|---|---|---|
| **P0** | A1–A4, B1–B3, C1–C3 | tout le reste |
| **P1** | B4–B7, C4–C7, D1–D4, F1–F2, G1–G2 | prototypes Host |
| **P2** | C8–C10, D5–D6, E1–E4, F3–F4, G3–G4 | industrialisation |
| **P3** | H1–H6 (en continu dès P0 pour H1/H3/H4) | — |

Taille : **S** ≤ 0,5 j · **M** 1–2 j · **L** 3–5 j · **XL** > 5 j (à découper).

---

## CHANTIER A — Baseline et vérités (aucune modification fonctionnelle)

### A1 — Baseline reproductible · S
- **But** : savoir ce qui passe *avant* de toucher quoi que ce soit.
- **Faire** : `yarn setup`, `yarn verify`, `yarn workspace @egen-civitas/esm-app-shell build:production`. Consigner dans `docs/baseline-2026-11.md` : versions Node/Yarn, durée, avertissements, tests rouges existants.
- **Ne pas faire** : corriger les tests rouges ici ; les lister seulement.
- **Validé quand** : un tiers refait les mêmes commandes et obtient le même résultat.

### A2 — Inventaire réel du `dist` du Shell · M
- **Fichier nouveau** : `scripts/inventory-dist.mjs`.
- **Faire** : lister tous les fichiers de `packages/shell/esm-app-shell/dist` ; servir le dossier en statique sous `/app` ; charger la page avec Playwright (déjà en devDependency racine) ; enregistrer **toutes** les requêtes réseau ; sortir un rapport JSON `{ fichiersAttendus, fichiersRequêtés, 404, horsOrigine }`.
- **Question à trancher** (⚠️ non vérifiée à ce jour) : quels fichiers sont chargés hors du `dist` (import map, routes registry, `service-worker.js`, thèmes, polices, chunks) ?
- **Ne pas faire** : modifier le build pour « faire passer » le test ; le rapport décrit l'existant.
- **Validé quand** : le rapport existe et sert de référence aux tâches B et H2.

### A3 — Contenu publié du package Shell · S
- ✅ `esm-app-shell/package.json` déclare `"files": ["dist"]`, alors que `tooling/egen/src/utils/config.ts` fait `require('@egen-civitas/esm-app-shell/rspack.config.js')`.
- ✅ **Confirmé le 2026-11-06** (`npm pack --dry-run`, v2.8.2) : seuls `README.md`, `package.json` et `dist/` étaient publiés ; `rspack.config.js`, `src/index.ejs` et `tools/` étaient **absents** ⇒ `egen build` inutilisable hors monorepo.
- ✅ **Le remède initial (ajouter ces 3 entrées) ne suffisait pas.** Le config lit aussi `dependencies.json`, `src/index.ts`, `src/assets/`, le dossier des thèmes (`esm-theme/src/themes`, absent du paquet `esm-theme`) et `esm-translations/translations` (absent du paquet `esm-translations`).
- ✅ **Décision (2026-11-06)** : le shell est publié **avec ses sources de construction** (`dist` précompilé conservé pour `egen develop`/`start`) ; le build final spécifique à la cible reste **chez le consommateur** (`egen build`). Les chemins propres au monorepo sont résolus via les paquets. Installation hoistée requise.
- ✅ **Fait** (PR « publier les sources de construction ») : `files` du shell, `esm-theme` (`src/themes`, export `./package.json`), `esm-translations` (`translations`), test `tools/publish-contract.test.ts`.
- ✅ **Validé** : projet vide + tarballs locaux + `@egen-civitas/egen@2.2.0` ⇒ `egen build --importmap … --routes … --spa-path /app/ --api-url https://…` OK en 28 s ; `dist` du monorepo identique à la baseline.

### A4 — Service worker : qui produit `service-worker.js` ? · S
- ✅ `run.ts` enregistre `${getEgenSpaBase()}service-worker.js` ; `rspack.config.js` n'a qu'un seul entry et aucun plugin d'émission de SW (seul reste `ignoreWarnings: InjectManifest…`). Le source existe : `src/service-worker/`.
- ✅ **Constat (2026-11-06)** : après `yarn build`, `dist/` (287 fichiers) ne contient **pas** de `service-worker.js`. Personne ne le produit : `src/service-worker/` s'appuie sur `self.__WB_MANIFEST` (Workbox `InjectManifest`), mais aucun plugin ne l'injecte et aucun `workbox-*` n'est déclaré ; ce code ne peut pas être compilé (perdu à l'import initial du dépôt). `run.ts` enregistre donc un fichier inexistant en Web `EGEN_OFFLINE=enable`, et `egen develop --support-offline` lit `dist/service-worker.js` (`readFileSync`) sans qu'il existe.
- ✅ **Décision (2026-11-06)** : **ne pas ressusciter Workbox dans cette réforme** (nouvelles dépendances runtime, N6 ; hors périmètre, N7). Le SW Web est **non supporté en l'état** ; en natif il est désactivé (E1). `src/service-worker/` est exclu du paquet publié. Une tâche dédiée Web (hors multiplateforme) devra soit restaurer la génération du SW, soit retirer le code mort et l'enregistrement.

---

## CHANTIER B — Cible de build (`EGEN_TARGET`)

### B1 — Module `tools/targets.js` (nouveau) · M
- **Fichier** : `packages/shell/esm-app-shell/tools/targets.js` + `targets.test.ts` (même dossier, patron de `brand.test.ts`).
- **Contrat** : `resolveTarget(env) → TargetConfig` (fonction **pure**, aucune lecture de `process.env` interne : on lui passe l'objet).

```js
// TargetConfig
{
  target: 'web' | 'android' | 'ios',
  native: boolean,                 // target !== 'web'
  publicPath: string,              // web: EGEN_PUBLIC_PATH || '/egen-civitas/spa' ; natif: '/app'
  serviceWorker: boolean,          // web: = EGEN_OFFLINE==='enable' ; natif: false
  offlineData: boolean,            // web: = EGEN_OFFLINE==='enable' ; natif: EGEN_OFFLINE_DATA !== 'disable'
  importmapMode: 'inline' | 'url', // web: comme aujourd'hui ; natif: 'inline' OBLIGATOIRE
  routesMode: 'inline' | 'url',    // idem
  allowImportMapOverrides: boolean,// web: comme aujourd'hui ; natif: false
  allowDevAuthBypass: boolean,     // web: comme aujourd'hui ; natif: false
  requireAbsoluteApiUrl: boolean,  // natif: true
  csp: string | null,              // web: null ; natif: chaîne CSP (cf. B5)
}
```
- **Règles de validation** (le build **échoue** avec un message explicite) :
  - natif + `EGEN_DEV_NO_AUTH=true` → erreur ;
  - natif + `EGEN_API_URL` non absolue (`^https://`) → erreur ;
  - natif + import map ou routes vides/`url` → erreur (un artefact natif doit être autonome) ;
  - `EGEN_TARGET` inconnu → erreur (pas de repli silencieux) ;
  - `EGEN_ENV` ≠ `production` en natif → erreur.
- **Piège connu ✅** : `EGEN_PUBLIC_PATH=''` retombe sur la valeur par défaut (`||`). Ne jamais passer de chaîne vide ; la constante native est `/app`.
- ✅ **Écart levé** : `EGEN_ENV` et `EGEN_DEV_NO_AUTH` sont résolus dans `module.exports` (`resolveEnvironment`, `resolvePublicEnv` avec fichiers `.env*`) : l'appelant les injecte **résolus** dans l'objet passé à `resolveTarget` (sinon un `.env` pourrait réactiver le bypass en natif sans erreur de build). `isMeaningful*` est déplacée dans `tools/helpers.js` (une seule définition).
- **Ne pas faire** : lire `process.env` dans `resolveTarget` ; ajouter une option sans test ; dupliquer la logique `isMeaningfulImportmap` (la **réutiliser**).
- **Tests** : table de cas `web` (défauts identiques à l'existant — test de non-régression obligatoire), `android`, `ios`, chaque erreur.

### B2 — Brancher `targets.js` dans `rspack.config.js` · M
- **Fichier** : `packages/shell/esm-app-shell/rspack.config.js`.
- **Où** : constantes en tête (`egenPublicPath`, `egenOffline`, `egenImportmapDef/Url`, `egenRoutesDef/Url`), `templateParameters` de `HtmlWebpackPlugin`, `DefinePlugin`.
- **Faire** : appeler `resolveTarget(process.env)` **une fois** ; remplacer ces constantes par les champs du résultat ; ajouter au `DefinePlugin` : `process.env.EGEN_TARGET`. Ne rien changer à la logique MF, aux loaders, aux `CopyRspackPlugin`.
- **Ne pas faire** : créer un second `rspack.config.js` (N8) ; toucher `shared` / `dependencies.json` ici.
- **Validé quand** : (1) build sans `EGEN_TARGET` ⇒ `dist` **identique octet pour octet** (hors horodatage/hash) à la baseline A1 ; (2) `EGEN_TARGET=android` produit un `index.html` avec import map et routes inlinés et sans référence à `service-worker`.

### B3 — Pont build → `window` : `egenTarget` · S
- **Fichiers** : `rspack.config.js` (nouveau `egenTargetConfigDef`), `src/index.ejs`, `esm-globals/src/types.ts` (interface `Window`).
- **Faire** : sur le modèle **exact** des ponts `egenAiConfigDef` / `egenTenantConfigDef` : `Object.assign(window, {"egenTarget":"android"})` en `<script>` **avant** `initializeSpa`. Typer `egenTarget?: 'web'|'android'|'ios'` ; défaut absent ⇒ `web`.
- ✅ **Correction** : `env-bridge.test.ts` n'existe que dans `esm-ai-config` et ne couvre que `EGEN_AI_*` (aucun test sur le pont tenant). Le test de `egenTarget` est donc **créé** dans le shell (`tools/targets.test.ts`, liste blanche `['egenTarget']`, pas de nom sensible, valeur = la seule cible). Le pont n'est injecté qu'en natif (HTML Web identique, R2).
- **Ne pas faire** : ajouter d'autres clés au pont sans les mettre dans la liste blanche (N3).

### B4 — Option `--platform` du CLI `egen` · M
- **Fichiers** : `tooling/egen/src/cli.ts` (commande `build`, options ~l.228-320), `tooling/egen/src/commands/build.ts` (`BuildArgs`, `BuildConfig`), `tooling/egen/src/utils/config.ts` (`BuildOptions`, `setBundlerEnv`).
- ✅ `--target` **existe déjà** et désigne le **dossier de sortie** : ne pas le réutiliser. Nom retenu : **`--platform web|android|ios`** (défaut `web`), clé `platform` dans `BuildConfig`.
- **Faire** : `setBundlerEnv` mappe `platform` → `EGEN_TARGET` ; priorité habituelle `buildConfig.platform || args.platform`.
- **Tests** : étendre `cli.test.ts` et `build.integration.test.ts` (build `--platform android` ⇒ HTML natif).
- **Ne pas faire** : renommer l'option `--target` existante (rupture).

### B5 — CSP et scripts inline · L
- ✅ `index.ejs` contient des `<script>` inline : anti-FOUC thème, ponts `window.egen*`, `initializeSpa({...})`. Une CSP `script-src 'self'` les bloquerait.
- **Faire (cible native uniquement)** : générer ces scripts en **fichiers émis** (`bootstrap.[hash].js`) référencés par `<script src>` ; poser une balise `<meta http-equiv="Content-Security-Policy" content="…">` issue de `targets.csp`.
- **CSP de départ (proposition ⚠️ à valider sur appareil)** : `default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' <API_ORIGIN>; base-uri 'self'; form-action 'self'`. `'unsafe-inline'` pour les styles est à réexaminer (Carbon / style injection).
- ✅ **Réalisé** : `tools/bootstrap.js` produit, **en natif seulement**, `bootstrap-head.<hash>.js` (thème anti-FOUC, ponts `window.egen*`) et `bootstrap.<hash>.js` (`initializeSpa`, écouteur délégué `data-egen-action`), émis par `EmitAssetsPlugin` ; `index.ejs` bascule dessus si `egenBootstrap` est défini et pose la `<meta>` CSP issue de `targets.csp`. **Écart avec la doc** : le gabarit contenait aussi des gestionnaires `onclick` inline (`location.reload()`, `copyText(...)`), que `script-src 'self'` bloquerait ; ils sont remplacés en natif par `data-egen-action`. Les blocs `type="systemjs-importmap"` / `type="egen-routes"` restent inline : ce sont des données, jamais exécutées, donc hors CSP.
- ✅ **HTML Web inchangé (R2)** : directives EJS placées sur les mêmes lignes que le contenu existant ; `dist` Web identique octet pour octet à `main`, et rendu comparé à l'ancien gabarit sur 32 combinaisons ; un rendu de référence est figé dans `tools/__snapshots__/bootstrap.test.ts.snap`.
- ✅ **Bundle de production mesuré (2026-11-07, build android)** : 137 fichiers JS analysés. `eval(` : 1 occurrence, chemin Node uniquement (`eval("require")`). `Function("return this")` : replis ne s'exécutant que si `globalThis`/`self` manquent (jamais en navigateur). `Function("callbacks", …)` : chargement d'entrées *Module Federation distantes* (`loadEsmEntry`, `loadSystemJsEntry`), **présumé** non utilisé par le shell (les apps passent par SystemJS et l'import map) : inférence lue dans le code, **non mesurée** — à confirmer par le test e2e H2. **Seule source de code généré atteignable** : `@splinetool/runtime` (génération de code type `ndarray`, 4 modules WebAssembly), chargé à la demande par `SplineScene` (le « Robot 3D » de l'assistant) depuis `esm-styleguide`.
- ✅ **Décision** : `'unsafe-eval'` et `'wasm-unsafe-eval'` **ne sont pas ajoutés** à la CSP. `SplineScene` rend un conteneur vide en natif (`isNativeTarget()`), et `preloadSplineScene` ne télécharge plus la scène (ressource distante hors `connect-src`). Web inchangé. Si un décor 3D est voulu en natif, il faudra un moteur sans génération de code, pas une CSP affaiblie.
- ⚠️ **Non vérifié ici** : l'exécution réelle dans une WebView sous cette CSP (« zéro violation en console », test e2e H2). Les `style="…"` inline sont couverts par `style-src 'unsafe-inline'` (à réexaminer).
- **Ne pas faire** : toucher le HTML Web (R2) ; autoriser `'unsafe-eval'`.
- **Validé quand** : l'artefact natif s'exécute sous cette CSP sans violation en console (test e2e H2). *Statut : tout ce qui est vérifiable hors navigateur l'est (HTML, fichiers émis, bundle) ; l'e2e reste à faire.*

### B6 — Chemins et origine · S
- ✅ `initializeSpa` fixe `<base href>` et `__webpack_public_path__` **depuis `spaPath` au runtime**. ✅ `makeUrl()` accepte déjà une URL `http…` absolue et `egenBase` peut être absolu.
- **Faire** : documenter (README shell) que `spaPath` natif = `/app` et que `apiUrl` natif est absolu ; ajouter un test `index.test` vérifiant `setupPaths` avec `apiUrl: 'https://api.exemple.ga/egen'`.
- **Point d'attention ✅** : `run.ts` (~l.350) fait `new URL(`${window.egenBase}${restBaseUrl}/session`, window.location.origin)` — correct avec une base absolue ; à couvrir par un test.
- **Ne pas faire** : introduire un second mécanisme de base de chemin.

### B7 — Tests de build · M
- Ajouter dans le shell des tests `vitest` : (a) snapshot de `TargetConfig` par cible ; (b) HTML généré natif ne contient ni `service-worker`, ni `<script>` inline exécutable, ni URL d'import map externe ; (c) HTML Web inchangé vs baseline.

---

## CHANTIER C — `@egen-civitas/esm-platform` (nouveau package)

**Responsabilité unique** : exposer aux apps une API de capacités **indépendante de l'environnement**, et parler au Host par un protocole versionné. Il ne contient **aucun** code natif.

### C1 — Création du package (gabarit `esm-tenant`) · M
- **Créer** `packages/framework/esm-platform/` avec : `package.json`, `tsconfig.build.json`, `vitest.config.ts`, `src/index.ts`, `CHANGELOG.md` (laissé vide, géré par changesets), `README.md`.
- **`package.json`** : recopier celui d'`esm-tenant` (champs `main/module/types/exports`, scripts `build/typescript/test/lint`, devDependencies identiques, `repository.directory` adapté). Version initiale `1.0.0`. `peerDependencies` : `rxjs 7.x` uniquement si des Observables sont exposés ; sinon aucune.
- **Câblage (4 endroits, tous obligatoires)** :
  1. `esm-framework/package.json` → dépendance `@egen-civitas/esm-platform`.
  2. `esm-framework/src/index.ts` **et** `src/internal.ts` → `export * from '@egen-civitas/esm-platform';`.
  3. `esm-framework/mock.tsx` (+ `mock-jest.tsx` si les mocks y sont dupliqués) → mock du package (cf. C9).
  4. `shell/esm-app-shell/dependencies.json` → ajouter `"@egen-civitas/esm-platform"` (liste des dépendances **partagées MF**, singleton) et `package.json` du shell → dépendance.
- ✅ **Vérifié** : `packages/framework/tsconfig.json` ne liste aucun package ; `esm-framework/tsconfig.typedoc.json` les liste explicitement (`esm-tenant` n'y figure pas, oubli préexistant non corrigé : N7) ⇒ `esm-platform` y est ajouté. `typedoc.json` n'en référence aucun.
- **Ne pas faire** : exposer `esm-platform` autrement que via `esm-framework` aux apps ; oublier `dependencies.json` (sans cela, chaque app embarquerait **sa propre copie** ⇒ états divergents).
- **Validé quand** : `yarn build` et `yarn verify` passent ; `import { getPlatform } from '@egen-civitas/esm-framework'` compile dans une app.

### C2 — Types et contrats · M
**Fichier** : `src/types.ts`. Contrats publics (illustration de la forme finale ; les signatures exactes sont en Annexe 2).
- `PlatformEnvironment = 'web' | 'android' | 'ios'`.
- `CapabilityName` : union fermée, étendue **par registre** (C6).
- `PlatformError` (classe) : `code: 'UNAVAILABLE' | 'DENIED' | 'CANCELLED' | 'INVALID_ARGS' | 'TIMEOUT' | 'INCOMPATIBLE' | 'HOST_ERROR'`, `message`, `retryable: boolean`, `capability`, `method`.
- `Platform` : `{ environment; has(cap): boolean; capabilities: {...}; ready: Promise<void> }`.
- **Règle** : un appel de capacité retourne toujours une `Promise` et **rejette** avec `PlatformError` ; jamais de `null` ambigu.
- **Ne pas faire** : un type « fourre-tout » `any` ; une capacité sans `has()` correspondant.

### C3 — Détection de plateforme · S
**Fichier** : `src/detect.ts`.
- Lire **uniquement** `window.egenTarget` (posé au build, B3). Absent ⇒ `'web'`.
- Vérification de cohérence : en natif, si `window.egenHostBridge` (C5) est absent après `ready` ⇒ `PlatformError('INCOMPATIBLE')` et état « Host manquant ».
- **Ne pas faire** : UA sniffing (N4), `window.Capacitor`, `navigator.platform`.

### C4 — Adaptateur Web · L
**Dossier** : `src/adapters/web/`. Principe : **ne jamais simuler de la sécurité**.
| Capacité | Comportement Web |
|---|---|
| `session` | fournisseur d'autorisation **vide** (le cookie reste le mécanisme, D1) |
| `secureStorage` | `has() === false` ; appels ⇒ `UNAVAILABLE` (pas de faux coffre dans `localStorage`) |
| `openExternal` | `window.open(url, '_blank', 'noopener,noreferrer')` après validation d'URL (`https:`/`mailto:`/`tel:`) |
| `lifecycle` | `visibilitychange` → `resume`/`pause` |
| `files.select` | `<input type="file">` éphémère |
| `camera.capture` | `<input accept="image/*" capture>` ou `getUserMedia` (choisir un seul, documenter) |
| `permissions` | API Permissions du navigateur si dispo, sinon `UNAVAILABLE` |
| `push`, `biometric` | `UNAVAILABLE` en v1 |
- **Tests** : un test par ligne ci-dessus (happy-dom).
- ✅ **Réalisé** (`esm-platform/src/adapters/web/`, une capacité par fichier, 56 tests dont des cas négatifs) et **choix consignés** :
  - `session` : `has()` vrai ; `getAuthorization` → `null`, `refresh` → `false`, `clear` → no-op, `setTokens` → `UNAVAILABLE` (aucun jeton stocké dans le navigateur) ; aucun `setAuthorizationProvider` en Web (D1 : `fetch` reste synchrone).
  - `files` : `select` seul (`<input type="file">` éphémère, `accept` validé, `FileHandle` sans binaire, `File` gardé dans un registre interne `getWebFile`/`releaseWebFile` jusqu'à C7) ; `download` **non fourni** en Web (l'attribut `download` est ignoré hors même origine) ⇒ `UNAVAILABLE`.
  - `camera` : `<input accept="image/*" capture>` (pas `getUserMedia`) ; sur ordinateur `capture` est ignoré et l'utilisateur obtient un sélecteur d'images.
  - `permissions` : fournie seulement si `navigator.permissions.query` existe ; `check` via l'API (`files` et noms inconnus du navigateur ⇒ `UNAVAILABLE`) ; `request` : `notifications` seulement (`default` ⇒ `denied`), `camera`/`microphone` ⇒ `UNAVAILABLE` (le navigateur demande à l'usage).
  - `openExternal` : schémas `https:` / `mailto:` / `tel:` uniquement ; le message d'erreur ne reprend jamais l'URL.
  - Limite connue : un navigateur qui n'émet pas l'événement `cancel` laisse la promesse de `files.select` en attente (pas d'heuristique sur le focus).
  - En natif l'adaptateur Web n'est **jamais** utilisé (aucune capacité du navigateur ne fuit vers un Host absent).

### C5 — Client de pont et protocole v1 · L
**Dossier** : `src/bridge/`. Spécification complète en **Annexe 1**.
- **Contrat de Host (côté web)** : le Host injecte **avant tout script de la page** l'objet `window.egenHostBridge = { send(json: string): void, subscribe(cb: (json: string) => void): void }`. Le framework ne connaît rien d'autre du natif (R2/N2).
- **À implémenter** : sérialisation JSON stricte, génération d'`id` unique, table des requêtes en vol, expiration (défaut **30 s**, configurable par appel), handshake `hello` (négociation de version + liste des capacités), routage des événements Host→web, rejet de toute enveloppe invalide ou de version non supportée.
- **Sécurité côté web** : aucune évaluation dynamique (`eval`, `new Function`) ; seuls les champs attendus sont lus ; toute réponse sans `id` connu est ignorée et journalisée (sans données utiles).
- **Ne pas faire** : exposer le pont brut aux apps ; accepter des messages non JSON ; faire transiter des binaires volumineux (limite proposée ⚠️ **256 Ko** par message ; au-delà ⇒ référence/handle de fichier fournie par le Host).
- **Tests** : handshake OK/KO, incompatibilité de version, timeout, réponses hors ordre, 64 appels concurrents, message malformé, réponse orpheline.

### C6 — Registre de capacités et procédure d'ajout · M
**Fichier** : `src/registry.ts`.
- Un registre `capabilities` associe `nom → { version, méthodes, adaptateurWeb, adaptateurNatif }`.
- **Procédure « ajouter une capacité »** (à copier dans le README du package) : (1) interface TS dans `types/<cap>.ts` ; (2) entrée dans le registre ; (3) adaptateur Web (même `UNAVAILABLE`) ; (4) adaptateur natif = simple appelant du pont ; (5) mock dans `testing/` ; (6) tests ; (7) changeset *minor* ; (8) ligne ajoutée au tableau des capacités du README. **Aucun autre fichier du framework ne doit être modifié.**
- **Critère de réussite du design** : ajouter une capacité fictive dans un test ne modifie que ces fichiers.
- ✅ **Réalisé** (`src/registry.ts`, `src/registry.test.ts`) : le registre est la **seule** liste de capacités ; gabarit « indisponible », adaptateurs Web et natif, handshake (capacités connues) et disponibilité en sont **dérivés** (il y avait 7 listes dupliquées).
- ✅ **Écart avec la doc, justifié** : « `CapabilityName` union fermée étendue par le registre » ne peut pas dériver d'un registre d'exécution (types et exécution sont séparés, et `esm-globals` ne peut pas dépendre d'`esm-platform`). Choix : les 9 noms v1 restent une union fermée dans `esm-globals` ; toute nouvelle capacité s'y ajoute par **fusion de déclaration** (`EgenCapabilityExtensions`), sans modifier `esm-globals`. Même principe pour la forme : `CapabilityInterfaces` (extensible) remplace les 9 membres en dur de l'interface `Platform`. La fusion à travers le fichier d'entrée `export *` a été vérifiée par `tsc` (un nom inconnu reste refusé).
- ✅ **Comportement ajouté** (la doc cite la `version` du registre sans préciser son usage) : une capacité n'est disponible que si le Host l'annonce dans une version **≥** celle du registre. Les 201 tests précédents de C1 à C5 passent inchangés.
- ✅ **Critère vérifié** : `registry.test.ts` ajoute `fictional` (types, entrée, adaptateurs Web et natif) **depuis le fichier de test seul** et la retrouve dans le gabarit `UNAVAILABLE`, `getPlatform()` Web et natif (Host simulé), le handshake, la comparaison de versions, `createMockPlatform` et `requiredCapabilities` (F2).
- ⚠️ **Piège** : le script `typescript` du paquet utilise `tsconfig.build.json`, qui **exclut les tests** ; les fusions de déclaration des tests ne sont donc vérifiées que par un `tsc` sur `src/**/*` (fait ici, hors CI).

### C7 — Capacités v1 et priorités · XL (à découper en sous-tâches par capacité)
| Prio | Capacité | Méthodes v1 | Remarque |
|---|---|---|---|
| **P0** | `session` | `getAuthorization()`, `setTokens()`, `clear()`, `refresh()` | **chemin critique** (chantier D) |
| **P0** | `secureStorage` | `get`, `set`, `remove` (valeurs `string`) | sert à `session` côté Host ; pas de JSON implicite |
| **P0** | `openExternal` | `open(url)` | allowlist de schémas (G3) |
| **P0** | `lifecycle` | `onResume`, `onPause` (retournent une fonction de désabonnement) | corrige l'ébauche initiale (pas de fuite de callbacks) |
| P1 | `permissions` | `check(name)`, `request(name)` | noms normalisés (`camera`, `microphone`, `notifications`, `files`) |
| P1 | `files` | `select(opts)`, `download(url, name)` | retour = *handle*, pas de binaire inline |
| P1 | `camera` | `capture(opts)` | retour = *handle* de fichier |
| P2 | `push` | `register()`, `onMessage()` | jeton de push envoyé au backend par l'app |
| P2 | `biometric` | `isAvailable()`, `authenticate(reason)` | déverrouillage local, **pas** une authentification serveur |
- **Règle** : une capacité P1/P2 n'est implémentée côté framework que lorsqu'**une app l'utilise** (N9).

### C8 — Erreurs, indisponibilité, repli · M
- `has(cap)` doit être **fiable** : issu du handshake en natif, statique en Web.
- Fournir un utilitaire `withFallback(cap, nativeFn, webFn)` **uniquement si** ≥ 2 usages réels existent (R8).
- Message utilisateur : les apps affichent un texte i18n ; `PlatformError` ne porte **pas** de texte localisé.

### C9 — Mocks et utilitaires de test · M
- `esm-platform/src/testing/` : `createMockHost()` (simule `window.egenHostBridge`, programmable : latence, erreurs, versions) et `createMockPlatform(overrides)`.
- Mettre à jour `esm-framework/mock.tsx` pour que les apps testent sans Host.
- **Ne pas faire** : mock qui diffère du contrat (le mock est testé contre les mêmes tests de contrat que l'implémentation).

### C10 — Documentation du package · S
- `README.md` : contrat, tableau des capacités, procédure d'ajout, table des codes d'erreur, schéma du pont. Intégrer à TypeDoc (`typedoc.json`, `typedoc-plugin-file-categories`).

---

## CHANTIER D — Authentification et accès API

**Problème ✅** : aujourd'hui la session repose sur le **cookie** : `egenFetch` ne pose aucune option `credentials` (défaut navigateur), le login passe par `refetchCurrentUser(username, password)` avec en-tête `Basic` (`esm-api/src/current-user.ts`). En natif, l'API est **cross-origin** : le cookie n'est ni fiable ni souhaitable. Les jetons doivent vivre dans le Host.

> **Dépendance externe X-1 (backend, hors dépôt)** : le backend doit (a) accepter `Authorization: Bearer`, (b) émettre/rafraîchir des jetons, (c) autoriser l'origine locale en CORS (en-têtes `Authorization`, `X-Tenant-ID`, `Accept`, `Disable-WWW-Authenticate`). Le framework est écrit **contre une interface** ; le contrat précis de l'endpoint de jetons est à définir avec le backend (egen-kernel) — il n'est **pas** inventé ici.

### D1 — Fournisseur d'autorisation dans `esm-api` · M
> **Réalisé** (voir § 6) : l'API est un objet `AuthorizationProvider { getAuthorization, refresh?, credentials? }` posé par `setAuthorizationProvider(provider | null)` — et non une simple fonction — pour regrouper D1, D2 et D3 en un seul enregistrement.

- **Fichiers** : `esm-api/src/egen-fetch.ts`, nouveau `esm-api/src/authorization.ts`, `index.ts`/`public.ts` (exports).
- **Faire** : `setAuthorizationProvider(fn: () => Promise<string | null>)` ; dans `egenFetch`, **avant** `window.fetch`, si un fournisseur est posé et qu'aucun en-tête `Authorization` n'est fourni par l'appelant ⇒ l'ajouter. Zone : après l'assemblage des en-têtes (`Accept`, `Disable-WWW-Authenticate`, `X-Tenant-ID`).
- **Branchement** : `esm-platform` (cible native) appelle `setAuthorizationProvider(() => platform.session.getAuthorization())` au démarrage ; en Web **rien n'est posé** (R2).
- **Ne pas faire** : stocker un jeton dans `esm-api` ; logguer l'en-tête ; modifier le comportement quand aucun fournisseur n'est posé.
- **Tests** (`egen-fetch.test.ts`) : sans fournisseur = identique ; avec fournisseur = en-tête présent ; en-tête appelant prioritaire ; fournisseur qui rejette ⇒ la requête échoue avec `PlatformError` propagée.

### D2 — Politique `credentials` · S
> **Réalisé autrement** : la politique est portée par `AuthorizationProvider.credentials` (natif : `'omit'`) et non par une option de config `esm-api`, car `getConfig` est asynchrone et rendrait l'appel à `fetch` asynchrone pour tout le monde, Web compris (violation de R2).

- **Faire** : option de config `@egen-civitas/esm-api` → `credentials: 'same-origin' | 'include' | 'omit'` (fichier `config-schema.ts`). Défaut = **inchangé** (aucune valeur posée ⇒ défaut navigateur). `targets`/natif fixe `'omit'` via la configuration fournie au démarrage.
- **Ne pas faire** : forcer `include` globalement (risque CORS/CSRF).

### D3 — 401 : rafraîchissement unique puis repli · M
- **Fichier** : `egen-fetch.ts`, branche « réponse non-ok » (là où `redirectAuthFailure` est évalué).
- **Faire** : si fournisseur posé **et** statut 401 : appeler `platform.session.refresh()` **une seule fois** (verrou *single-flight* : N requêtes simultanées partagent le même rafraîchissement), rejouer la requête **une fois**, sinon appliquer le comportement existant (`redirectAuthFailure`/login).
- **Ne pas faire** : boucle de relance ; rafraîchir sur 403 ; rejouer des requêtes non idempotentes sans garde (documenter : seules `GET/HEAD` sont rejouées par défaut ; `POST/PUT/DELETE` ⇒ opt-in explicite).
- **Tests** : 5 requêtes concurrentes 401 ⇒ 1 seul `refresh` ; refresh KO ⇒ redirection login ; pas de double rejeu.

### D4 — Session et login (côté framework) · M
- **Fichier** : `current-user.ts`.
- **Faire** : garder `refetchCurrentUser(username?, password?)` tel quel pour le Web. Ajouter un chemin natif : si un fournisseur d'autorisation est posé, `refetchCurrentUser()` interroge `sessionEndpoint` avec Bearer. Le **flux de login natif** (obtention des jetons) est orchestré par l'app de login du **core** (hors dépôt, dépendance X-2) via `platform.session.setTokens(...)`.
- ⚠️ Confirmer, avec le backend, si `sessionEndpoint` accepte Bearer ; sinon définir l'endpoint équivalent (X-1).
- **Ne pas faire** : passer le mot de passe au Host ; garder le `Basic` en natif si un flux de jetons existe.

### D5 — URL d'API absolue · S
- ✅ `makeUrl` supporte déjà `http…` ; `egenBase` accepte une base absolue ; couvrir par tests (`egen-fetch.test.ts`, test `index`). Vérifier tous les `new URL(..., window.location.origin)` du dépôt : `grep -rn "location.origin" packages/` ; chacun doit supporter une base absolue.

### D6 — Tenant et en-têtes · S
- `X-Tenant-ID` reste injecté par `egenFetch` ✅ (inchangé). Vérifier que la liste d'en-têtes envoyés est **exactement** celle autorisée en CORS (document de contrat X-1).

---

## CHANTIER E — Hors ligne, cache, stockage

### E1 — Séparer « service worker » et « données hors ligne » · M
- ✅ Aujourd'hui `offline` (`SpaConfig.offline` → `window.offlineEnabled`) gouverne à la fois le SW et l'activation des fonctions hors ligne.
- **Faire** : (1) `grep -rn "offlineEnabled" packages/` — recenser **tous** les usages (⚠️ liste non établie) ; (2) ajouter `SpaConfig.serviceWorker?: boolean` (défaut = valeur d'`offline` ⇒ rétro-compatible) et `window.serviceWorkerEnabled` ; (3) dans `run.ts`, `setupOffline()` n'enregistre le SW que si `serviceWorkerEnabled`, mais active toujours la couche données si `offlineEnabled` ; (4) `index.ejs` : `initializeSpa({…, serviceWorker: <targets.serviceWorker>})`.
- **Ne pas faire** : désactiver `offlineEnabled` en natif (cela couperait la sync de données).
- **Tests** : Web (offline on) inchangé ; natif (offline on, SW off) : pas de `navigator.serviceWorker.register`, `esm-offline-db` actif.

### E2 — Messages SW sans SW · S
- `run.ts` : `precacheGlobalStaticDependencies`, `precacheImportMap`, `messageEgenServiceWorker` ne doivent faire **aucune** tentative si SW désactivé (no-op silencieux testé). Fichiers : `run.ts`, `esm-offline/src/service-worker-messaging.ts`.

### E3 — Politique de stockage · M
- ✅ Usages navigateur recensés : `localStorage` (thème, config, tenant, état, feature flags, historique), IndexedDB/Dexie (`esm-offline`).
- **Faire** : rédiger `docs/stockage.md` : tableau *donnée → mécanisme → sensibilité → comportement en natif*. Règle : **aucune donnée sensible** hors Host. Les clés `egen:*` sont listées.
- ⚠️ À valider sur appareils : persistance, quotas et purge d'IndexedDB/`localStorage` selon l'origine locale Android/iOS ; comportement après mise à jour de l'app.
- **Ne pas faire** : migrer le stockage « par principe » avant d'avoir un constat sur appareil.

### E4 — Connectivité · S
- `navigator.onLine` est peu fiable dans un WebView. **Ne rien changer en P0-P1** : `subscribeConnectivity` reste. Si les tests appareils montrent des écarts, ajouter une capacité `network` (P2) alimentée par le Host.

---

## CHANTIER F — Composition et contrats entre briques

### F1 — Lockdown natif (aucun code non prévu) · M
- **Source unique** : ajouter dans `esm-globals` un helper `getEgenTarget(): 'web'|'android'|'ios'` (lit `window.egenTarget`, défaut `web`) et `isNativeTarget()`. `esm-platform/detect.ts` (C3) **réutilise** ce helper (pas de double lecture).
- **Fichiers** : `esm-dynamic-loading/src/import-maps.ts` (lecture `import-map-override:*` et `DISABLED_KEY` dans `localStorage` ✅), `esm-dynamic-loading/src/route-maps.ts` (overrides, déjà limités à `devMode` ✅), `shell/src/run.ts` (`setupImportMapOverrides()` appelé au tout début de `run`, + bloc devtools lisant `egen:devtools`).
- **Faire** : si `isNativeTarget()` ⇒ les fonctions de lecture/écriture d'overrides deviennent **no-op** (retournent vide) et journalisent un avertissement unique ; `setupImportMapOverrides()` ne fait rien.
- **Ne pas faire** : supprimer ces fonctions du Web (R2) ; compter sur le seul « masquage » de l'UI devtools.
- **Tests** : natif + clé `import-map-override:x` posée dans `localStorage` ⇒ ignorée ; Web ⇒ inchangé.

### F2 — Contrat d'app : `platforms` et `requiredCapabilities` · L
- ✅ Type : `EgenAppRoutes` dans `esm-globals/src/types.ts` (~l.443). Enregistrement : `registerApp(appName, routes)` dans `esm-routes/src/loaders/pages.ts` (~l.99), appelé par `setupApps()` de `run.ts` pour chaque entrée du registre de routes.
- **Faire** :
  1. Ajouter à `EgenAppRoutes` : `platforms?: Array<'web'|'android'|'ios'>` et `requiredCapabilities?: Array<CapabilityName>` (types importés **sans** créer de cycle : `CapabilityName` défini dans `esm-globals`, ré-exporté par `esm-platform`).
  2. Dans `registerApp` (point d'entrée unique) : si `platforms` présent et ne contient pas la cible courante ⇒ **ne rien enregistrer** (ni pages, ni extensions, ni modals, ni workspaces) + `console.warn` structuré `{app, reason:'platform'}`.
  3. Si une `requiredCapabilities` n'est pas disponible (`has()` faux) ⇒ même traitement, `reason:'capability'`. ⚠️ Ordre de démarrage : `esm-platform.ready` (handshake) doit être résolu **avant** `setupApps()` ; à ajouter dans la chaîne de `run()` (juste avant `.then(setupApps)`).
  4. Champs absents ⇒ comportement **identique à aujourd'hui** (toutes plateformes, aucune capacité requise).
- **Ne pas faire** : filtrer ailleurs (extensions, `components.ts`…) — un seul point de filtrage ; casser l'ordre d'enregistrement existant ; faire échouer tout le démarrage pour une app écartée (elle est écartée, pas fatale).
- **Tests** : app sans champs ⇒ enregistrée ; `platforms:['ios']` en Web ⇒ écartée ; capacité manquante ⇒ écartée ; toutes ses extensions absentes des slots.

### F3 — Schéma JSON de `routes.json` · S
- ✅ Les `routes.json` pointent vers `https://egen.alpha.vercel.com/routes.schema.json` ; **aucun schéma n'est présent dans le dépôt** (recherche vide).
- **Faire** : ajouter `packages/framework/esm-routes/schema/routes.schema.json` (source de vérité) couvrant les champs existants + `platforms` + `requiredCapabilities` + `frameworkRange` (F4) ; test de validation sur 2-3 `routes.json` réels du core ; publier avec le package (`files`).
- **Ne pas faire** : introduire des champs non décrits dans le schéma.

### F4 — Compatibilité vérifiable (fin du « mou ») · L
- ✅ Constat : MF est configuré avec `strictVersion: false` et les apps déclarent des `peerDependencies` en `>=` ; une app incompatible **s'exécute quand même**.
- **Faire (estampillage)** : `tooling/rspack-config/src/index.ts`, bloc `CopyRspackPlugin` du `routes.json` (transformer qui ajoute déjà `version`) : ajouter `frameworkRange` = `peerDependencies['@egen-civitas/esm-framework']` (si défini) et `platformProtocol` = plage supportée (constante exportée par `esm-platform`, ⚠️ à créer en C5).
- **Faire (vérification au démarrage)** : dans `registerApp`, avant l'enregistrement, comparer `frameworkRange` à `process.env.FRAMEWORK_VERSION` (déjà défini ✅ par `DefinePlugin` du shell) avec `semver` (déjà dépendance du shell ✅). Non satisfait ⇒ app écartée (`reason:'framework'`), erreur **visible** dans `devtools`/logs.
- **`build-manifest.json`** (produit par `egen-distributions`, hors dépôt) : le framework fournit **le type** `BuildManifest` (dans `esm-globals`) et une fonction `validateBuildManifest()` utilisée par le Host/shell au démarrage : `{ shellVersion, frameworkVersion, protocolVersion, apps:[{name, version, integrity}] }`.
- **Ne pas faire** : passer `strictVersion: true` sur MF (casse l'écosystème existant) ; bloquer les apps sans `frameworkRange` (ancien format ⇒ toléré, avertissement).
- **Tests** : plage satisfaite / non satisfaite / absente.

---

## CHANTIER G — Sécurité

### G1 — Garde-fou des ponts `EGEN_*` → `window.*` · S
- ✅ Listes blanches : `EGEN_AI_ENV_KEYS` et `EGEN_TENANT_ENV_TO_WINDOW_KEY` dans `rspack.config.js` ; test `env-bridge.test.ts`.
- **Faire** : ajouter un test qui **échoue** si une clé ajoutée aux ponts contient (insensible à la casse) `SECRET`, `PRIVATE`, `PASSWORD`, `TOKEN`, `API_KEY` — sauf allowlist explicite commentée (ex. `JWKS` = clés **publiques**). Appliquer à `egenTarget`.
- ⚠️ Revue manuelle demandée du `dist/index.html` réellement déployé : aucune valeur sensible ne doit y figurer. Les valeurs viennent des `.env` : la liste blanche protège les **noms**, pas les **valeurs**.

### G2 — Bypass d'authentification inerte en natif · S
- **Fichiers** : `esm-api/src/dev-auth-bypass.ts` (`isDevAuthBypassEnabled`, `initDevAuthBypass`), `shell/src/run.ts` (`applyDevNoAuthBypass`).
- **Faire** : `isDevAuthBypassEnabled()` retourne **toujours `false`** si `isNativeTarget()` (même si `window.egenDevNoAuth === true` ou `process.env.EGEN_DEV_NO_AUTH === 'true'`). Le build échoue déjà côté `targets.js` (B1) ; ceci est la **seconde ceinture** runtime.
- **Tests** : natif + `window.egenDevNoAuth=true` ⇒ bypass inactif.

### G3 — Liens externes et navigation · S
- **Faire** : (1) `openExternal` n'accepte que `https:`, `mailto:`, `tel:` (liste en constante) ; (2) audit : `grep -rn "window.open\|location.href\s*=" packages/` ; chaque occurrence qui sort de l'origine passe par `platform.openExternal` en natif ; (3) `navigate()` (esm-navigation) vers une URL externe : décision documentée (⚠️ comportement actuel non audité).
- **Ne pas faire** : autoriser `javascript:` / `data:` / `file:`.

### G4 — Journalisation sûre · S
- Aucun jeton, en-tête `Authorization`, ni corps de requête dans les logs ni dans `EgenFetchError`. Test : provoquer une erreur avec fournisseur d'autorisation et vérifier l'absence du jeton dans `error.message`/`stack`/`responseBody`.

---

## CHANTIER H — Qualité, outillage, release

### H1 — Conventions de test · S
- `vitest` (déjà) ; un test par règle de validation et par chemin d'erreur ; couverture : chaque tâche ci-dessus liste ses cas. Les non-régressions Web sont des tests **explicites**, pas implicites.

### H2 — E2E sur SPA statique (natif simulé) · L
- **Fichier** : `e2e/` (racine, Playwright déjà installé). Servir un artefact assemblé minimal sous `/app` (origine ≠ API), avec un faux Host (`createMockHost`) injectant `window.egenHostBridge`.
- **Scénarios** : (1) démarrage sans 404 ni requête hors origine hors API ; (2) CSP sans violation ; (3) handshake OK ⇒ apps filtrées par `platforms` ; (4) handshake KO ⇒ écran d'incompatibilité ; (5) 401 ⇒ 1 refresh ⇒ rejeu ; (6) overrides d'import map ignorés ; (7) Web sans Host : parcours existant inchangé.
- **Limite assumée** : ne remplace pas les tests sur appareils (E3/phases prototypes).

### H3 — Vérifications de publication · S
- Étendre aux nouveaux paquets les scripts existants `verify:publint`, `verify:attw`, `verify:pack` (`scripts/verify-*.mjs`). `esm-platform` doit passer les trois.

### H4 — Versions et changesets · S
| Paquet | Bump | Raison |
|---|---|---|
| `esm-platform` | `1.0.0` initial (posé à la main), puis changesets | nouveau |
| `esm-globals` | minor | `egenTarget`, `getEgenTarget`, champs `EgenAppRoutes`, `BuildManifest` |
| `esm-api` | minor | `setAuthorizationProvider`, option `credentials`, 401→refresh |
| `esm-routes` | minor | filtrage plateforme/capacité/framework |
| `esm-dynamic-loading` | minor | lockdown |
| `esm-offline` | minor | séparation SW/données (si modifié) |
| `esm-app-shell` | minor | `targets.js`, CSP, `serviceWorker` |
| `rspack-config` | minor | estampillage `frameworkRange` |
| `egen` (CLI) | minor | `--platform` |
| `esm-framework` | minor | ré-export `esm-platform` |
- **Rappel ✅** : la publication passe par `changeset` ; `yarn release` exécute d'abord `scripts/ensure-shell-rebuild.mjs`. ⚠️ Lire ce script et confirmer qu'il rebuild le shell lorsque `esm-platform` change.

### H5 — Documentation à tenir à jour · S
- `README` de chaque paquet touché ; `docs/stockage.md` (E3) ; `docs/cibles-de-build.md` (tableau `TargetConfig`) ; `MIGRATION.md` : section « Cibles et plateformes » (comment une app déclare `platforms`/`requiredCapabilities`).

### H6 — CI · M
- Jobs : `verify` (lint/test/typescript) ; `build` des 3 cibles du shell (`EGEN_TARGET` web/android/ios) avec contrôle des règles de validation B1 ; `e2e` (H2) ; `verify:pack/publint/attw`. Un échec d'un job bloque la fusion.

---

## 4. Définition de « terminé » (toute tâche)

- [ ] Code + tests unitaires verts ; **test de non-régression Web** présent si le comportement Web est effleuré.
- [ ] `yarn verify` vert (lint, test, typescript) ; build des paquets touchés vert.
- [ ] Changeset ajouté avec le bon type de bump.
- [ ] README/docs mis à jour.
- [ ] Aucun point **N1–N9** violé (cocher explicitement).
- [ ] Les hypothèses ⚠️ levées sont **réécrites en ✅** dans ce document, avec la preuve (commande, sortie, date).

### Modèle de description de PR
```
Tâche : <ID, ex. B2>
Fichiers touchés : …
Comportement Web : inchangé (preuve : test <nom>) / modifié (justification)
Règles N1–N9 : respectées (cocher)
Tests ajoutés : …
Hypothèses ⚠️ levées : …
```

---

## 5. Dépendances externes (hors de ce dépôt)

| ID | Brique | Besoin | Bloque |
|---|---|---|---|
| **X-1** | Backend (egen-kernel) | Bearer, émission/refresh de jetons, CORS pour l'origine locale, endpoint de session compatible | D3, D4, tests appareils |
| **X-2** | `egen-core` | Champs `platforms`/`requiredCapabilities` dans les `routes.json` ; versions des apps harmonisées (aujourd'hui `1.0.0` et `9.0.2`, scopes `@egen/` vs `@egen-civitas/`) ; app de login adaptée au flux de jetons | F2, D4 |
| **X-3** | `egen-distributions` | Manifestes par cible ; génération du `build-manifest.json` ; étape `build:spa` (équivalent disque de `serve-prod.mjs`) | F4, H2 |
| **X-4** | `egen-mobile` | Host Capacitor qui injecte `window.egenHostBridge`, implémente le protocole v1 et le handshake | C5, H2 (réel) |

---

## ANNEXE 1 — Protocole Host ↔ Shell, version 1

**Transport** : chaînes JSON UTF-8 via `window.egenHostBridge.send(json)` (web→host) et `subscribe(cb)` (host→web).

**Requête (web→host)**
```json
{ "p": "egen-host", "v": 1, "id": "b1f6…", "ns": "secureStorage", "m": "get", "a": { "key": "refresh" } }
```
**Réponse (host→web)**
```json
{ "p": "egen-host", "v": 1, "id": "b1f6…", "ok": true,  "r": "valeur" }
{ "p": "egen-host", "v": 1, "id": "b1f6…", "ok": false, "e": { "code": "DENIED", "message": "…", "retryable": false } }
```
**Événement (host→web)**
```json
{ "p": "egen-host", "v": 1, "ev": "lifecycle.resume", "d": {} }
```
**Handshake** (premier message obligatoire)
```json
→ { "p":"egen-host","v":1,"id":"…","ns":"host","m":"hello","a":{"protocol":{"min":1,"max":1},"shell":"2.9.0","framework":"3.2.0"} }
← { …,"ok":true,"r":{"protocol":1,"host":"1.0.0","platform":"android",
      "capabilities":{"session":{"v":1},"secureStorage":{"v":1},"openExternal":{"v":1},"lifecycle":{"v":1}}} }
```
**Règles**
1. Aucun appel de capacité avant un `hello` réussi.
2. Plages de protocole sans recouvrement ⇒ `INCOMPATIBLE` : le Shell affiche un écran « mise à jour de l'application requise » (aucun démarrage partiel).
3. Un message sans `p:"egen-host"`, avec `v` non supporté, non JSON, ou dont l'`id` est inconnu ⇒ ignoré et compté (métrique de debug), jamais exécuté.
4. Le **Host** valide `ns`, `m` et `a` contre une liste blanche (par capacité et par version) et **vérifie l'origine** de la page émettrice ; le Shell ne fait pas confiance au Host pour la structure (validation symétrique).
5. Codes d'erreur : `UNAVAILABLE`, `DENIED`, `CANCELLED`, `INVALID_ARGS`, `TIMEOUT`, `INCOMPATIBLE`, `HOST_ERROR`.
6. Évolution : ajouter un champ optionnel = même version ; changer le sens d'un champ ou en supprimer = **nouvelle version majeure** du protocole ; le Host peut supporter plusieurs versions.

## ANNEXE 2 — Signatures TypeScript (v1, contractuelles)

```ts
export type PlatformEnvironment = 'web' | 'android' | 'ios';
export type PlatformErrorCode =
  'UNAVAILABLE'|'DENIED'|'CANCELLED'|'INVALID_ARGS'|'TIMEOUT'|'INCOMPATIBLE'|'HOST_ERROR';

export class PlatformError extends Error {
  constructor(readonly code: PlatformErrorCode, message: string,
              readonly opts?: { retryable?: boolean; capability?: string; method?: string }) { super(message); }
}

export type Unsubscribe = () => void;

export interface SessionCapability {
  getAuthorization(): Promise<string | null>;         // ex. "Bearer …" ; null = pas de session
  setTokens(t: { access: string; refresh?: string; expiresAt?: number }): Promise<void>;
  refresh(): Promise<boolean>;                         // true si nouveau jeton obtenu
  clear(): Promise<void>;
}
export interface SecureStorageCapability {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}
export interface OpenExternalCapability { open(url: string): Promise<void>; }
export interface LifecycleCapability {
  onResume(cb: () => void): Unsubscribe;
  onPause(cb: () => void): Unsubscribe;
}
export interface PermissionsCapability {
  check(name: PermissionName): Promise<'granted'|'denied'|'prompt'>;
  request(name: PermissionName): Promise<'granted'|'denied'>;
}
export type PermissionName = 'camera'|'microphone'|'notifications'|'files';
export interface FileHandle { id: string; name: string; size: number; mime: string; }
export interface FilesCapability {
  select(o?: { multiple?: boolean; accept?: string[] }): Promise<FileHandle[]>;
  download(url: string, filename: string): Promise<void>;
}
export interface CameraCapability { capture(o?: { facing?: 'front'|'back' }): Promise<FileHandle>; }
export interface PushCapability {
  register(): Promise<{ token: string }>;
  onMessage(cb: (m: unknown) => void): Unsubscribe;
}
export interface BiometricCapability {
  isAvailable(): Promise<boolean>;
  authenticate(reason: string): Promise<boolean>;
}

export interface Platform {
  readonly environment: PlatformEnvironment;
  readonly ready: Promise<void>;                       // handshake terminé (immédiat en Web)
  has(cap: CapabilityName): boolean;
  readonly session: SessionCapability;
  readonly secureStorage: SecureStorageCapability;
  readonly openExternal: OpenExternalCapability;
  readonly lifecycle: LifecycleCapability;
  readonly permissions: PermissionsCapability;
  readonly files: FilesCapability;
  readonly camera: CameraCapability;
  readonly push: PushCapability;
  readonly biometric: BiometricCapability;
}
export declare function getPlatform(): Platform;
```
*Une capacité absente (`has()` faux) existe toujours comme objet ; ses méthodes rejettent `UNAVAILABLE`.*

## ANNEXE 3 — Index « où toucher » (fichier → tâches)

| Fichier | Tâches |
|---|---|
| `shell/esm-app-shell/rspack.config.js` | B2, B3, B5, G1 |
| `shell/esm-app-shell/tools/targets.js` (+test) | B1 |
| `shell/esm-app-shell/src/index.ejs` | B3, B5, E1 |
| `shell/esm-app-shell/src/index.ts` | B6, E1 |
| `shell/esm-app-shell/src/run.ts` | E1, E2, F1, F2, G2 |
| `shell/esm-app-shell/{package.json, dependencies.json}` | A3, C1 |
| `tooling/egen/src/{cli.ts, commands/build.ts, utils/config.ts}` | B4 |
| `tooling/rspack-config/src/index.ts` | F4 |
| `framework/esm-globals/src/types.ts` | B3, E1, F1, F2, F4 |
| `framework/esm-api/src/{egen-fetch.ts, authorization.ts, current-user.ts, config-schema.ts, dev-auth-bypass.ts}` | D1–D5, G2, G4 |
| `framework/esm-routes/src/loaders/pages.ts` | F2, F4 |
| `framework/esm-routes/schema/routes.schema.json` | F3 |
| `framework/esm-dynamic-loading/src/{import-maps.ts, route-maps.ts}` | F1 |
| `framework/esm-offline/src/{service-worker-messaging.ts, mode.ts…}` | E1, E2 |
| `framework/esm-platform/**` | C1–C10 |
| `framework/esm-framework/{package.json, src/index.ts, src/internal.ts, mock.tsx}` | C1, C9 |
| `scripts/`, `e2e/`, `.changeset/`, `turbo.json` | A2, H2–H6 |

## ANNEXE 4 — Questions ouvertes à lever (⚠️) — à fermer avant le lot P1

1. Fichiers réellement chargés hors `dist` (A2) et contenu publié du package Shell (A3).
2. Production effective de `service-worker.js` (A4).
3. Liste complète des usages de `offlineEnabled` (E1).
4. Endpoint de session et jetons côté backend (X-1).
5. CSP : styles inline requis par Carbon ? (B5).
6. Persistance IndexedDB/`localStorage` en WebView Android et WKWebView (E3).
7. Comportement de `navigate()` vers une URL externe (G3).
8. Cohérence de `scripts/ensure-shell-rebuild.mjs` avec le nouveau package (H4).
9. Règles Apple 2.5.2 / 4.7.x et politique Google Play : relecture des textes **officiels** avant la décision finale de distribution.

---

## 6. Journal d'avancement

Branche de référence : **`main`** · mise à jour : 2026-11-07.

> **Coordination (plusieurs sessions travaillent sur cette réforme).** Avant de commencer une tâche : (1) lire ce journal **sur `main`** ;
> (2) lister `git branch -r` et les PR ouvertes ; (3) ne jamais réimplémenter une tâche déjà marquée « fait » : l'étendre. Une tâche n'est « fait »
> qu'une fois fusionnée dans `main` avec ses tests et sa CI verte. Les écarts de conception se consignent ici, pas seulement dans la PR.

| Tâche | État | Preuve / remarque |
|---|---|---|
| A1 Baseline | **fait** | `docs/baseline-2026-11.md` (install 2 min 14 s, build 3 min 03 s, tests 8 min 24 s). Défauts préexistants consignés : lint (corrigé #103, 5 paquets gardent d'anciennes erreurs), `build.integration.test.ts` fragile sous charge |
| A2 Inventaire du `dist` | à faire | |
| A3 Contenu publié du shell | **fait** | #104 : shell publié avec ses sources de construction ; `esm-theme` (`src/themes`) et `esm-translations` (`translations/`) complétés ; projet vide + `egen build` OK ; `tools/publish-contract.test.ts` |
| A4 Service worker | **fait** (décision) | non produit par personne (Workbox perdu) ; non supporté en l'état, désactivé en natif ; tâche Web dédiée à ouvrir |
| B1 `targets.js` | **fait** | #105 + intégration : contrat `TargetConfig` de la doc (`importmapMode`, `routesMode`, `csp`), `isMeaningful*` dans `helpers.js` (une seule définition), `EGEN_ENV` **obligatoire** et déjà résolu, URL d'import map/routes interdites en natif ; 74 tests |
| B2 branchement `rspack.config.js` | **fait** | #105 : `dist` Web identique octet pour octet ; en natif `offline` du HTML = `serviceWorker` (faux) : aucune référence à un service worker |
| B3 pont `window.egenTarget` | **fait** | natif uniquement (HTML Web inchangé) ; type `EgenTarget` dans `esm-globals` ; un seul pont dans `index.ejs` |
| B4 option `--platform` du CLI | **fait** | `cli.ts`, `build.ts`, `utils/config.ts` ; `--spa-path` non transmis en natif ; tests unitaires et d'intégration (build android valide / ios invalide) |
| B5 CSP et scripts inline | **fait** (e2e H2 à faire) | scripts et `onclick` natifs en fichiers émis, `<meta>` CSP, Web identique ; bundle mesuré ; `SplineScene` neutralisé en natif ; aucune CSP affaiblie |
| B7 tests de build | **fait** | (a) `TargetConfig` par cible ; (b) rendu réel du gabarit natif (aucun script exécutable ni gestionnaire inline, ni service worker, ni URL externe) et build `egen` android de bout en bout ; (c) rendu Web figé en snapshot + comparé à l'ancien gabarit |
| C1 package `esm-platform` | **fait** | câblage complet : `esm-framework` (`package.json`, `index`, `internal`, `mock`, `mock-jest`), shell (`dependencies.json`, `package.json`), `tsconfig.typedoc.json` ; `import { getPlatform } from '@egen-civitas/esm-framework'` compile (test négatif vérifié) |
| C2 types et erreurs | **fait** | contrats de l'annexe 2 ; `PlatformError` ; `CapabilityName` défini dans `esm-globals` (F2) |
| C3 détection | **fait** | `window.egenTarget` uniquement ; `hasHostBridge()` ; `ready` rejette `INCOMPATIBLE` (« Host manquant ») en natif sans pont conforme ; pas de User-Agent ni de Capacitor |
| C4 adaptateur Web | **fait** | `src/adapters/web/` : session (vide), openExternal, lifecycle, files.select, camera, permissions ; secureStorage / push / biometric jamais simulés ; choix consignés dans la section C4 |
| C5 client de pont | **fait** (fusionné #111, CI verte) | `esm-platform/src/bridge/` : `protocol.ts` (enveloppes v1, `parseHostMessage` qui ne lève jamais et n'évalue rien) et `client.ts` (`createBridgeClient` : `hello` mémorisé, ids uniques, délai par appel, réponses dans le désordre, 64 appels simultanés, messages invalides/orphelins/version inconnue ignorés et comptés, `INCOMPATIBLE` immédiat si le Host répond dans une version inconnue, capacité non annoncée ⇒ `UNAVAILABLE` sans rien envoyer, namespace `host` réservé, limite 256 K caractères). Branchement : `getPlatform()` natif = un client **par pont** (un seul `subscribe` et un seul handshake quel que soit le nombre d'appels), `ready` = handshake, `getHostInfo()`. **Choix de conception** : une capacité est disponible si le Host l'annonce **et** si le framework sait l'appeler — `createNativeCapabilities()` est vide jusqu'à C7, donc `has()` reste faux partout en natif (on ne promet pas ce qu'on ne sait pas appeler). Le numéro de version du framework est inliné dans le `hello` (vérifié dans le `dist` du shell) |
| C6 registre de capacités | **fait** | `registry.ts` = source unique (7 listes dupliquées supprimées) ; extension par fusion de déclaration (`EgenCapabilityExtensions`, `CapabilityInterfaces`) ; version du Host comparée ; procédure en 8 étapes dans le README ; critère prouvé par une capacité fictive |
| C9 mocks | **fait** (avec C5) | `createMockPlatform` + `getPlatform` dans `esm-framework/mock*` ; `createMockHost` (`esm-platform/testing`, ré-exporté par `mock.tsx` et `mock-jest.tsx`) : handshake automatique, handlers programmables, latence, silence, version incompatible, messages bruts arbitraires |
| D1 fournisseur d'autorisation | **fait** | `esm-api/src/authorization.ts` + `egen-fetch.ts` ; sans fournisseur, `fetch` reste appelé de façon synchrone (test dédié) |
| D2 politique `credentials` | **fait** (écart) | via `AuthorizationProvider.credentials` (voir D2) |
| D3 401 → rafraîchissement unique → rejeu | **fait** | single-flight, pas de boucle, GET/HEAD par défaut, `replayOnUnauthorized` |
| C7 capacités natives P0 (`session`, `secureStorage`, `openExternal`, `lifecycle`) | **fait** (fusionné #115, CI verte) | `esm-platform/src/adapters/native/` : simples APPELANTS du client de pont, branchés par `native:` dans le registre (C6). Le Host est une frontière de confiance : ses réponses sont validées (en-tête d'autorisation = ASCII visible, sans CR/LF, ≤ 8 Ko ; types stricts ; réponse invalide ⇒ `HOST_ERROR` sans reprendre la valeur) ; les arguments sont validés **avant** envoi (jeton jamais dans un message d'erreur ; seuls les champs connus de `setTokens` partent ; `openExternal` applique la liste blanche `https:`/`mailto:`/`tel:` côté Shell). 55 tests de bout en bout via `getPlatform()` + `createMockHost`. P1/P2 (`permissions`, `files`, `camera`, `push`, `biometric`) : à la demande d'une app (N9) ; contrat Host en annexe 5 |
| D4 session / login natif (côté framework) | **fait côté Shell** (fusionné #115, CI verte) | `shell/src/native-session.ts` (`bindPlatformSession`) posé **de façon synchrone au tout début de `run()`**. **Constat qui a dicté la conception** : `setupApiModule()` lance `refetchCurrentUser()` immédiatement, donc avant la fin du handshake ; un fournisseur posé dans `setupPlatform` (après) aurait envoyé le premier appel de session **sans jeton**. Le fournisseur attend donc `platform.ready` lui-même ; sans capacité `session` annoncée ⇒ pas d'en-tête (rien n'est simulé) ; handshake en échec ⇒ aucune requête API n'est envoyée ; `credentials: 'omit'`. **Reste (X-1/X-2)** : endpoint de jetons et refresh côté backend, flux de login de l'app du core, test sur appareil |
| E1 service worker séparé des données hors ligne | **fait** (fusionné #117, CI verte) | **Recensement des usages de `window.offlineEnabled`** (6 fichiers, tous côté *données / UI sensible à la connectivité*, aucun ne dépend du service worker) : `esm-globals/events.ts` (événements de connectivité), `esm-routes/loaders/pages.ts` et `esm-extensions/extensions.ts` (filtrage `online`/`offline`), `esm-utils/is-online.ts`, `shell/run.ts` (classes CSS, handlers, `setupOffline`), `shell/index.ts` (définition). **Constat** : avant E1, la cible native émettait `offline: false` ⇒ elle coupait aussi les données hors ligne. Maintenant : `SpaConfig.serviceWorker?` (défaut = `offline`, rétro-compatible), `window.serviceWorkerEnabled`, `targets.offlineData` → `offline` et `targets.serviceWorker` → `serviceWorker` ; natif = `offline:!0,serviceWorker:!1` (vérifié dans le bundle émis). `setupOffline()` délègue à `setupOfflineMode()` (testable) : sans service worker, seule `activateOfflineCapability()` est appelée. **Web : `index.html` identique** (hash des bundles masqués, comparé avant/après). **E2 déjà couvert** : `messageEgenServiceWorker` retourne `{success:false}` sans lever quand aucun service worker n'est enregistré (vérifié dans `esm-offline`) |
| F4 compatibilité vérifiable (`frameworkRange`, `BuildManifest`) | **fait** (fusionné #118, CI verte) | **Estampillage** : `rspack-config/src/routes-stamp.ts` (`stampRoutes`) ajoute `frameworkRange` = `peerDependencies['@egen-civitas/esm-framework']` **seulement si c'est une plage semver valide** (jamais de valeur douteuse). **Vérification au démarrage** : `registerApp` (point unique) écarte l'app, sans rien enregistrer, avec `{reason:'framework', required, current}` ; ordre plateforme → framework → capacités ; la version courante est `process.env.FRAMEWORK_VERSION` inlinée par le shell (vérifié dans le bundle : `4.1.0`) ; **`isVersionSatisfied` d'`esm-utils` réutilisé** (aucune nouvelle dépendance ; préversions acceptées). **Choix** : plage absente (ancien format) = toléré **sans avertissement** (un avertissement par app à chaque démarrage serait du bruit tant que le core n'est pas reconstruit) ; plage illisible = app écartée (échec fermé, visible) ; version du framework indisponible (hors bundle) = non vérifiable donc non bloquant. **Écart de périmètre** : `platformProtocol` non estampillé — le protocole lie le Host au **shell**, pas aux apps. `BuildManifest` + `validateBuildManifest()` dans `esm-globals` (pur, liste toutes les erreurs, ne lève jamais, intégrité SRI, noms uniques, versions exactes) ; son **usage** (lecture par le Host/shell) dépend d'`egen-distributions`. `rspack-config` n'avait aucun test : vitest ajouté (config + script + `yarn.lock`), tests exclus de `dist`. MF reste en `strictVersion: false` (volontaire : casserait l'écosystème) |
| F3 schéma JSON de `routes.json` | **en cours** (session du 2026-11-10, branche `feat/f3-schema-routes`) | ne pas démarrer en parallèle |
| D5 URL d'API absolue | **fait** | audit `location.origin` + 4 tests |
| F1 lockdown natif | **fait** | `getEgenTarget()` / `isNativeTarget()` ; `import-maps.ts` et `route-maps.ts` (seconde ceinture : le build natif impose déjà `production`) |
| F2 contrat d'app `platforms` / `requiredCapabilities` | **fait** (fusionné #109, CI verte) | champs ajoutés à `EgenAppRoutes` ; filtrage **unique** dans `registerApp` (`esm-routes/src/loaders/availability.ts`) : app écartée sans rien enregistrer (ni config, ni extensions), avertissement structuré `{app, reason}` ; champs absents = comportement historique. **Écart de conception** : la disponibilité des capacités passe par un résolveur posé dans la couche la plus basse (`esm-globals` : `setCapabilityResolver` / `hasCapability`, aucune capacité supposée par défaut) pour que `esm-routes` ne dépende pas d'`esm-platform` ; `esm-platform` expose `registerPlatformCapabilities()` et le shell l'appelle (`setupPlatform`) **avant** `setupApps`. Un Host manquant ne bloque pas le démarrage (journalisé) : l'écran d'incompatibilité reste à faire avec C5. Tests : 8 + 3 (`esm-routes`), 3 (`esm-globals`), 2 (`esm-platform`) |
| G2 bypass inerte en natif | **fait** | `isDevAuthBypassEnabled()` faux en natif ; 6 tests |
| G4 journalisation sûre | **partielle** | test « le jeton n'apparaît ni dans le message, ni dans la stack » fait ; revue des autres journaux à faire |

**Constats à retenir**
- **Fuite de configuration entre deux builds d'un même processus (corrigée dans #108)** : `rspack.config.js` lit `process.env` à l'**évaluation** du module (constantes de tête) ; Node met les modules CJS en cache, donc un second `loadBundlerConfig` dans le même processus réutilisait `apiUrl` / `configUrls` du premier build malgré `setBundlerEnv`. Sans effet en CLI (un processus par build), mais révélé par le test natif de B5 lancé **après** les autres (il passait seul avec `-t native`). Correctif : purge de `require.cache` dans `utils/config.ts`. **Règle** : un test d'intégration qui ne passe qu'isolément est un test qui fuit — toujours lancer le fichier complet.
- **CI rouge sur `main` (2026-11-08) — causes et correctifs (PR #110)** : (1) l'étape *TypeScript check* échouait en ~1 s avec `command not found: tsc` : ~24 workspaces appellent `tsc` sans déclarer `typescript`, et l'image `ubuntu-latest` n'a plus de `tsc` global (annotation de migration vers Ubuntu 26) ; un `tsc` global sur le poste du développeur **masque** ce défaut — reproduit en retirant `npm-global` du PATH. Correctif : `PATH="$PWD/node_modules/.bin:$PATH"` sur cette étape. (2) `tools/publish-contract.test.ts` (`npm pack` synchrone) dépassait les 5 s de vitest sur runner chargé : délai porté à 60 s. **Dette (tâche H7, non faite)** : déclarer `typescript` en devDependency dans chaque workspace concerné, en PR séparée. Les journaux de CI ne sont pas téléchargeables depuis l'environnement d'agent (domaine bloqué) : pour diagnostiquer, remonter la sortie en annotations (`::error::`) depuis une branche jetable.
- **Session du 2026-11-07** : `main` fusionné dans `feat/multiplateforme-p0` sans conflit (15 commits : B1–B3 de la session parallèle, A1/A3/A4, C4, #106) ; tests après fusion : `esm-globals` 14, `esm-platform` 141, `esm-routes` 11, `esm-api` 138, `esm-dynamic-loading` 89, `esm-app-shell` 93, build shell OK. PR ouvertes à ce moment : #108 (B5/B7, autre session — **ne pas y toucher**), #102 (release). Tâches libres (non réservées) : C5–C7, E1–E4, F3, F4, G1, G3, H2–H6.
- Dans `rspack.config.js`, `resolveTarget` est appelé **dans** `module.exports` : le mode, donc `EGEN_ENV`, n'y est connu qu'à l'exécution. `EGEN_DEV_NO_AUTH` est lu depuis `publicEnv` (hiérarchie `.env`), pas depuis `process.env` seul.
- `yarn lint` ne démarrait pas avant #103 ; en CI, la vérification pré-publication (`publint`, `attw`, pack/installation isolée) est le vrai garde-fou : la rejouer en **Node 22** (en Node 20 le message d'erreur de `verify:pack` diffère).
- Deux sessions ont implémenté B1 à B3 en parallèle (branches `feat/multiplatform-p0` et `feat/multiplateforme-p0`) ; elles ont été réconciliées dans `integrate/multiplateforme-p0`. `prettier --check` signale déjà `tools/brand.js` sur `main` (N7).

## ANNEXE 5 — Contrat des capacités P0 côté Host (pour `egen-mobile`)

Tout appel passe par une enveloppe de l'annexe 1 (`ns` = capacité, `m` = méthode, `a` = arguments). **Le Host doit valider `a`
lui-même** (le Shell valide aussi, mais le Shell n'est pas une frontière de confiance pour le Host) et vérifier l'origine de la page.
Un Host n'annonce (`capabilities` du `hello`) que ce qu'il implémente, avec `v` ≥ 1.

| `ns.m` | `a` | Résultat `r` | Remarques |
|---|---|---|---|
| `session.getAuthorization` | — | `string` (valeur d'en-tête `Authorization`, ex. `"Bearer …"`) ou `null` | ASCII visible, sans CR/LF, ≤ 8192 car. : sinon le Shell rejette `HOST_ERROR`. `null` = pas de session |
| `session.setTokens` | `{ access: string, refresh?: string, expiresAt?: number }` | — | `expiresAt` en ms epoch ; stocker dans Keychain / Keystore, **jamais** dans le WebView |
| `session.refresh` | — | `boolean` | `true` ⇒ un nouveau jeton est disponible (le Shell rejouera une fois) ; **booléen strict** |
| `session.clear` | — | — | efface les jetons |
| `secureStorage.get` | `{ key: string }` | `string` ou `null` | clé de 1 à 256 car. |
| `secureStorage.set` | `{ key: string, value: string }` | — | valeurs `string` uniquement |
| `secureStorage.remove` | `{ key: string }` | — | |
| `openExternal.open` | `{ url: string }` | — | URL déjà normalisée ; schémas `https:`, `mailto:`, `tel:` **uniquement** — à revalider |

**Événements Host → Shell (capacité `lifecycle`)** : `lifecycle.resume` (app revenue au premier plan) et `lifecycle.pause` (passée
en arrière-plan), sans donnée. Le Shell ne fait aucun appel : le Host les pousse quand l'état change.

**Erreurs** : `{ ok:false, e:{ code, message, retryable } }` avec `code` parmi `UNAVAILABLE`, `DENIED` (refus utilisateur ou système),
`CANCELLED`, `INVALID_ARGS`, `TIMEOUT`, `INCOMPATIBLE`, `HOST_ERROR`. Un code inconnu est converti en `HOST_ERROR` par le Shell.
Ne jamais inclure un jeton ou une valeur du coffre dans `message`.

---

## 7. Point de reprise (2026-11-11) — lire ceci en premier

### 7.1 État exact du dépôt
- **PR ouvertes** : **#120** (F3, schéma JSON de `routes.json`, branche `feat/f3-schema-routes`) et **#121** (G1 + G3, branche `feat/g1-g3-liens-et-ponts`) : CI en cours, **fusion automatique** lancée (voir 7.4). **#119** = PR de release du bot (aucun check : voir 7.4, « release »).
- **Fusionnés et publiés sur npm** : B1–B5, B7, C1–C7 (P0), D1–D5 (côté framework), E1, F1, F2, F4, G2, + CI réparée (#110). Versions npm vérifiées après #116 : `esm-globals` 2.3.0, `esm-platform` 1.3.0, `esm-app-shell` 2.10.0.
- **Branche distante `feat/g1-garde-fou-ponts`** : une autre session y a seulement réservé G1 (un commit de journal, **aucun code**). G1 est livré par #121 ⇒ cette réservation est caduque ; ne pas recoder G1.
- `main` a évolué en parallèle (autres sessions : réforme TopBar du core, refonte du système de design du thème). **Toujours** `git fetch` + lire ce journal sur `main` avant de commencer.

### 7.2 Reprendre EXACTEMENT ici
**① E3 — politique de stockage (en cours, inventaire fait, un constat sécurité à traiter)**
1. **Constat** : `esm-tenant/src/context/resolver.ts` (l. ~116-140) lit un JWT dans `localStorage`/`sessionStorage` sous les clés `egen:session:token` et `token` pour résoudre le tenant. **En natif, la règle N5 interdit un jeton dans le stockage du WebView** (les jetons vivent dans le Host : capacité `session`, C7/D4).
2. **À faire** : (a) lire `resolver.ts` l. 105-160 et ses tests ; (b) en natif (`isNativeTarget()`), ne **jamais** lire ces clés : obtenir l'information de tenant autrement (claim déjà exposé par le Host via `platform.session`, ou configuration du build `EGEN_TENANT_*`) — **décider avec le backend (X-1)** ce que le jeton apporte exactement avant d'inventer ; (c) tests (natif ignore les clés ; Web inchangé) ; (d) écrire `docs/stockage.md` : tableau *clé / mécanisme / package / sensibilité / comportement en natif*.
3. **Pour refaire l'inventaire** (sortie perdue entre deux sessions) :
   `grep -rn "localStorage\|sessionStorage\|indexedDB\|Dexie" --include=*.ts --include=*.tsx packages | grep -v "node_modules\|/dist/\|\.test\.\|mock"`
4. **Ne pas** migrer le stockage « par principe » avant un constat sur appareil (persistance/quotas d'IndexedDB et `localStorage` en WebView Android/WKWebView : **toujours non testé**).

**② H7 — dette TypeScript (à faire APRÈS fusion de #120 et #121, sinon conflits de manifestes)** : ~24 workspaces appellent `tsc` sans déclarer `typescript`. Liste : parcourir `packages/*/*/package.json` dont `scripts.typescript` existe et `typescript` absent des 3 sections de dépendances. Ajouter `"typescript": "^5.8.3"` en `devDependencies`, `yarn install` (met à jour `yarn.lock`), puis **retirer** le contournement `PATH=...` de `.github/workflows/ci.yml` (étape *TypeScript check*) et vérifier en retirant `npm-global` du PATH local.

**③ H2 — e2e SPA statique « natif simulé »** (Playwright est déjà installé à la racine) : servir un artefact assemblé minimal sous `/app` (origine ≠ API) avec `createMockHost` (`esm-platform/testing`) injecté comme `window.egenHostBridge`. Scénarios : démarrage sans 404 ni requête hors origine hors API ; CSP sans violation ; handshake OK ⇒ apps filtrées par `platforms` ; handshake KO ⇒ écran d'incompatibilité **(pas encore écrit : c'est le reste de C5/F2 côté UI)** ; 401 ⇒ 1 refresh ⇒ rejeu ; overrides d'import map ignorés ; Web sans Host inchangé.

**④ Écran d'incompatibilité du Host** : aujourd'hui un Host manquant/incompatible est seulement journalisé (`setupPlatform` dans `shell/src/run.ts`). À faire : écran bloquant explicite (« mise à jour de l'application requise »).

**⑤ H3 / H4 / H5 / H6** : voir les sections H du document ; H3 (publint/attw/pack) est déjà exercé par le job CI « Vérification pré-publication ».

### 7.3 Ce qui dépend d'autres briques (hors de ce dépôt)
| ID | Besoin | État |
|---|---|---|
| X-1 backend | Bearer, jetons, refresh, CORS pour l'origine locale, endpoint de session compatible | **non fait** — bloque le test de bout en bout de D3/D4 |
| X-2 `egen-core` | `platforms`/`requiredCapabilities` dans les `routes.json`, versions harmonisées (`1.0.0` vs `9.0.2`), app de login pour le flux de jetons | non fait |
| X-3 `egen-distributions` | manifestes par cible, `build-manifest.json` (type et validateur prêts : `validateBuildManifest`), étape `build:spa` | non créé |
| X-4 `egen-mobile` | Host Capacitor : injecte `window.egenHostBridge`, protocole v1 + annexe 5 | non créé |

### 7.4 Recette de travail (l'environnement d'agent est jetable : tout est ici)
- **Yarn 4.10.3** : `repo.yarnpkg.com` est bloqué ⇒ `npm i @yarnpkg/cli-dist@4.10.3` dans un dossier à part, puis `node <dossier>/node_modules/@yarnpkg/cli-dist/bin/yarn.js …`.
- **`tsc`** : le poste d'agent avait un `tsc` global qui **masquait** le défaut H7 ; tester avec `npm-global` retiré du PATH.
- **Clone `--depth 1` mono-branche** : `git fetch origin <branche>` ne crée pas la référence distante ⇒ `git fetch origin +refs/heads/X:refs/remotes/origin/X`.
- **Journaux de CI illisibles** (domaine de stockage bloqué) : seules les **annotations** le sont ⇒ pour diagnostiquer, une branche jetable dont le workflow fait `echo "::error title=diag::$(…)"`.
- **PR créées par le bot** (release) : pas de checks ⇒ pousser un **commit vide** sur la branche `changeset-release/main` avec le jeton de l'utilisateur déclenche la CI ; attendre la fin du workflow `Release` de `main` **avant** (il régénère la PR), puis fusionner, puis vérifier `npm view` des versions.
- **Fusion automatique** (script d'agent, à recréer) : boucle sur `GET /commits/<sha>/check-runs` ; si un check est en échec ⇒ s'arrêter ; si ≥ 2 checks terminés en succès (*Build & Test*, *Vérification pré-publication*) ⇒ `PUT /pulls/<n>/merge` (`merge_method: merge`).
- **Tests d'intégration `egen`** : toujours lancer le **fichier complet** (un test qui ne passe qu'isolé est un test qui fuit).
- **Comparer le HTML Web avant/après** : masquer les hash de 16 hexadécimaux des bundles.

### 7.5 Règles permanentes (décisions de l'utilisateur)
1. **Fusionner sans demander** toute PR dont la CI est verte ; **résoudre puis fusionner** les rouges.
2. **Réserver** une tâche dans ce journal (sur `main`) avant de la coder ; ne pas démarrer une tâche « en cours ».
3. Une tâche n'est **« fait »** qu'une fois **fusionnée, CI verte**. Mettre ce journal à jour à chaque fusion.
4. **Web inchangé** : prouver la non-régression (test ou comparaison de `dist`) ; ne jamais reformater un fichier que `prettier` signalait déjà non conforme (règle N7).
5. Réponses courtes, bilan de fin de session ; **réutiliser l'existant** (`isVersionSatisfied`, registre de capacités, etc.).
6. Le **token GitHub** collé dans la conversation est exposé : **à révoquer** et à remplacer par un jeton à permissions minimales.
