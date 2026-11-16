---
'@egen-civitas/esm-theme': major
'@egen-civitas/esm-styleguide': major
'@egen-civitas/tailwind-preset': major
'@egen-civitas/esm-app-shell': minor
---

Design System EGEN sur TokiForge — remplacement de l'ancien moteur de thème fait main.

**Rupture (variables CSS).** Toutes les variables générées par le thème portent désormais le préfixe `--egen-` :
`--colors-primary-500` devient `--egen-colors-primary-500`, `--border-radius-md` devient `--egen-border-radius-md`, etc.
Migration automatique et rejouable des consommateurs : `node scripts/migrate-theme-vars.mjs <racine> --write`.

**`@egen-civitas/esm-theme` 2.0.** Nouveau cœur : modèle de thème EGEN, génération du CSS par `@tokiforge/core` (licence AGPL-3.0),
orchestration EGEN (sources, priorités, surcharges globales et par application, mode, hot-reload).
API retirées : `flattenToCssVars` (→ `themeToCssVars`), `validateThemeSchema` (→ `validateThemeDocument`),
`mergeBySortedPriority` (→ `mergeByPriority`), `injectScopedCssVars`, `loadHighestPriorityTheme`, types `ThemeSchema`/`AppThemeOverride`
(→ `ThemeDocument`/`ThemeOverride`) ; `LoadedTheme.schema` devient `LoadedTheme.document`.
Le mode, sa persistance, les abonnements et l'injection du thème de base sont délégués à `ThemeController`/`ThemeRuntime` de TokiForge ; le thème de secours codé en dur est supprimé (`usingFallback` retiré de l'état, état `error` à la place).
Ajouts : option `themeDocuments` (thèmes en ligne), application persistante (`applyGlobalThemeOverride(doc, { persist: true })`, réappliquée au démarrage),
`isGlobalThemeOverrideApplied`, `ThemeValidationError`, tokens de composants (`componentVar`, cascade variante/état).
Durcissement : commentaires CSS refusés dans les valeurs, clé `value` réservée.

**`@egen-civitas/esm-styleguide` (rupture).** Suppression de la couche d'alias historiques : variables SCSS `$ui-01`, `$text-02`, `$interactive-01`,
`$brand-primary-*`… (utiliser `var(--egen-colors-…)`), mixins `brand-01/02/03` et variables `--brand-01/02/03`, réglage de configuration
`Brand color #1/#2/#3`, et **tous les replis hexadécimaux** des variables du thème. Migration : `node scripts/migrate-legacy-style-aliases.mjs <racine> --write`.
Sans thème chargé, il n'y a plus de couleur de repli (le défaut est signalé, pas masqué) ; Storybook charge le thème par défaut.

**`@egen-civitas/esm-app-shell`.** Adaptation à `LoadedTheme.document` (journal de démarrage).
