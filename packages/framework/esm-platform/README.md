# @egen-civitas/esm-platform

Capacités de plateforme EGEN pour **Web, Android et iOS** : contrats TypeScript, détection de la cible, erreurs typées et (à venir) client du protocole Host.

> Document de référence : `docs/EGEN-FRAMEWORK-DEV.md` à la racine du dépôt (chantier C).

## Règles
- **Aucun code natif** et aucun import `@capacitor/*` ici (règles R2/N2).
- La cible est lue **uniquement** via `window.egenTarget` (posé au build). Pas de User-Agent (N4).
- Les capacités rejettent toujours avec `PlatformError` (`UNAVAILABLE`, `DENIED`, `CANCELLED`, `INVALID_ARGS`, `TIMEOUT`, `INCOMPATIBLE`, `HOST_ERROR`).
- Une capacité absente existe comme objet ; ses méthodes rejettent `UNAVAILABLE`. Utiliser `platform.has('…')`.

## Utilisation

Les apps importent **uniquement** via `@egen-civitas/esm-framework` (jamais `esm-platform` directement) :

```ts
import { getPlatform, PlatformError } from '@egen-civitas/esm-framework';

const platform = getPlatform();
if (platform.has('secureStorage')) {
  const value = await platform.secureStorage.get('clé');
}
```

**Web** : l'adaptateur du navigateur fournit `session` (vide : le cookie reste le mécanisme), `openExternal` (`https:`, `mailto:`, `tel:`),
`lifecycle` (`visibilitychange`), `files.select`, `camera.capture` et, si l'API existe, `permissions`. `secureStorage`, `push` et `biometric` ne sont **jamais
simulés** : `has()` est faux et les méthodes rejettent `PlatformError('UNAVAILABLE')`.
**Natif** : tant que le client de pont (C5) n'est pas branché, **aucune capacité n'est fournie** (même comportement). Les abonnements `onResume`, `onPause`,
`onMessage`, dont la signature n'est pas une `Promise`, lèvent la même erreur au lieu de rejeter.
`platform.ready` se résout immédiatement en Web ; en natif il rejette `INCOMPATIBLE` (« Host manquant ») si `window.egenHostBridge` n'a pas été injecté.

## Tests d'une app

```ts
import { createMockPlatform } from '@egen-civitas/esm-framework/mock';

getPlatform.mockReturnValue(createMockPlatform({ capabilities: { openExternal: { open: vi.fn() } } }));
```

`createMockPlatform` utilise le même assembleur que `getPlatform()` (`src/capabilities.ts`) : seules les capacités listées sont disponibles,
le reste reste `UNAVAILABLE`. Le mock et l'implémentation passent les **mêmes** tests de contrat (`src/platform.test.ts`).
`createMockHost()` (simulation de `window.egenHostBridge`) viendra avec le client de pont (C5/C9).

## Capacités v1

Tout ce qui énumère les capacités (gabarit « indisponible », handshake avec le Host, adaptateurs Web et natif, mocks) lit **un seul registre** :
`src/registry.ts`. Il associe à chaque nom une `version`, la liste exhaustive de ses `methods` (`async` ou `subscribe`) et ses adaptateurs `web` / `native`.

| Capacité | Version | Web | Natif | Priorité | Remarque |
|---|---|---|---|---|---|
| `session` | 1 | fournisseur vide (cookie) | à faire (C7) | P0 | chemin critique du chantier D |
| `secureStorage` | 1 | **jamais** (pas de faux coffre) | à faire (C7) | P0 | valeurs `string` uniquement |
| `openExternal` | 1 | `https:`, `mailto:`, `tel:` | à faire (C7) | P0 | allowlist de schémas |
| `lifecycle` | 1 | `visibilitychange` | à faire (C7) | P0 | abonnements avec désabonnement |
| `permissions` | 1 | API Permissions si présente | à faire (C7) | P1 | noms normalisés |
| `files` | 1 | `select` seul | à faire (C7) | P1 | *handle*, jamais de binaire inline |
| `camera` | 1 | `<input capture>` | à faire (C7) | P1 | *handle* de fichier |
| `push` | 1 | **jamais** | à faire (C7) | P2 | |
| `biometric` | 1 | **jamais** | à faire (C7) | P2 | déverrouillage local uniquement |

