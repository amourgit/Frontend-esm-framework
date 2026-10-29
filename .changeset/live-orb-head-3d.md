---
'@egen-civitas/esm-styleguide': minor
'@egen-civitas/esm-app-shell': patch
---

`LiveOrb` devient une **tête 3D de type Baymax** au lieu d'une sphère : crâne large et arrondi, deux yeux ovales reliés par un trait fin, et deux oreillettes de casque avec anneau lumineux vert → jaune. Les proportions ont été mesurées sur la mascotte EGEN (rapport largeur/hauteur de la tête ≈ 1 : 0,74, yeux ≈ 3,7 fois leur largeur d'écart, trait ≈ 15 % de la hauteur d'un œil).

- **Rendu** : un seul fragment shader raymarché (scène SDF : crâne ellipsoïdal, oreillettes à cuvette creuse + anneau néon, raccord doux). Éclairage fixe dans le monde (ombres douces, occlusion ambiante, reflet), halo néon, silhouette anti-crénelée.
- **La tête pivote** vers le pointeur (lacet, tangage, léger roulis) avec un ressort amorti pour un mouvement de cou naturel, et un très léger balancement au repos. Les yeux, le trait et les oreilles sont solidaires du crâne : ils épousent sa courbure et se déforment en perspective quand il tourne. Le clignement écrase les yeux, le trait reste.
- **Suivi du pointeur** par angle (et non plus saturé à quelques pixels du centre), donc fluide même pour un avatar de 38 px ; retour à la pose neutre quand le pointeur quitte la fenêtre.
- **Repli sans GPU** refait dans le même design (tête, yeux, trait, oreilles à dégradé néon) avec un léger parallaxe vers le pointeur ; il ne dépend plus d'aucune classe Tailwind.
- **Robustesse** : la boucle de rendu se met en pause hors écran / onglet masqué, et une perte de contexte WebGL bascule sur le repli.
- **API rétro-compatible** : `variant` (`white`, `black`, `webgl`, `custom`), `color`, `eyeColor`, `colors`, `interactive`, `blink`, `size`, `className` sont inchangés, donc tous les usages existants (avec leurs variantes) sont mis à jour sans modification. Nouveautés : `ears` (défaut `true`), `earColors` (deux couleurs, défaut vert → jaune ; la matière `webgl` réutilise sa palette), `label` (nom accessible, défaut `Assistant avatar`). `createLiveOrb` accepte les mêmes options ; `headRotation` est exporté depuis le module.

Le shell est republié pour embarquer cette version du styleguide.
