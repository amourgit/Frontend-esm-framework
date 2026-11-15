# Plan de développement — phases DS-0 à DS-9

Chaque phase : **objectif · périmètre (fichiers/paquets touchés) · tâches · tests qui valident · critère de sortie · rollback**.
Dépendances : DS-0 → DS-1 → DS-2 → DS-3 → DS-4 → DS-5 → DS-6 → DS-7 → DS-8 → DS-9. DS-6 peut démarrer après DS-4 si DS-5 est livré en parallèle par une autre personne (dépendance sur l'API publique uniquement).

---

## DS-0 — Décisions et garde-fous
**Objectif.** Lever les points qui ne se rattrapent pas après coup.
**Périmètre.** Documentation uniquement.
**Tâches.** Valider ADR-001 (licence), ADR-002 (nommage), ADR-003 (paquet), ADR-005 (application/persistance). Réserver le chantier dans le journal de `main` (via PR) ; lister `git branch -r` et les PR ouvertes.
**Tests.** `node scripts/design-system-tracking.mjs check`.
**Sortie.** ADR-001 et ADR-002 « Acceptée » (ou option retenue consignée).
**Rollback.** Aucun (documentation).

## DS-1 — Filet de sécurité : caractériser l'existant
**Objectif.** Pouvoir prouver, plus tard, que rien n'a régressé.
**Périmètre.** Nouveaux fichiers de test dans `packages/framework/esm-theme`, `scripts/`, `docs/design-system/`. **Aucune modification de code existant.**
**Tâches.**
1. **Test « golden »** : sortie `{ base, light, dark }` de l'aplatisseur actuel sur `theme.default.json` figée en fichier de référence (noms et valeurs).
2. **Test d'API publique** : liste figée des exports d'`esm-theme` et de leur signature.
3. **Caractérisation du moteur** : règle de fusion par priorité, ordre des surcharges globales/par app, mode (`data-theme`, `egen-theme-mode`), échec de chargement → thème par défaut, abonnements. (Verrouille les points « à confirmer » d'ARCHITECTURE-ACTUELLE.md.)
4. **Inventaire reproductible des consommateurs** (`scripts/inventory-theme.mjs`) : imports d'`esm-theme`, variables CSS `var(--…)` utilisées par paquet, clés `localStorage`, attributs `data-*` ; sortie versionnée `docs/design-system/INVENTAIRE.md`.
5. **Mesures** : poids du paquet et du CSS de thème injecté (référence pour DS-9).
**Tests.** Les tests ci-dessus, verts sur `main` sans aucune modification fonctionnelle.
**Sortie.** Golden + API + inventaire commités ; CI verte.
**Rollback.** Suppression des fichiers ajoutés.

## DS-2 — Modèle de thème EGEN (document) indépendant du moteur
**Objectif.** Le *document de thème EGEN* devient un concept explicite, versionné et validé, sans dépendre d'aucun moteur.
**Périmètre.** `esm-theme/src/model/` (nouveau). `theme.default.json` inchangé.
**Tâches.**
- Types `ThemeDocument` (meta, couleurs, typographie, rayons, ombres, mise en page, effets, panels, **composants → variantes → états**), version de format.
- Convention de composants : `components.<composant>.<variante>.<état>.<propriété>`, cascade documentée (état → `default` de la variante → `base` → token global), valeur `string` ou `{ light, dark }`.
- Validation (structure, valeurs CSS sûres, échelles de couleurs complètes) **sans** réimplémenter ce que fournit TokiForge (couleurs/contraste → DS-3).
- Fusion de documents par priorité (extraite de l'existant, comportement verrouillé par DS-1).
**Tests.** `theme.default.json` valide ; rejet des valeurs non sûres ; cascade des composants ; fusion identique à la caractérisation DS-1.
**Sortie.** Le modèle valide tous les thèmes existants ; aucune dépendance TokiForge.
**Rollback.** Suppression du dossier `model/`.

## DS-3 — Adaptateur EGEN → TokiForge et génération du CSS
**Prérequis.** ADR-001 et ADR-002 tranchés. **N6** : justification écrite de la dépendance (taille du point d'entrée `@tokiforge/core/runtime`, maintenance, alternative écartée).
**Périmètre.** `esm-theme/src/tokiforge/` (nouveau), `package.json` (dépendance).
**Tâches.**
1. **Spike (1 jour max)** : préfixe/nommage (ADR-002), nœuds `{ value }`, comportement sur les tableaux (familles de polices), ombres, nombres.
2. `toDesignTokens(document, mode)` : adaptateur EGEN → format TokiForge.
3. Génération des 3 blocs (`:root`, `[data-theme="light"]`, `[data-theme="dark"]`) via `TokenExporter.exportCSS` (échappement et validation de sélecteur **fournis par TokiForge**, ceux de l'ancien injecteur ne sont pas repris).
4. Contrôles couleur et contraste par `ColorUtils`/`AccessibilityUtils`.
**Tests.** **Test de parité** : mêmes variables et mêmes valeurs que le golden DS-1 pour `theme.default.json` (ou différences listées et validées par ADR-002) ; injection CSS refusée (sélecteur, valeur) ; couverture des couleurs oklch.
**Sortie.** Parité prouvée. L'ancien moteur fonctionne toujours (aucun consommateur migré).
**Rollback.** Retirer la dépendance et le dossier `tokiforge/`.

## DS-4 — Orchestration EGEN sur TokiForge
**Objectif.** Ce qu'EGEN doit garder (TOKIFORGE.md) : sources, priorités, surcharges, mode, abonnements.
**Périmètre.** `esm-theme/src/` : nouveau cœur d'orchestration (même API publique que DS-1, en parallèle de l'ancien moteur, **sans le remplacer encore**).
**Tâches.** Chargement des sources (URL, rechargement à chaud en développement) ; superposition par priorité ; surcharge globale (id, priorité) et par application (scope `data-egen-app`) ; mode clair/sombre (`data-theme`, clé `egen-theme-mode` inchangée) ; `getThemeState`/`subscribe` ; validation à l'entrée ; vérification cibles natives (ADR-007, R4).
**Tests.** Rejouer **toute la caractérisation DS-1** contre le nouveau cœur ; priorités ; surcharges ; mode ; erreurs de chargement ; absence de `window` (SSR/test).
**Sortie.** Le nouveau cœur passe les mêmes tests que l'ancien.
**Rollback.** Le nouveau cœur n'est pas branché : suppression du dossier.

## DS-5 — Application dynamique et persistance
**Objectif.** « Le thème validé devient le thème de l'environnement » (cahier des charges §16) — ADR-005.
**Périmètre.** `esm-theme/src/` ; contrat consommé par le Theme Studio du Core.
**Tâches.**
- API d'application : `applyTheme(document, { id, priority })`, `revertTheme(id)`, `isThemeApplied(id)` (**dérivé de l'état du moteur**).
- Port `ThemeSource` + implémentations : URL de déploiement (`egenThemeUrls`) et stockage local versionné (palliatif).
- **Réhydratation au démarrage avant le premier rendu**, anti-FOUC conservé.
- Adaptateur prêt à l'emploi du **port runtime du Studio** (`apply/revert/isApplied/getActiveTheme/getMode/previewVars`), pour que le Core cesse d'avoir sa propre glue.
**Tests.** apply→reload→réappliqué ; revert persistant ; `isApplied` juste après remontage ; thème invalide refusé avec erreur typée ; aucune fuite entre scopes ; contrat du port vérifié par un test commun avec le Core.
**Sortie.** Parcours Studio « Appliquer → recharger » vérifié de bout en bout.
**Rollback.** Retirer l'API ajoutée (non encore consommée).

## DS-6 — Composants, états et ponts (Carbon, Tailwind)
**Objectif.** Rendre le thème **consommable** par les composants (cahier des charges §8, §15).
**Périmètre.** `esm-theme`, `esm-styleguide/src/_carbon-bridge.scss`, `tooling/tailwind-preset`.
**Tâches.** Génération des variables `--components-<composant>-<variante>-<état>-<propriété>` (via l'adaptateur DS-3) ; helper de cascade `componentVar()` ; **pont Carbon généré depuis la même source** au lieu d'être maintenu à la main ; preset Tailwind aligné ; documentation d'ajout d'un composant.
**Tests.** Cascade (état → variante → base → global) en CSS réel ; parité du pont Carbon avec l'existant ; rendu de composants Carbon avec un thème de test.
**Sortie.** Un composant Carbon du styleguide suit une surcharge `components.*`.
**Rollback.** Retour au pont manuel (fichier versionné).

## DS-7 — Migration des consommateurs
**Périmètre.** `shell/esm-app-shell` (`run.ts`, `index.ejs`, `rspack.config.js`, `publish-contract.test.ts`), `esm-styleguide` (TopBar), `tooling/tailwind-preset`, README/docs. Côté Core (**PR séparées** dans `Frontend-esm-core`) : `esm-settings-app`, `esm-theme-studio-app`.
**Tâches.** Basculer chaque consommateur sur le nouveau cœur ; (si ADR-002 = B) migration mécanique scriptée des variables ; mise à jour du contrat de publication.
**Tests.** Tests existants des paquets touchés ; `publish-contract` ; démarrage du shell avec thème par défaut et avec `egenThemeUrls` ; comparaison visuelle/CSS avant-après.
**Sortie.** Plus aucun import de l'ancien moteur dans le dépôt (vérifié par un test de garde).
**Rollback.** Revert par consommateur (une PR par consommateur).

## DS-8 — Suppression radicale de l'ancien moteur
**Périmètre.** `esm-theme` : chargeur, aplatisseur, injecteur, fusion, singleton actuels et leurs tests obsolètes.
**Tâches.** Suppression ; retrait des exports morts ; **changeset major (2.0.0)** ; mise à jour des documents ; test de garde « aucune référence à l'ancien moteur ».
**Tests.** Suite complète du paquet ; build du shell ; garde anti-régression.
**Sortie.** Un seul système dans le dépôt. **Rollback.** Revert du commit de suppression (isolé dans une PR dédiée).

## DS-9 — Qualité, performance, release
**Tâches.** E2E de démarrage (thème appliqué avant le premier rendu, pas de FOUC) ; mesure du poids vs DS-1 ; contrôles d'accessibilité (contraste) dans la validation ; documentation d'extension (nouveau composant, nouveau thème) ; changesets ; plan de publication (**uniquement si ADR-001 est tranché**) ; mise à jour du journal.
**Sortie.** CI verte, mesures consignées, documentation à jour.
