# @egen-civitas/esm-app-shell

L'application hôte (host) du framework EGEN. C'est un shell **générique** : il ne connaît aucune application frontend à son propre moment de build. Toute la liste des apps à charger — et leurs routes — lui est fournie **au runtime**, sous forme d'un [import map](https://github.com/WICG/import-maps) et d'un registre de routes.

Ce découplage est délibéré et est au cœur du modèle : une nouvelle version d'une app ne doit jamais nécessiter de reconstruire ni de redéployer le shell. Le shell se contente de lire, à chaque chargement de page, où trouver chaque app et quelles routes/extensions elle enregistre.

## D'où vient l'import map et le registre de routes

Le shell essaie, dans cet ordre, pour chacun des deux documents :

1. **Une valeur en dur, fournie au build** (`EGEN_ESM_IMPORTMAP` / `EGEN_ROUTES`) — bakée directement dans le HTML publié. Réservé aux cas où un consommateur veut un bundle totalement autonome/figé (offline, démo, etc.) : une fois publié, cette liste ne change plus sans reconstruire le shell.
2. **Une URL à fetcher au runtime** (`EGEN_ESM_IMPORTMAP_URL` / `EGEN_ROUTES_URL`, par défaut `${spaPath}/importmap.json` et `${spaPath}/routes.registry.json`) — c'est le mode normal. Le HTML publié contient une simple référence (`<script src="...">`), et c'est celui qui sert le shell (`egen develop`/`egen start` en local, ou un vrai backend en production) qui répond à ces deux endpoints avec la liste réelle et à jour des apps.

**Une valeur vide (`{}`, ou `{"imports":{}}` pour l'import map) est traitée comme absente**, pas comme "un import map vide fourni explicitement" — elle tombe alors sur le mode (2). C'est le comportement voulu : les scripts `build:production`/`watch` de ce package passent justement `EGEN_ESM_IMPORTMAP='{"imports":{}}'` et `EGEN_ROUTES='{}'` pour dire explicitement "aucune valeur figée, utilise le mode dynamique" — le shell publié sur npm doit systématiquement aller chercher l'import map réelle au runtime, jamais en embarquer une figée par accident.

> Historique : avant ce comportement, une simple présence de la variable d'environnement (même valant `"{}"`, une chaîne non vide donc *truthy* en JS) suffisait à activer le mode (1) — ce qui bakait silencieusement un import map et un registre de routes **vides, pour toujours**, dans le shell publié. Le mode (2) n'était alors jamais utilisé, et aucune app ne pouvait jamais être montée, quel que soit ce que le serveur consommateur (`egen develop`/`egen start`) assemblait dynamiquement. C'est ce bug qui a été corrigé.

## Surcharge locale pour le développement du framework lui-même (`egenCoreImportmap`/`egenCoreRoutes`)

Il existe une troisième couche, réservée au développement du framework : si un dossier `packages/apps` existe **au même niveau que `esm-app-shell` dans son propre monorepo** (`EGEN_ESM_CORE_APPS_DIR`, uniquement en mode non-production), le shell scanne ce dossier et injecte un import map/registre de routes additionnel qui **prend le pas** sur celui du mode (1)/(2) pour les mêmes noms de package (il apparaît après dans le DOM — les import maps `systemjs-importmap` ultérieurs augmentent/écrasent les entrées précédentes pour une même clé).

Dans l'architecture actuelle (`Frontend-esm-framework` / `Frontend-esm-core` séparés), ce dossier n'existe pas et cette couche est donc inerte — elle ne s'active que si quelqu'un place un jour des apps directement dans ce dépôt, à la manière de certains monorepos historiques dont ce framework s'inspire (OpenMRS `openmrs-esm-core`, qui a le même mécanisme pour les mêmes raisons).

## Variables d'environnement

| Variable | Rôle | Défaut |
|---|---|---|
| `EGEN_ESM_IMPORTMAP` | Import map figé au build (`{"imports": {...}}`). Vide = ignoré. | — |
| `EGEN_ESM_IMPORTMAP_URL` | URL à fetcher au runtime si pas de valeur figée. | `${spaPath}/importmap.json` |
| `EGEN_ROUTES` | Registre de routes figé au build. Vide = ignoré. | — |
| `EGEN_ROUTES_URL` | URL à fetcher au runtime si pas de valeur figée. | `${spaPath}/routes.registry.json` |
| `EGEN_ESM_CORE_APPS_DIR` | Dossier scanné pour la surcharge locale (dev uniquement). | `../../apps` relatif à ce package |

## Ce que doit exposer un consommateur

Un consommateur (comme `Frontend-esm-core` via `egen develop`/`egen start`, ou un vrai backend de production) doit répondre, sur les URLs par défaut ci-dessus, avec :

```json
// importmap.json
{ "imports": { "@egen/mon-app": "https://cdn.exemple.com/mon-app/mon-app.js" } }
```

```json
// routes.registry.json
{ "@egen/mon-app": { /* contenu de routes.json de l'app */ } }
```

`egen develop`/`egen start` (package `@egen-civitas/egen`) le fait déjà automatiquement à partir de `--sources` — voir son propre README pour le détail.
