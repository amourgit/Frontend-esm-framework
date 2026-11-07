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
| Client de pont / protocole v1 | C5 | à faire |
| Registre et procédure d'ajout d'une capacité | C6 | à faire |
