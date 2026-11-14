# Inventaire du `dist` du shell (A2)

Mesuré le 2026-11-13 sur l'artefact **android** minimal de l'e2e (`yarn e2e:build android`, production, import map et routes de test) : il contient le shell seul, **sans les applications métier**. Reproduire :

```bash
yarn e2e:build android
node scripts/inventory-dist.mjs e2e/.artifact/android --top=4
```

Le même script s'applique à n'importe quel `dist` (par exemple celui d'une distribution réelle, `egen-distributions`, X-3).

## Résultat (shell seul, cible android)

Total : **33,0 Mo, 384 fichiers**. L'artefact web de l'e2e a le même poids et la même répartition (382 fichiers) : la cible ne change pas le contenu des bundles, seulement le HTML (CSP, pont `egenTarget`) et deux chunks.

| Type | Fichiers | Poids (Mo) | Part |
|---|---|---|---|
| `.map` | 137 | 12,2 | 37 % |
| `.js` | 138 | 9,9 | 30 % |
| `.wasm` | 4 | 5,2 | 16 % |
| `.css` | 3 | 4,3 | 13 % |
| `.woff2` | 90 | 1,3 | 4 % |
| `.png`, `.json`, `.ico`, `.html` | 12 | 0,1 | 0 % |

Plus gros fichiers : `egen.<hash>.css` (3,7 Mo, Carbon), `<hash>.wasm` (3,4 Mo), deux `.js.map` (1,7 à 1,8 Mo).

**Service worker : aucun** (ni fichier, ni référence dans le HTML) — conforme à la règle « pas de service worker en natif » (A4, B2).

## Constats et pistes (aucune n'est appliquée ici)

1. **Source maps livrées en natif : 12,2 Mo (37 %).** Le build de production émet `hidden-nosources-source-map` : les `.map` n'ont pas de sources et ne sont pas référencés par les `.js`, mais ils restent dans le dossier. Piste : les exclure du paquet embarqué par le Host (étape de packaging, X-3/X-4) ou ne pas les émettre pour une cible native. À arbitrer : garder les `.map` hors de l'application, mais archivés pour symboliser les erreurs.
2. **Runtime Spline (`.wasm`, 5,2 Mo, 16 %) émis en natif alors que `SplineScene` y est neutralisé** (B5, `isNativeTarget()` à l'exécution dans `esm-styleguide`). La neutralisation est une garde **d'exécution** : les 4 chunks `.wasm` et leurs `.js` sont tout de même construits et embarqués, mais jamais chargés. Piste : une garde **de build** (constante substituée par rspack, import dynamique éliminé) pour ne pas les produire. Gain attendu : ~5 Mo + les chunks JS associés ; à mesurer avant de s'engager.
3. **CSS Carbon unique de 3,7 Mo** (13 %) : un seul fichier global. Piste de mesure : part réellement utilisée en natif (purge / découpage), après validation sur appareil.
4. **90 polices `woff2`** (1,3 Mo) : probablement des sous-ensembles (`unicode-range`) ; vérifier que seules les graisses utilisées sont emportées.

## Limites de la mesure

- Poids **non compressés** (pas de gzip/brotli) ; l'app embarque les fichiers tels quels, donc le poids installé est bien ce total, mais la taille de téléchargement d'une mise à jour dépendra du mécanisme de distribution.
- Le shell seul : les applications métier (`egen-core`) s'y ajoutent et seront comptées lors de X-2/X-3.
