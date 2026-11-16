# Suivi global — Design System EGEN × TokiForge

Géré par `node scripts/design-system-tracking.mjs` (claim / release / complete / check). Ne pas modifier les verrous à la main.
Une phase n'est cochée qu'avec ses tests verts **et** la CI verte.

| Phase | Titre | Statut | Verrou | Validée le |
|-------|-------|--------|--------|------------|
| DS-0 | Décisions et garde-fous | [x] done | — | 2026-11-15 |
| DS-1 | Filet de sécurité : caractériser l'existant | [x] done | — | 2026-11-15 |
| DS-2 | Modèle de thème EGEN | [x] done | — | 2026-11-15 |
| DS-3 | Adaptateur EGEN → TokiForge et génération du CSS | [x] done | — | 2026-11-15 |
| DS-4 | Orchestration EGEN sur TokiForge | [x] done | — | 2026-11-15 |
| DS-5 | Application dynamique et persistance | [x] done | — | 2026-11-15 |
| DS-6 | Composants, états et ponts (Carbon, Tailwind) | [x] done | — | 2026-11-15 |
| DS-7 | Migration des consommateurs | [x] done | — | 2026-11-16 |
| DS-8 | Suppression radicale de l'ancien moteur | [x] done | — | 2026-11-16 |
| DS-9 | Qualité, performance, release | [ ] todo | — | — |

**Notes d'avancement.** DS-7 est validée côté *framework* ; la migration des apps de `Frontend-esm-core` (variables `--egen-*`, alias SCSS supprimés, `esm-theme-studio-app` sur la nouvelle API) se fait par PR séparée avec les mêmes scripts (`scripts/migrate-theme-vars.mjs`, `scripts/migrate-legacy-style-aliases.mjs`). DS-8 est exécutée (ADR-008). DS-9 reste ouverte : E2E de démarrage sans FOUC, mesure de poids vs DS-1, vérifications d'accessibilité, mentions de licence AGPL (ADR-001).
