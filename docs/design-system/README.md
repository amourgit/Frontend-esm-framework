# Design System EGEN × TokiForge — dossier de conception et de suivi

Cahier des charges de référence : [`docs/refonte-systeme-design.md`](../refonte-systeme-design.md).
Branche de travail : `feat/design-system-tokiforge` (créée depuis `main`).

| Document | Contenu |
|---|---|
| [`ARCHITECTURE-ACTUELLE.md`](ARCHITECTURE-ACTUELLE.md) | Mémo : comment le framework et le moteur de thème actuel (`esm-theme`) fonctionnent, qui les consomme |
| [`TOKIFORGE.md`](TOKIFORGE.md) | Ce que TokiForge fournit réellement (vérifié dans son code) et ce qu'il ne fournit pas |
| [`ADR.md`](ADR.md) | Décisions d'architecture, **dont celles à valider avant tout code** |
| [`PLAN.md`](PLAN.md) | Phases DS-0 à DS-9 : périmètre, tâches, tests qui valident, critères de sortie, rollback |
| [`TRACKING.md`](TRACKING.md) | Suivi global avec verrouillage des phases (`node scripts/design-system-tracking.mjs`) |

## Règles de travail (dépôt partagé)

Ce dépôt est modifié par plusieurs personnes en parallèle. Sur ce chantier :

1. **Rien n'est poussé sur `main`.** Tout vit sur `feat/design-system-tokiforge` ; l'intégration se fait par PR, phase par phase.
2. Avant chaque phase : `git fetch`, relire le journal de [`EGEN-FRAMEWORK-DEV.md`](../EGEN-FRAMEWORK-DEV.md) §6 **sur `main`**, lister `git branch -r` et les PR ouvertes, puis rebaser la branche sur `main`.
3. Règles invariantes du framework applicables (EGEN-FRAMEWORK-DEV.md §1) : **R6** changeset pour tout changement public, **R7** gabarit `esm-tenant` pour tout nouveau paquet, **R8** réutiliser l'existant, **N6** toute dépendance runtime ajoutée est justifiée par écrit (taille, maintenance, alternative), **N7** aucune « correction au passage » hors périmètre.
4. Une phase n'est « validée » qu'avec ses tests verts **et** la CI du dépôt verte.
5. La suppression de l'ancien moteur est **radicale** (cahier des charges §0 : un seul système) mais **tardive** : elle n'intervient qu'en DS-8, une fois les consommateurs migrés et la parité prouvée.
