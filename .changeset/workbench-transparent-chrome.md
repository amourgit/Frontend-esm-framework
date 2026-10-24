---
'@egen-civitas/esm-styleguide': patch
'@egen-civitas/esm-app-shell': patch
---

Plan de travail : rails transparents, cartes assombries et séparées par un écart.

- Les rails gauche et droit sont toujours transparents (plus de fond ni de flou) et sans bordure : collés à la TopBar, ils se fondent avec elle sans aucune discontinuité.
- Les zones et la carte centrale reçoivent un léger assombrissement de fond (`--egen-workbench-card-bg`, plus faible en thème clair) ; la bordure des zones disparaît.
- Les cartes voisines sont séparées par un écart visible (`--egen-workbench-gap`, 6 px par défaut) : il matérialise la frontière, et la poignée de redimensionnement y est centrée. Elle s'illumine au survol, au focus et pendant le glissement, et la frontière suit le pointeur sans saut à la prise.
- Routes publiques, écrans de moins de 768 px et impression : la carte centrale reste plein cadre, sans teinte.
