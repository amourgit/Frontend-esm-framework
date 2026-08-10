# `@egen/esm-theme` — Moteur de Thème Dynamique

Système de chargement de thèmes JSON par **priorité**, génération dynamique de variables CSS, résolution **clair/sombre**, **hot-reload**, et **surcharges scopées par application avec priorité**. Conçu pour le framework EGEN (Single-SPA, micro-frontends).

**Principe fondamental : zéro valeur codée en dur dans le framework.** Aucun package (`esm-theme`, `esm-styleguide`, apps) ne déclare de valeur de couleur, de flou, d'ombre, etc. en dur dans son code. Tout provient du JSON de thème, chargé et injecté dynamiquement au runtime. Le code ne fait que consommer des `var(--xxx)` dont les noms sont entièrement dérivés du schéma JSON.

---

## Architecture

```
esm-theme/
├── src/
│   ├── types.ts        — Interfaces TypeScript (ThemeSchema, PanelTokenSet, AppThemeOverride, …)
│   ├── loader.ts        — Fetch parallèle + sélection par priorité
│   ├── flatten.ts        — JSON imbriqué → variables CSS (résolution générique light/dark)
│   ├── inject.ts        — Injection DOM (balise globale + balises scopées par app)
│   ├── deepMerge.ts        — Fusion profonde de schémas (utilisée par les surcharges)
│   ├── engine.ts        — Orchestrateur (ThemeEngine class)
│   ├── singleton.ts        — Instance globale + API fonctionnelle
│   ├── index.ts        — Exports publics
│   └── themes/
│       └── theme.default.json   — Thème par défaut (priority=1)
```

---

## Vocabulaire 100% générique — aucune clé ne nomme un style visuel

Le schéma JSON ne contient **aucune** clé qui présuppose un style visuel particulier (pas de `glass`, `neumorphism`, `material`...). Les clés décrivent une **fonction** (`panel.card.background`, `colors.border.default`), jamais une apparence. C'est la **valeur** posée dans le JSON qui détermine le rendu :

```json
// Thème "glassmorphism"
{ "panel": { "dark": { "card": { "backdropFilter": "blur(20px) saturate(180%)" } } } }

// Thème "flat" — même clé, juste une autre valeur
{ "panel": { "dark": { "card": { "backdropFilter": "none" } } } }
```

Ça permet à n'importe quel thème (glass, flat, material, brutaliste...) de réutiliser exactement le même schéma — y compris les composants de `esm-styleguide`, qui ne savent rien du style visuel actif.

---

## Principe de fonctionnement

1. **Plusieurs fichiers JSON** de thème peuvent coexister (noms libres).
2. Chaque fichier déclare une clé `"priority": <nombre>`.
3. Le moteur charge **tous les fichiers en parallèle**, compare les priorités, et **applique le gagnant** (priorité la plus haute) comme thème global.
4. Le JSON gagnant est aplati récursivement. Toute branche dont les seules clés sont `light`/`dark` est résolue par mode, SANS que "light"/"dark" n'apparaisse dans le nom de variable :
   ```json
   { "panel": { "dark": { "card": { "background": "rgba(15,23,42,0.65)" } } } }
   ```
   devient (actif uniquement quand `<html data-theme="dark">`) :
   ```css
   [data-theme='dark'] :root { --panel-card-background: rgba(15,23,42,0.65); }
   ```
5. Trois blocs sont injectés dans `<style id="egen-theme-vars">` (placée en premier dans `<head>`) : `:root` (valeurs indépendantes du mode), `[data-theme='light']`, `[data-theme='dark']`.
6. Le mode actif est résolu automatiquement (attribut `data-theme` déjà présent → `localStorage` → `prefers-color-scheme` → `defaultMode`), et appliqué via l'attribut `data-theme` sur `<html>`. Changer de mode (`engine.setMode()`) ne nécessite **aucune** ré-injection : les deux jeux de variables sont déjà dans le DOM, seul l'attribut change → instantané, sans flash.

---

## Structure d'un fichier thème JSON

