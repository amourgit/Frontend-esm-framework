# Décisions d'architecture (ADR)

Statuts : **À DÉCIDER** (bloque une phase) · **Proposée** (recommandation, validation attendue) · **Acceptée**.
Aucun ADR « À DÉCIDER » ne peut rester ouvert quand la phase qu'il bloque démarre.

---

## ADR-001 — Licence : TokiForge (AGPL-3.0) dans un framework MPL-2.0 — **Acceptée : option A (accepter l'AGPL)**

**Constat.** `@tokiforge/core` et `@tokiforge/react` sont sous AGPL-3.0 (vérifié : `package.json` et `LICENSE` du dépôt). Le framework EGEN est sous MPL-2.0. Le shell est servi à des utilisateurs finaux (usage en réseau) et peut être embarqué dans des applications natives (chantier multiplateforme).

**Risque.** Obligations de mise à disposition du code source de l'œuvre combinée, y compris pour l'usage en réseau ; incompatibilité probable avec la distribution actuelle du framework sans décision de licence explicite. *Ceci n'est pas un avis juridique.*

**Options.**
- **A.** Accepter l'AGPL pour ce qui embarque TokiForge (et en mesurer l'effet sur les paquets publiés, le shell et les apps du Core).
- **B.** Obtenir de TokiForge une licence permissive ou une double licence (si l'organisation EGEN détient ou peut obtenir ces droits).
- **C.** Contribuer en amont/forker sous une licence compatible, si les titulaires des droits l'acceptent.
- **D.** Ne pas dépendre de TokiForge (contredit le cahier des charges §11).

**Décision (propriétaire du dépôt) : option A, AGPL acceptée.** Conséquences à traiter en DS-9 : mention de licence dans les paquets concernés, fichier de notices, vérification que l'offre de code source est satisfaite pour le shell servi aux utilisateurs.

*Recommandation initiale (conservée pour mémoire).* Établir qui détient les droits sur TokiForge avant DS-3. Le développement sur la branche est possible (dépendance réversible) ; **aucune publication (`publish-next`, `release`) ni fusion sur `main` avant décision.**

---

## ADR-002 — Contrat de nommage des variables CSS — **Acceptée : option B (préfixe `--egen-*`)**

**Constat.** Le contrat actuel est `--colors-primary-500`, `--border-radius-md`, `--panel-card-background`… (plus de 700 références dans le styleguide, apps, Tailwind). TokiForge nomme toujours `--${prefix}-${chemin}` ; un préfixe vide donne `---colors-primary-500`.

**Options.**
- **A.** Conserver les noms actuels : contribution amont (préfixe optionnel) ou enveloppe minimale validée par le test de parité DS-3.
- **B.** Adopter un préfixe (`--egen-colors-primary-500`) : migration mécanique scriptée de tous les consommateurs (styleguide, Tailwind, apps du Core) ; rupture assumée en version majeure.
- **C.** Émettre les deux jeux : **interdit** (cahier des charges : pas de double système, pas de synchronisation).

**Décision : B.** Toutes les variables générées par le thème deviennent `--egen-<chemin>` (ex. `--egen-colors-primary-500`). Migration **scriptée et rejouable** de tous les consommateurs (`scripts/migrate-theme-vars.mjs`), avec liste blanche dérivée du thème (aucune variable tierce — `--cds-*`, locales — n'est touchée) et test de parité contre le golden de DS-1.

---

## ADR-003 — Nom et version du paquet — **Proposée**

Conserver **`@egen-civitas/esm-theme`**, publié en **2.0.0**, comme *couche d'intégration EGEN* (modèle de thème, orchestration, ports) avec TokiForge en dépendance interne. Pas de nouveau paquet (R8, N9) : un renommage imposerait de modifier tous les imports du shell, du styleguide et des apps pour aucun gain fonctionnel.

---

## ADR-004 — Frontière EGEN / TokiForge — **Proposée**

- **TokiForge transforme** : génération/échappement du CSS, couleurs, contrastes, thèmes de composants, versionnage, exports natifs.
- **EGEN modélise et orchestre** : le *document de thème EGEN* (concept propre : light/dark, panels, composants/variantes/états), sources, priorités, surcharges globales et par app, mode et anti-FOUC, abonnements, application et persistance.
- **Règle de revue** : toute fonction qui réimplémente une capacité de TokiForge doit citer, dans la PR, la lacune vérifiée (TOKIFORGE.md) qui la justifie.

---

## ADR-005 — Application, persistance, thème d'environnement — **Proposée**

- **L'application d'un thème est une responsabilité du moteur** (ce paquet), pas du Theme Studio : `apply`, `revert`, `isApplied` (dérivé de l'état du moteur, jamais d'un indicateur local), réhydratation au démarrage avant le premier rendu.
- **Thème d'environnement** : le frontend n'a plus de registry de tenants (refonte du 8 août 2026) ; l'environnement est défini par les URL de thème du déploiement (`window.egenThemeUrls`). Le Studio *exporte* un JSON que l'organisation publie à cet endroit.
- **Palliatif tant qu'aucun backend n'existe** : l'« Appliquer » du Studio est persisté localement (clé versionnée) et réappliqué au démarrage, avec limite documentée (par navigateur, pas par organisation). Un port `ThemeSource` permettra de brancher un stockage serveur sans toucher au moteur.
- Constat sur l'existant : l'« Appliquer » actuel du Studio est **volatil** (perdu au rechargement) et son indicateur « appliqué » est recalculé localement à chaque montage. DS-5 le corrige à la source.

---

## ADR-006 — Suppression radicale de l'ancien moteur — **Acceptée (sans délai)**

**Décision du propriétaire : l'ancien moteur fait main est éradiqué sans attendre.** Il n'est conservé que le temps strictement nécessaire à produire le golden de DS-1 puis à migrer les consommateurs, dans cette même branche. Un seul système (cahier des charges §0) : en **DS-8**, suppression du chargeur, de l'aplatisseur, de l'injecteur, de la fusion et du singleton actuels une fois les consommateurs migrés et la parité prouvée ; pas d'alias de compatibilité prolongé ; changeset **major**. Le format `theme.default.json` reste lisible (migration de format seulement si DS-2 la justifie).

---

## ADR-008 — Éradication complète de l'ancien système — **Acceptée (exécutée)**

Supprimé du dépôt (cahier des charges §27) : aplatisseur, injecteur, chargeur historique, schéma, fusion, singleton d'origine ; **thème de secours codé en dur** ; **couche d'alias SCSS historiques** (`$ui-01`, `$text-02`, `$brand-primary-*`… couleurs Carbon figées) ; **mixins et variables `brand-01/02/03`** (teal codé en dur) et leur réglage de configuration `Brand color #1/#2/#3` (`setupBranding`) ; **tous les replis hexadécimaux** `var(--egen-…, #hex)` ; clés héritées du mock Storybook.
Conséquence assumée : sans thème chargé, il n'y a plus de couleurs de repli — le défaut est signalé (`status: 'error'`), jamais masqué. Storybook charge désormais le thème par défaut (option `themeDocuments`).
Garde-fou : `consumers.test.ts` échoue si l'un de ces éléments réapparaît dans un fichier suivi par git. Scripts rejouables sur les dépôts consommateurs : `scripts/migrate-theme-vars.mjs`, `scripts/migrate-legacy-style-aliases.mjs`.

---

## ADR-007 — Cibles natives — **Proposée** (à vérifier en DS-4)

Le chantier multiplateforme (R1, R4, N1–N5) s'applique : aucun test de plateforme en dehors d'`esm-platform`/`targets.js`, aucune dépendance native. Les exporteurs natifs de TokiForge (iOS/Android/RN) sont une opportunité, hors périmètre tant qu'aucune app n'en a besoin (N9).
