---
"@egen-civitas/esm-styleguide": patch
---

Rend le remplissage en hauteur de `#egen-scroll-region` opt-in : la règle
`#egen-apps-container > div:has(> *) { min-height: 100% }` forçait chaque
conteneur single-spa non vide — y compris les apps globales montées en
permanence (`route: true`) qui rendent un contenu vide ou non bloquant — à
occuper 100 % de la hauteur de la zone, ce qui doublait le débordement.
Désormais, seul un conteneur dont l'enfant racine porte `data-egen-fill`
reçoit `height: 100%` ; les autres gardent une hauteur automatique.