```json
{
  "priority": 10,
  "meta": { "name": "Mon thème personnalisé", "updatedAt": "2026-06-01T00:00:00Z" },
  "colors": { "primary": { "500": "#6366f1" } },
  "panel": {
    "dark": {
      "card": {
        "background": "rgba(15, 23, 42, 0.65)",
        "backdropFilter": "blur(20px) saturate(180%)",
        "border": "1px solid rgba(255, 255, 255, 0.08)",
        "boxShadow": "0 4px 20px rgba(0,0,0,0.40)"
      }
    },
    "light": {
      "card": {
        "background": "rgba(255, 255, 255, 0.60)",
        "backdropFilter": "blur(20px) saturate(180%)",
        "border": "1px solid rgba(255, 255, 255, 0.72)",
        "boxShadow": "0 4px 20px rgba(0,0,0,0.07)"
      }
    }
  }
}
```

> **Règle pour le thème global** : le fichier avec `priority` le plus élevé prend la main (winner-take-all). Le thème par défaut EGEN a `priority: 1`.
>
> Pour une **surcharge partielle scopée à une app** (sans tout redéclarer), voir la section suivante — c'est la méthode recommandée pour toute personnalisation qui n'a pas besoin d'être globale.

---

## Surcharger le thème pour une application précise (avec priorité)

Une microfrontend peut surcharger uniquement les clés qui l'intéressent, sans dupliquer tout le schéma, et sans affecter les autres apps :

```ts
import { applyAppThemeOverride } from '@egen/esm-theme';

// Dans le run.ts (ou au montage) de l'app "egen-academique"
applyAppThemeOverride(
  'egen-academique',
  {
    colors: { primary: { '500': '#16a34a', '600': '#15803d' } },
    panel: { dark: { card: { boxShadow: 'none' } } },
  },
  { priority: 5 },
);
```

**Pré-requis côté app** : le conteneur racine de l'app doit porter l'attribut `data-egen-app="egen-academique"` (même valeur que le `scope` utilisé ci-dessus) :

```html
<div id="egen-academique-root" data-egen-app="egen-academique">...</div>
```

Le moteur injecte alors une balise `<style id="egen-theme-override-egen-academique">` scopée à `[data-egen-app="egen-academique"]`, placée **après** la balise globale dans `<head>` — donc elle gagne la cascade pour les variables qu'elle redéclare, et hérite du thème global pour tout le reste.

**Plusieurs surcharges, plusieurs priorités, fusion en profondeur (pas de winner-take-all)** :

```ts
// Surcharge "tenant" (priorité basse)
applyAppThemeOverride('egen-academique', { colors: { primary: { '500': '#16a34a' } } }, { id: 'tenant', priority: 5 });

// Préférence utilisateur (priorité plus haute → gagne en cas de conflit)
applyAppThemeOverride('egen-academique', { colors: { primary: { '500': '#0ea5e9' } } }, { id: 'user-pref', priority: 10 });

// Retirer une surcharge précise
removeAppThemeOverride('egen-academique', 'user-pref');

// Retirer tout le scope
removeAppThemeOverride('egen-academique');
```

Chaque scope maintient sa propre liste de surcharges ; elles sont fusionnées (deep merge) par priorité croissante avant flatten + injection — la dernière (priorité la plus haute) gagne clé par clé, le reste est conservé.

---

## Usage dans le shell (`esm-app-shell`)

Le moteur est initialisé automatiquement dans `run.ts`. Pour ajouter des thèmes custom au niveau global :

```html
<!-- index.ejs — avant initializeSpa() -->
<script>
  window.egenThemeUrls = [
    '/api/tenant/mon-tenant/theme.json',
    '/themes/override.json'
  ];
</script>
```

---

## API TypeScript

