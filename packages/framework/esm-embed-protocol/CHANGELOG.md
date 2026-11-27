# @egen-civitas/esm-embed-protocol

## 0.5.0

### Minor Changes

- 721c7f8: Droits d'iframe négociés et voie unique SDK.

  - **protocole** : bloc `iframe` (`sandbox[]`, `allow[]`) dans la déclaration `egen-config.json` (demande) et dans le plafond approuvé ; listes blanches strictes (`IFRAME_SANDBOX_TOKENS`, `IFRAME_ALLOW_TOKENS`, jamais de `allow-top-navigation*`) ; `validateIframeRights`, `effectiveIframe` (demande ∩ plafond), `sanitizeIframeRights` ; `config` publique validée (≤ 8 Ko) ; `ApprovedGrants` accepte `iframe`. **Breaking** : `SUPPORTED_PROTOCOLS` ne contient plus que `2` (le protocole 1 / pont 1.1 est retiré) ; `negotiateProtocol(1)` → `null`.
  - **hôte** : option `iframe` (droits effectifs) qui étend le socle et pose les attributs `sandbox` et `allow`, avec revalidation par liste blanche. **Breaking** : l'option `sandbox` est remplacée par `iframe` ; l'option `legacy` et le pont 1.1 (`handleLegacy`, `legacySend`) sont retirés ; la poignée de main ne propose plus que le protocole 2.
  - **testing** : `createTestHost` accepte `manifestIframe` et expose `iframe` (droits effectifs) ; `egen-embed-check` valide la forme `iframe`, rappelle l'approbation requise et signale les permissions sensibles ; le simulateur applique les droits d'iframe.
  - **client** : documentation (les droits se demandent dans `egen-config.json`), le manifeste s'appelle désormais `egen-config.json`.

## 0.4.0

### Minor Changes

- 3300bac: Toasts partagés : le Core est l'afficheur, l'app notifie en temps réel sans doublon. Politique d'opérateur dans le grant `notifications` (`exclusive`, défaut vrai ; `rate`, défaut 10 par 10 s), `id` de dédoublonnage, réponse `{ displayed }`, anti-spam `RATE_LIMITED`. Client : `egen.notify(toast, local?)` (point d'entrée unique, repli local si le Core n'affiche pas), `egen.coreDisplaysNotifications`, hook `useEgenNotify`. Hôte : le fournisseur peut répondre `false` (doublon). Testing : hôte de test, conformité et vérificateur couvrent le modèle.
- b2d283e: Retrait radical de l'ancienne couche d'assistance par agent. Elle était trop rigide et sera reconstruite sur une base saine, selon la nouvelle architecture documentée dans le dépôt Core (dossier de documentation de l'intégration de l'agent).

  - **Packages supprimés** : les sept packages de l'ancienne couche (configuration, canal, contexte, événements, extensions, outils, façade). Le tag `pre-retrait-assistance-2026-11-25` conserve l'état précédent.
  - `esm-framework` : ne ré-exporte plus la façade de l'ancienne couche. **Rupture** pour tout consommateur qui l'importait via `esm-framework`.
  - `esm-styleguide` : le dossier `assistant/` est supprimé (orbe, robot 3D, scène Spline, saisie de prompt, fond d'érosion, modale « verre d'eau », audio), ainsi que les jetons CSS `--ui-*` dédiés à cette couche et les dépendances `three`, `@react-three/fiber`, `@splinetool/*`.
  - `esm-app-shell` : le pont des variables d'environnement de l'ancienne couche vers `window` est supprimé (configuration, gabarit `index.ejs`, bootstrap natif). Le garde-fou des ponts ne porte plus que sur `EGEN_TENANT_*`.
  - `rspack-config` : le préfixe de variable publique de l'ancienne couche est retiré de `PUBLIC_ENV_PREFIXES`.
  - `esm-embed-*` : la capacité d'outils pilotés par un agent est retirée du catalogue du SDK embed (protocole, hôte, client, simulateur et vérificateur de test).

## 0.3.0

### Minor Changes

- 36eb684: **Changement incompatible : le SDK est recentré sur ce dont le Core est lui-même la source.** Retrait des capacités `session`, `permissions`, `theme` et `api` (identité, droits, thème et appels API viennent de Keycloak, des backends et du service de thèmes ; le Core ne les relaie pas, ce qui supprime une classe entière de failles). Retrait de `pickFields`, des chemins d'API, de `createFetchApiProvider`, des hooks `useEgenSession`/`useEgenTheme`, et de la session dans le pont 1.1. Une demande de capacité retirée est rejetée avec la raison et la voie à suivre (`REMOVED_CAPABILITIES`).

  Ajout de la capacité `extensions` (découverte des extensions d'un slot, grants `discover`/`contribute` par slot) et des contributions déclaratives `extensions[]` du manifeste (composants d'une app embarquée injectés dans les slots du Core), avec validation (`iconUrl` même origine, 4 Ko de meta) et `allowedContributions`. Hooks React `useEgenLocale`, `useEgenTenant`, `useEgenExtensions`.

## 0.2.0

### Minor Changes

- 18cec62: Sécurité : `api.fetch` avec `path` est désormais **deny-by-default** (liste `paths` obligatoire dans le grant, normalisation anti-contournement : `..`, `%2e`, `//`…) pour qu'une app embarquée ne puisse pas appeler tout l'API du Core avec la session de l'utilisateur ; `negotiateCapabilities` ignore les entrées malformées ; tests de fuzz déterministes. Outillage : `egen-embed-check` (manifeste, capacités, `frame-ancestors`).

## 0.1.0

### Minor Changes

- 10f0584: Nouveau SDK `esm-embed-client` (connexion v2, 15 façades de capacités, mode autonome, liaison React). Protocole : message `probe` de poignée de main et `wrapHandshake`.
- 744cd20: Nouveau paquet `esm-embed-host` (iframe sécurisée, poignée de main v2, grants appliqués, fournisseurs, `createFetchApiProvider`, navigation partagée, compatibilité du pont 1.1). Protocole : `pickFields`, refus `UNAVAILABLE`, réponse trop volumineuse signalée à l'appelant.
- cf9d90d: Nouveau paquet : protocole v2 d'intégration des apps embarquées (poignée de main, catalogue de 15 capacités, grants effectifs, négociation, moteur RPC à dispatch fermé).