Une capacité n'est disponible (`has()` vrai) que si un adaptateur la fournit **et**, en natif, que le Host l'annonce dans une version **supérieure ou égale** à celle du registre.

## Ajouter une capacité

Règle (N9) : une capacité P1/P2 n'est implémentée que lorsqu'**une app l'utilise**. La procédure ne modifie **aucun autre fichier du framework**
que ceux listés ci-dessous : le critère est vérifié par `src/registry.test.ts`, qui ajoute une capacité fictive entièrement depuis un fichier de test.

1. **Interface TypeScript** dans son propre fichier (`src/extensions/<nom>.ts`), avec les **deux fusions de déclaration** qui l'enregistrent côté types
   (ni `types.ts` ni `esm-globals` ne sont modifiés) :
   ```ts
   export interface MaCapacite {
     faire(entree: string): Promise<string>;
     onEvenement(callback: () => void): Unsubscribe;
   }
   declare module '@egen-civitas/esm-globals' {
     interface EgenCapabilityExtensions {
       maCapacite: true; // la rend valide comme `CapabilityName` (donc dans `requiredCapabilities`)
     }
   }
   declare module '../types.js' {
     interface CapabilityInterfaces {
       maCapacite: MaCapacite; // la rend accessible : `platform.maCapacite`
     }
   }
   ```
2. **Entrée du registre** (`registerCapability('maCapacite', { version, methods, web, native })`). `methods` est vérifié **à la compilation** : un oubli ne compile pas.
3. **Adaptateur Web** (`src/adapters/web/<nom>.ts`) : une fabrique qui retourne `undefined` si le navigateur ne sait pas faire. Une méthode non fournie reste `UNAVAILABLE`. **Jamais de simulation de sécurité.**
4. **Adaptateur natif** : un simple *appelant* du pont (`client.call('maCapacite', 'faire', args)`, `client.onEvent(...)`), sans logique métier.
5. **Mock** : `createMockPlatform({ capabilities: { maCapacite: { … } } })` fonctionne sans rien ajouter ; ajouter ses valeurs par défaut dans `src/testing/` seulement si utile.
6. **Tests** : ajouter les lignes de la capacité aux tables de `src/platform.test.ts` (elles servent d'oracle indépendant du registre), un test par méthode de l'adaptateur Web, et un test natif avec `createMockHost`.
7. **Changeset** *minor* (`esm-platform`, et `esm-globals` si une extension de `CapabilityName` est publiée).
8. **Ligne ajoutée au tableau des capacités** ci-dessus.

## État d'avancement
| Élément | Tâche | État |
|---|---|---|
| Création du package et câblage (`esm-framework` index/internal/mocks, shell, typedoc) | C1 | fait |
| Contrats TypeScript des capacités | C2 | fait |
| Erreurs typées | C2 | fait |
| Détection de la cible, cohérence du Host (`hasHostBridge`, `ready`) | C3 | fait |
| `getPlatform()` sûr par défaut (aucune capacité simulée) | C1 | fait |
| `createMockPlatform` | C9 | partiel (`createMockHost` à faire avec C5) |
| Adaptateur Web | C4 | fait |
| Client de pont / protocole v1 (`createBridgeClient`, handshake, `getHostInfo`) | C5 | fait |
| Registre et procédure d'ajout d'une capacité | C6 | fait |

## Tester sans Host
`createMockHost()` (`@egen-civitas/esm-platform/testing`) simule `window.egenHostBridge` : handshake automatique, méthodes
programmables (`handlers: { 'secureStorage.get': () => 'valeur' }`), latence, silence (tests de timeout), version de
protocole incompatible, messages bruts arbitraires. Il rejoue le **contrat** du protocole v1, pas du code natif.

```ts
const host = createMockHost({ capabilities: { secureStorage: { v: 1 } }, handlers: { 'secureStorage.get': () => 'v' } });
host.install(); // window.egenHostBridge
window.egenTarget = 'android';
await getPlatform().ready; // handshake
```