```ts
import { setupThemeEngine, getThemeEngine, reloadTheme, setThemeMode, applyAppThemeOverride } from '@egen/esm-theme';

// Initialisation (shell uniquement)
await setupThemeEngine({
  themeUrls: ['/themes/custom.json'],
  pollIntervalMs: 5000,       // hot-reload toutes les 5s (0 = désactivé)
  defaultMode: 'dark',        // mode si aucune préférence détectée
  onApplied: (theme, cssVars) => console.log('Appliqué :', theme.schema.meta?.name),
});

// Depuis n'importe quelle app
const engine = getThemeEngine();
const state = engine.getState(); // { status, activeTheme, mode, cssVarsCount, activeOverrideScopes, … }

// Abonnement réactif
const unsubscribe = engine.subscribe((state) => {
  console.log('Thème actif :', state.activeTheme?.schema.meta?.name, '— mode:', state.mode);
});

// Mode clair/sombre
setThemeMode('light');

// Surcharge scopée par app (voir section dédiée plus haut)
applyAppThemeOverride('mon-app', { colors: { primary: { '500': '#16a34a' } } }, { priority: 5 });

// Rechargement manuel du thème global (après upload d'un fichier custom par exemple)
await reloadTheme();
```

---

## Usage SCSS dans les composants

```scss
@use '@egen/esm-styleguide/src/panel' as panel;

.ma-card {
  @include panel.panel-surface('card');
  padding: 1.5rem;
}

.mon-modal {
  @include panel.panel-surface('modal');
}

.ma-sidebar {
  @include panel.panel-sidebar;
}
```

Ou directement avec les variables CSS (fonctionne partout, même en CSS pur — plus besoin de préciser le mode, il est résolu automatiquement) :

```css
.mon-composant {
  background:      var(--panel-card-background);
  backdrop-filter: var(--panel-card-backdrop-filter);
  border:          var(--panel-card-border);
  box-shadow:      var(--panel-card-box-shadow);
  border-radius:   var(--border-radius-xl);
  transition:      var(--transitions-glass);
}
```

**Important** : `esm-styleguide` ne déclare **aucune** valeur de fallback statique pour ces variables. Si le moteur n'a pas encore injecté ses balises `<style>` au premier rendu, les `var(--xxx)` sont simplement non résolues (valeur initiale du navigateur). Voir "Anti-FOUC" ci-dessous.

---

## Variables CSS générées (exemples réels, dérivés du thème par défaut)

| Variable CSS | Origine JSON | Portée |
|---|---|---|
| `--panel-card-background` | `panel.{light,dark}.card.background` | résolue par `data-theme` |
| `--panel-modal-backdrop-filter` | `panel.{light,dark}.modal.backdropFilter` | résolue par `data-theme` |
| `--colors-surface-foreground` | `colors.surface.{light,dark}.foreground` | résolue par `data-theme` |
| `--colors-border-default` | `colors.border.{light,dark}.default` | résolue par `data-theme` |
| `--colors-primary-500` | `colors.primary.500` | commune (`:root`) |
| `--border-radius-xl` | `borderRadius.xl` | commune |
| `--transitions-glass` | `transitions.glass` | commune |
| `--shadows-glow` | `shadows.glow` | commune |
| `--layout-sidebar-width` | `layout.sidebar.width` | commune |
| `--z-index-modal` | `zIndex.modal` | commune |

> Ces noms sont générés mécaniquement par `flattenToCssVars()` — aucune table de correspondance manuelle n'existe ni ne doit être réintroduite. Pour connaître le set exact disponible, consulter `theme.default.json` et `types.ts` (`PanelTokenSet`, `SurfaceTokens`, `BorderTokens`), ou inspecter `engine.getState()` au runtime.

---

## Ajouter de nouvelles clés de thème (composants de base manquants)

Toute app ou tout package peut introduire de nouvelles clés sans toucher au moteur :

