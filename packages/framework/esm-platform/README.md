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
| `createMockPlatform`, `createMockHost` | C9 | fait |
| Adaptateur Web | C4 | fait |
| Client de pont / protocole v1 (`createBridgeClient`, handshake, `getHostInfo`) | C5 | fait |
| Registre et procédure d'ajout d'une capacité | C6 | fait |
| Adaptateurs natifs P0 : `session`, `secureStorage`, `openExternal`, `lifecycle` | C7 | fait (P1/P2 à la demande d'une app) |

## Codes d'erreur

Toute capacité **rejette** avec `PlatformError` (jamais `null`, jamais une `Error` générique, jamais de texte localisé : les apps traduisent à partir du `code`). Champs : `code`, `message`, `retryable`, `capability`, `method`.

| Code | Sens | Rejouable |
|---|---|---|
| `UNAVAILABLE` | La capacité n'existe pas dans cet environnement (Web, Host qui ne l'annonce pas). Tester `platform.has('…')` avant. | non |
| `DENIED` | L'utilisateur ou le système a refusé (permission, biométrie…). | non |
| `CANCELLED` | L'utilisateur a annulé l'opération. | non |
| `INVALID_ARGS` | Arguments invalides côté appelant (nom d'appel, JSON non sérialisable, message trop volumineux : passer par une référence de fichier). | non |
| `TIMEOUT` | Le Host n'a pas répondu dans le délai (30 s par défaut, réglable par appel). Une réponse tardive est ignorée. | **oui** |
| `INCOMPATIBLE` | Handshake refusé : Host manquant, version de protocole non supportée, réponse incohérente. **Définitif** : le shell affiche l'écran « mise à jour requise ». | non |
| `HOST_ERROR` | Échec du Host ou de l'envoi ; tout code inconnu du Host est ramené à celui-ci, avec un message tronqué (contenu non fiable). | selon `retryable` |

Aucun argument d'appel (jeton compris) n'apparaît dans le message, la pile ou la sérialisation d'une `PlatformError` (règle G4, testée).

## Pont Host ↔ WebView (protocole v1)

Le Host injecte **avant tout script de la page** `window.egenHostBridge`, et le framework ne connaît rien d'autre du natif :

```ts
interface HostBridge {
  send(json: string): void;                        // web → Host
  subscribe(callback: (json: string) => void): void; // Host → web (appelé une seule fois par le client)
}
```

Tous les messages sont du **JSON texte** de 256 Ko au plus, avec `p: "egen-host"` et la version `v` (le client sait parler `1`) :

| Sens | Forme | Rôle |
|---|---|---|
| web → Host | `{ p, v, id, ns, m, a? }` | appel `ns.m(a)` ; `id` corrèle la réponse |
| Host → web | `{ p, v, id, ok: true, r? }` | succès |
| Host → web | `{ p, v, id, ok: false, e: { code?, message?, retryable? } }` | échec (contenu **non fiable**, validé côté client) |
| Host → web | `{ p, v, ev, d? }` | événement (abonnements) |

Le handshake est l'appel `host.hello` (`{ protocol: { min, max }, framework? }`) : le Host répond sa version de protocole, son nom, la plateforme et les capacités qu'il fournit (`{ nom: { v } }`). Toute valeur hors contrat (type, version, capacité inconnue) est ignorée ou rejetée `INCOMPATIBLE`, jamais interprétée. Un message qui n'est pas du protocole (JSON invalide, autre `p`, trop long) est ignoré sans exception.

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
