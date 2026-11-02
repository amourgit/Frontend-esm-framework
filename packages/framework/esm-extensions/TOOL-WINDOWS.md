# Intégrer une app aux rails et zones du shell

Toute app (déployée avec le projet, chargée depuis un dépôt distant, ou un projet open source monté par fédération) peut
ajouter des options aux rails ; un clic ouvre la zone associée et charge le composant de l'app.

| Je veux…                          | Slot (`routes.json`)                         | Zone qui s'ouvre |
| --------------------------------- | -------------------------------------------- | ---------------- |
| une option en haut du rail gauche | `shell-rail-left-slot`                       | gauche           |
| une option en bas du rail gauche  | `shell-rail-bottom-slot`                     | bas              |
| une option en haut du rail droit  | `shell-rail-right-slot`                      | droite           |
| une option en bas du rail droit   | `shell-rail-bottom-slot` + `"rail": "right"` | bas              |

## Déclaration (`routes.json`)

```json
{
  "extensions": [
    {
      "name": "mon-app-panneau",
      "slot": "shell-rail-left-slot",
      "component": "monPanneau",
      "meta": {
        "title": "Mon app",
        "titleKey": "monApp",
        "iconUrl": "https://cdn.exemple.org/mon-app.svg",
        "order": 20,
        "global": true
      }
    }
  ]
}
```

`meta` : `title` (obligatoire), `titleKey` (traduction), `icon` (nom lucide de la liste blanche) **ou** `iconUrl`
(`https://…`, `/…` ou `data:image/…`, monochrome), `order`, `global`, `rail` (zone basse).

- **`global: true`** : l'option reste visible quelle que soit l'app active. Sans lui (rails gauche et bas), elle n'apparaît que
  quand une page de l'app est montée. Une app **sans page** (extensions seules) doit donc déclarer `global: true`.
- Le composant est chargé à l'ouverture de la zone ; il charge lui-même ses données.
- Une `meta` invalide n'est jamais affichée : un avertissement précis est écrit dans la console à l'enregistrement.

## Compartiments des zones gauche et droite

Une zone latérale est une pile verticale de **compartiments** : leurs hauteurs, en % de la zone, totalisent toujours 100 (jamais
de débordement), chacun défile en interne et l'utilisateur les redimensionne librement (les autres s'ajustent selon leurs
minimum et maximum). Le fond sombre est porté par les compartiments, la zone est transparente.

- **Compartiment par défaut** (`meta.compartment` absent ou `"default"`) : un seul par zone, partagé par les options du rail
  (une seule y est affichée à la fois). Ses dimensions sont fixées par le shell et ne sont pas modifiables par les apps.
- **Compartiment propre** : l'app demande le sien ; il s'ouvre/se ferme indépendamment du compartiment par défaut.

```json
"meta": {
  "title": "Discussion",
  "global": true,
  "compartment": { "height": 40, "minHeight": 20, "maxHeight": 70 }
}
```

`height` (hauteur de base à l'ouverture), `minHeight` et `maxHeight` sont en % de la zone ; les valeurs omises valent
respectivement 40, 15 et 100 (`DEFAULT_COMPARTMENT_HEIGHTS`). Sans effet dans la zone basse (avertissement à l'enregistrement).
`closeToolWindow(anchor)` replie toute la zone, `closeToolWindow(anchor, name)` ne ferme que cette fenêtre.

## Sans `routes.json` (par le code)

```ts
import { registerToolWindow } from '@egen-civitas/esm-framework';

registerToolWindow({
  moduleName: '@mon-org/mon-app', // nom du module dans l'importmap / la fédération
  name: 'mon-app-panneau',
  anchor: 'left', // 'left' | 'right' | 'bottom'
  meta: { title: 'Mon app', iconUrl: '/mon-app/icone.svg', global: true },
  load: () => import('./panneau.lifecycle'),
});
```

## Piloter depuis l'app

`openToolWindow(anchor, name)`, `toggleToolWindow(anchor, name)`, `closeToolWindow(anchor)`, `setToolWindowBadge(name, n)` (pastille) et
`setZoneSize(anchor, px)` sont exportés par `@egen-civitas/esm-framework`.
