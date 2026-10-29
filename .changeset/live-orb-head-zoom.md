---
'@egen-civitas/esm-styleguide': patch
'@egen-civitas/esm-app-shell': patch
---

`LiveOrb` : la tête est agrandie d'environ 9 % dans sa boîte (nouvelle constante exportée `HEAD_ZOOM = 1.09`). Le zoom est appliqué à toute la scène (caméra du shader, et conteneur du repli sans GPU) : crâne, yeux, trait, oreillettes et halo grandissent du même facteur, donc les proportions mesurées sur la mascotte restent identiques. Le halo néon et la rotation maximale de la tête restent dans le cadre.
