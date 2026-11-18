---
'@egen-civitas/esm-styleguide': patch
---

`Button`, `IconButton`, `Link`, `Input`, `TextInput` et `Badge` transmettent maintenant leur `ref` (`forwardRef`). Sous React 18, les composants fonction ignorent `ref` : sans cela, les composants Radix en `asChild` (infobulle de `IconButton`, déclencheurs de menu ou de dialogue) ne pouvaient pas s'ancrer sur le bouton, et les `ref` posées sur ces composants étaient perdues.
