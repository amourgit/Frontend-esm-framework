# @egen-civitas/esm-theme

Runtime de thème d'EGEN : il applique à l'écran le thème que le backend du Core lui donne.

- **Contrat de thème** au format Tweakcn : `{ light, dark }`, deux objets plats de clés « shadcn » (couleurs, polices, rayon, ombres, espacements). Validation stricte (aucune injection CSS), contrastes WCAG, diff, forme canonique, projection DTCG sans perte.
- **Variables CSS** sur `:root` et **mode sombre par la classe `.dark`** (convention shadcn / Tailwind v4).
- **Le navigateur ne parle qu'au backend du Core, à la même origine** : `GET /api/theme`. Aucune URL absolue n'est acceptée. L'identité (tenant, utilisateur) vient de la session côté serveur.
- **Le shell démarre toujours** : un thème de repli embarqué est appliqué immédiatement, puis remplacé par celui du backend s'il répond à temps et que sa réponse est valide.

## Utilisation

```ts
import { setupTheme, getTheme, toggleThemeMode } from '@egen-civitas/esm-theme';

// Au démarrage du shell, une seule fois
await setupTheme({ app: 'esm-app-shell' });

// Dans n'importe quelle application
toggleThemeMode();                         // bascule clair/sombre (mémorisé dans localStorage, clé « egen-theme-mode »)
getTheme().setOverride('zone', { light: { primary: 'oklch(0.55 0.2 145)' } }, { scope: '[data-app="x"]' });
```

Le module doit être partagé en **singleton** entre les micro-frontends (`@egen-civitas/esm-theme`, `singleton: true`).

## API

| Élément | Rôle |
|---|---|
| `setupTheme(options?)` | Initialise le thème global. Ne lève jamais. Options : `app`, `endpoint` (chemin relatif de même origine, défaut `/api/theme`), `defaultMode` (défaut `dark`), `modeStorageKey` (`null` = pas de mémorisation), `timeoutMs` (défaut 3000), `reportApplied` (défaut `true`), `runtime` |
| `getTheme()` | Instance de `ThemeStylesRuntime` (lève si `setupTheme` n'a pas été appelé) |
| `getThemeMode()`, `setThemeMode(mode)`, `toggleThemeMode()` | Mode courant (`null` si non initialisé), changement et bascule — mémorisés |
| `reloadTheme()` | Redemande le thème avec l'`ETag` connu ; `true` si un nouveau thème a été appliqué |
| `ThemeStylesRuntime` | Applique un thème, gère le mode, les surcharges nommées (globales ou limitées à une zone) et les abonnements |
| `fetchTheme`, `reportThemeApplied` | Client du backend (`GET /api/theme`, `POST /api/theme/applied`) |
| `defaultThemeStyles`, `validateThemeStyles`, `themeStylesToCss`, `themeContrastReport`, `diffThemeStyles`, `canonicalizeThemeStyles`… | Contrat de thème |
| `themeStylesToDtcg`, `dtcgToThemeStyles` | Projection DTCG |

## Licences

Code de tiers (TokiForge, MIT ; Tweakcn, Apache-2.0) : voir `NOTICE`, `LICENSE-MIT-TOKIFORGE`, `LICENSE-APACHE-2.0`.
