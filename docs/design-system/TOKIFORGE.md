# TokiForge — ce qu'il fournit (vérifié dans son code)

> Source : dépôt `TokiForge/tokiforge`, paquet `@tokiforge/core` **2.4.0**, lu en novembre 2026. Les capacités ci-dessous sont celles du code, pas de la documentation marketing.

## Licence (point bloquant à trancher — voir ADR-001)

`@tokiforge/core` et `@tokiforge/react` sont publiés sous **AGPL-3.0**. Le framework EGEN est sous **MPL-2.0**. L'AGPL impose des obligations de redistribution du code source de l'œuvre combinée, y compris pour l'usage en réseau. Aucune phase d'adoption de la dépendance (DS-3) ne démarre avant décision.

## Surface utile

| Entrée | Contenu | Pertinence EGEN |
|---|---|---|
| `@tokiforge/core/runtime` (browser-safe, léger) | `TokenExporter` (tokens → CSS/SCSS/JS/TS, `selector`, `prefix`, `layer`, échappement des valeurs, sélecteur validé), `ThemeRuntime` (applique un thème nommé dans un `<style id="tokiforge-theme">`), `ThemeController` (thème courant + persistance `localStorage` + abonnés + thème système), `ColorUtils` (hex/rgb/hsl/**oklch**), `AccessibilityUtils` (contraste WCAG), classes d'erreurs typées | Transformation et sécurité du CSS, couleurs, accessibilité |
| `@tokiforge/core/tools` (browser-safe, hors runtime) | `ComponentTheming` (thèmes de composants), `BrandManager`, `SemanticTokenManager`, `TokenVersioning`, `ResponsiveTokens`, `SSRUtils`, exporteurs iOS/Android/React Native, `TokenRegistry`… | Composants/états, multi-marques, versions, **cibles natives** (cohérent avec le chantier multiplateforme) |
| `@tokiforge/core/node` | analyse, parsing de fichiers (YAML/JSON), CI | Outillage de build uniquement |

## Ce que TokiForge ne fait pas (vérifié) — donc ce qui reste à EGEN

| Besoin EGEN | Constat dans TokiForge | Conséquence |
|---|---|---|
| Plusieurs thèmes **superposés par priorité** (défaut + marque + surcharge) | `ThemeRuntime` applique **un seul** thème nommé ; la liste des thèmes est **figée à la construction** | La composition et l'ajout dynamique de thèmes (Studio, `egenThemeUrls`) restent du ressort d'EGEN |
| **Surcharges par application** (scope) et **globales** avec id | un seul `<style id="tokiforge-theme">`, un seul sélecteur à la fois | EGEN orchestre les scopes ; TokiForge produit le CSS de chaque bloc (`exportCSS` accepte `selector`) |
| Clair/sombre **dans un même document** | clair et sombre sont **deux thèmes distincts** ; `exportLightDarkCSS` produit du `light-dark()` CSS | EGEN garde son modèle `light/dark` et génère 3 blocs (`:root`, `[data-theme=light]`, `[data-theme=dark]`) via `exportCSS` |
| Variables **sans préfixe** (`--colors-primary-500`) | le nom est toujours `--${prefix}-${chemin}` : préfixe vide ⇒ `---colors-…` | Contrat de nommage à arbitrer (ADR-002) |
| Format de feuille | les valeurs doivent être des nœuds `{ value: … }` | Adaptateur EGEN → TokiForge nécessaire |
| Rechargement à chaud, sources par URL | absent | reste EGEN (développement/déploiement) |

## Ce qui est directement réutilisable (à ne PAS réécrire — cahier des charges §11)

Génération et échappement du CSS, validation de sélecteur, conversions et espaces colorimétriques, contrastes, thèmes de composants (`ComponentTheming`), versionnage de tokens, export natif, SSR/critical CSS, erreurs typées.

## Ce que l'intégration délègue effectivement à TokiForge (état de la branche)

| Responsabilité | Assurée par |
|---|---|
| Sélection du mode (`light`/`dark`), persistance (`egen-theme-mode`), abonnements, application du thème | `ThemeController` + `ThemeRuntime` |
| Génération et échappement du CSS, validation du sélecteur, nommage `--egen-…` | `TokenExporter` |
| Injection du thème de base (`<style id="tokiforge-theme">`) | `ThemeRuntime` |

**Reste à EGEN (aucun équivalent TokiForge)** : chargement des sources du déploiement et choix par priorité, fusion document-level des surcharges, surcharges par application (`[data-egen-app]`), application persistante, liste blanche des valeurs CSS (TokiForge n'échappe que `\n` et `<`), attribut `data-theme` lu par les feuilles de style.
Aucun thème n'est codé en dur dans le code : le thème par défaut (`theme.default.json`) est la seule source de vérité, et son absence est une **erreur signalée** (état `error`, `onError`), pas un repli silencieux.