1. Ajouter la clé dans son propre JSON de thème (ou surcharge d'app).
2. La variable CSS correspondante est générée automatiquement au prochain `apply()`/`applyAppOverride()` — aucune modification de `flatten.ts` n'est nécessaire, le moteur est entièrement générique.
3. (Optionnel, recommandé) Étendre `PanelTokenSet`/`ThemeSchema` dans `types.ts` si la clé doit être documentée/typée pour tout l'écosystème EGEN.

---

## Sécurité

Le moteur applique une défense en profondeur à 2 niveaux, exécutée à chaque chargement (boot + chaque tick de hot-reload) :

1. **Validation structurelle (`schema.ts`, zod)** — avant même d'aplatir un fichier, sa structure est validée : `priority` doit être un nombre fini, et l'arborescence entière doit être composée uniquement de types JSON plats (string/number/boolean/null/array/object), avec des garde-fous anti-abus (profondeur max 12, max 500 clés par niveau, chaînes de 4000 caractères max). Le schéma reste **ouvert** — aucune clé précise n'est imposée — seule la *forme* est vérifiée. Un fichier invalide est **rejeté et ignoré** (les autres `themeUrls` valides continuent de fonctionner), avec le détail des erreurs en console.

2. **Validation des valeurs CSS (`flatten.ts`, liste blanche)** — chaque valeur-feuille est ensuite vérifiée avant sérialisation : caractères autorisés stricts (aucun moyen de fermer une déclaration `;`, un bloc `{ }`, ou d'ouvrir un commentaire `/*`), longueur max (1000 caractères), et tout usage de `url(...)` doit pointer vers `https://` ou un chemin relatif au site (bloque `javascript:`, `data:text/html`, et toute tentative d'exfiltration). **Politique de rejet, pas de nettoyage** : une valeur refusée est entièrement omise (avec un warning explicite indiquant la variable et la raison), plutôt que d'être mutée silencieusement vers un résultat imprévisible.

Ne chargez néanmoins que des URLs de confiance dans `themeUrls` / `applyAppThemeOverride` — ces validations empêchent l'injection CSS structurelle, pas un thème délibérément trompeur visuellement (ex: couleurs qui rendent un bouton "Annuler" illisible).

---

## Résilience

- **Thème de secours embarqué** : si *aucun* fichier de `themeUrls` ne charge ou ne valide, le moteur n'échoue pas silencieusement — il applique un thème minimal embarqué dans le code (`EMBEDDED_FALLBACK_THEME`, zéro requête réseau) et expose `state.usingFallback === true` pour que l'app puisse afficher un avertissement. L'application reste donc toujours lisible/navigable, jamais totalement non stylée.
- **Égalité de priorité déterministe** : en cas d'égalité entre deux fichiers, le départage se fait par ordre alphabétique d'URL (toujours le même résultat, indépendamment de l'ordre de déclaration dans `themeUrls` ou de l'ordre de réponse réseau). En développement, une égalité lève une erreur explicite (configuration ambiguë à corriger) plutôt qu'un simple warning silencieux ; en production, elle est journalisée et résolue automatiquement.
- **Polling de hot-reload optimisé** : à chaque tick, un hash léger du contenu brut de chaque URL est comparé au précédent *avant* tout parsing JSON/flatten/injection DOM. Si rien n'a changé (cas très majoritaire), le pipeline coûteux est entièrement court-circuité — seul le coût réseau du fetch demeure.

---

## Anti-FOUC (flash de contenu non stylé)

Comme aucune valeur n'est plus dupliquée en dur dans `esm-styleguide`, le rendu dépend entièrement de l'exécution du moteur JS. Pour l'environnement shell, il est recommandé d'ajouter un script bloquant minimal dans `<head>` (avant tout CSS applicatif) qui pose immédiatement `data-theme` sur `<html>` à partir de `localStorage`/`prefers-color-scheme`, et de garder `<body>` masqué (`visibility:hidden`) jusqu'à ce que `setupThemeEngine()` ait résolu sa première application — cf. `run.ts`.

---

## Hot-reload en développement

En mode `development`, le moteur peut poller les URLs de thème (`pollIntervalMs`). Si un fichier JSON change (ou si un fichier avec une priorité plus haute est ajouté), les variables CSS sont mises à jour **immédiatement** sans rechargement de page.

```
[egen/esm-theme] 🔥 Changement de thème détecté — rechargement à chaud
[egen/esm-theme] ✅ Thème appliqué : "Mon thème custom" (247 vars CSS)
```
