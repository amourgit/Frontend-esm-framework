---
'@egen-civitas/esm-styleguide': patch
'@egen-civitas/esm-framework': patch
---

`@egen-civitas/esm-framework/mock` (et `mock-jest`) ré-exportent les composants de base du module style (`Button`, `Tile`, `Dialog`, `Table`…) : les tests des apps rendent les vrais composants (Tailwind, sans effet de bord). Pour cela, `@egen-civitas/esm-styleguide` expose un sous-chemin `./ui`.
