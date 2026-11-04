# Ajouter un composant au StaggeredMenuPanel

Le panneau latéral animé (`StaggeredMenuPanel`, `@egen-civitas/esm-styleguide`) accepte des **composants libres** posés
par les apps, de la même façon que les rails du shell (voir `TOOL-WINDOWS.md`) : une extension sur un slot, une `meta`
qui décrit où et comment l'afficher. Le panneau ne connaît pas les apps ; il ne fait que lire le slot.

## Déclaration (`routes.json`)

```json
{
  "extensions": [
    {
      "name": "annuaire-raccourcis",
      "slot": "staggered-menu-slot",
      "component": "raccourcisMenu",
      "meta": {
        "title": "Raccourcis",
        "titleKey": "shortcuts",
        "area": "content",
        "order": 10,
        "priority": 5,
        "global": false,
        "showTitle": true
      }
    }
  ]
}
```

| `meta`      | Rôle                                                                                                            | Défaut                 |
| ----------- | --------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `title`     | **Obligatoire.** Nom accessible de la section ; intitulé visible avec `showTitle`.                              | —                      |
| `titleKey`  | Clé de traduction du titre, cherchée dans le module de l'app.                                                   | —                      |
| `area`      | Zone du panneau : `top` (avant les liens), `content` (après les liens), `bottom` (pied de panneau).             | `content`              |
| `order`     | Position dans la zone, ordre croissant.                                                                         | ordre d'enregistrement |
| `priority`  | Importance (plus grand = plus important) : départage deux `order` égaux et décide qui reste si `maxExtensions`. | `0`                    |
| `global`    | `true` : visible quelle que soit l'app active. Sinon : seulement quand une page de l'app est montée.            | `false`                |
| `showTitle` | Affiche `title` au-dessus du composant. Sinon le composant est entièrement libre.                               | `false`                |

Une `meta` invalide n'est jamais affichée : un avertissement précis est écrit dans la console à l'enregistrement.

> Une app **sans page** (extensions seules) doit déclarer `global: true`, sinon son entrée n'apparaît jamais.

### Ordre d'affichage

Les entrées sont rangées par **zone** (`top`, `content`, `bottom`), puis `order` croissant, puis `priority` décroissante,
puis ordre d'enregistrement. Disposition du panneau :

```
[ top ]  liste des liens  [ content ]  liens sociaux  [ bottom ]
```

## Sans `routes.json` (par le code)

```ts
import { registerStaggeredMenuEntry } from '@egen-civitas/esm-framework';

registerStaggeredMenuEntry({
  moduleName: '@mon-org/mon-app', // nom du module dans l'importmap / la fédération
  name: 'mon-app-menu',
  meta: { title: 'Mon app', area: 'bottom', global: true, priority: 10 },
  load: () => import('./menu.lifecycle'),
});
```

Retourne `false` (et avertit) si la `meta` est invalide.

## Côté composant

Le composant reçoit en props :

```ts
interface StaggeredMenuExtensionState {
  closeMenu: () => void; // referme le panneau (ex. après un clic sur un lien)
  position: 'left' | 'right';
  isOpen: boolean;
}
```

- Le contenu est **chargé à la première ouverture** du panneau, puis conservé monté : le composant charge lui-même ses
  données.
- Un clic dans un menu, une liste ou une boîte de dialogue ouverts dans un portail (`role="menu"`, `"listbox"`,
  `"dialog"`, popper Radix) **ne ferme pas** le panneau. Pour tout autre portail, poser `data-staggered-menu-keep-open`
  sur son conteneur.
- Fermé, le panneau est `inert` : aucun focus clavier ni lecteur d'écran sur ses composants.

## Côté panneau

```tsx
<StaggeredMenuPanel
  isOpen={open}
  onClose={() => setOpen(false)}
  items={items}
  maxExtensions={4} // optionnel : garde les 4 entrées les plus prioritaires
  extensionSlot="mon-panneau" // optionnel : slot dédié (les apps le visent avec `slot` / `registerStaggeredMenuEntry({ slot })`)
/>
```

`extensionSlot={false}` désactive les extensions. Par défaut, tous les panneaux partagent `staggered-menu-slot`.
