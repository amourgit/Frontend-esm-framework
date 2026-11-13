# Cibles de build du shell

Le shell (`@egen-civitas/esm-app-shell`) se construit pour une **cible** : `web` (défaut), `android` ou `ios`. La cible est choisie par `EGEN_TARGET` ; absente ou vide, elle vaut `web` et le build reproduit exactement le comportement Web antérieur (règle R2). Toute autre valeur fait échouer le build (pas de repli silencieux).

Source de vérité : `packages/shell/esm-app-shell/tools/targets.js` (`resolveTarget`, fonction pure). Aucun autre fichier du build ne compare la cible à une valeur : il lit un champ de `TargetConfig` (règle N1).

## Champs de `TargetConfig`

| Champ | Web | Natif (`android`, `ios`) |
|---|---|---|
| `native` | `false` | `true` |
| `publicPath` | `EGEN_PUBLIC_PATH` ou `/egen-civitas/spa` | `/app` (constant, jamais lu dans l'environnement) |
| `serviceWorker` | `EGEN_OFFLINE === 'enable'` | toujours `false` |
| `offlineData` | `EGEN_OFFLINE === 'enable'` | `true`, sauf `EGEN_OFFLINE_DATA=disable` |
| `importmapMode` | `inline` si `EGEN_ESM_IMPORTMAP` est significative, sinon `url` | `inline` |
| `routesMode` | `inline` si `EGEN_ROUTES` est significatif, sinon `url` | `inline` |
| `allowImportMapOverrides` | `true` (actifs seulement si `spaEnv=development`) | `false`, toujours |
| `allowDevAuthBypass` | `true` | `false` |
| `requireAbsoluteApiUrl` | `false` | `true` |
| `csp` | `null` (aucune CSP) | politique CSP ci-dessous |

Pont build → runtime : en natif seulement, le HTML pose `window.egenTarget` (`'android'` ou `'ios'`). Web : rien n'est injecté ; l'absence de `window.egenTarget` vaut `web`.

## Règles de validation natives (le build échoue, toutes les erreurs sont listées)

- `EGEN_ENV` vaut `production`.
- `EGEN_DEV_NO_AUTH` n'est pas `true` (le contournement d'authentification n'est jamais embarqué).
- `EGEN_API_URL` est une URL absolue `https://` valide (sert aussi d'origine à `connect-src`).
- `EGEN_ESM_IMPORTMAP` : JSON valide, import map non vide ; `EGEN_ESM_IMPORTMAP_URL` interdit.
- `EGEN_ROUTES` : JSON valide, registre non vide ; `EGEN_ROUTES_URL` interdit.
- Un artefact natif est **autonome** : aucune ressource de composition distante.
- Les noms des ponts `EGEN_AI_*` / `EGEN_TENANT_*` ne doivent pas évoquer un secret (G1).

## CSP native

```
default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:;
font-src 'self'; connect-src 'self' <origine de EGEN_API_URL>; base-uri 'self'; form-action 'self'
```

`'unsafe-eval'` est interdit. `'unsafe-inline'` pour les styles est à réexaminer (Carbon) : proposition à valider sur appareil (B5).

## Construire et vérifier

```bash
# Artefact natif réel
EGEN_TARGET=android EGEN_ENV=production EGEN_API_URL=https://api.exemple.ga \
EGEN_ESM_IMPORTMAP='{"imports":{…}}' EGEN_ROUTES='{…}' yarn workspace @egen-civitas/esm-app-shell build

# e2e « natif simulé » (artefacts minimaux + Host simulé), voir e2e/
yarn e2e:build android && yarn e2e:build web && yarn e2e
```

Sans accès au CDN de Playwright : `EGEN_E2E_CHROMIUM=<chemin d'un Chromium>`.
