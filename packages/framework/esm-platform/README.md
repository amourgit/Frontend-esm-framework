# @egen-civitas/esm-platform

Capacités de plateforme EGEN pour **Web, Android et iOS** : contrats TypeScript, détection de la cible, erreurs typées et (à venir) client du protocole Host.

> Document de référence : `docs/EGEN-FRAMEWORK-DEV.md` à la racine du dépôt (chantier C).

## Règles
- **Aucun code natif** et aucun import `@capacitor/*` ici (règles R2/N2).
- La cible est lue **uniquement** via `window.egenTarget` (posé au build). Pas de User-Agent (N4).
- Les capacités rejettent toujours avec `PlatformError` (`UNAVAILABLE`, `DENIED`, `CANCELLED`, `INVALID_ARGS`, `TIMEOUT`, `INCOMPATIBLE`, `HOST_ERROR`).
- Une capacité absente existe comme objet ; ses méthodes rejettent `UNAVAILABLE`. Utiliser `platform.has('…')`.

## État d'avancement
| Élément | Tâche | État |
|---|---|---|
| Contrats TypeScript des capacités | C2 | fait |
| Erreurs typées | C2 | fait |
| Détection de la cible | C3 | fait |
| Adaptateur Web | C4 | à faire |
| Client de pont / protocole v1 | C5 | à faire |
| Registre et procédure d'ajout d'une capacité | C6 | à faire |
