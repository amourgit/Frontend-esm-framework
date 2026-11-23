---
"@egen-civitas/esm-styleguide": patch
---

`SiteTabbedLayout` : hauteur `h-[calc(100vh-120px)]` + marges verticales
remplacées par `h-full my-0`. Le calcul viewport ne correspondait pas à la
hauteur réelle de `#egen-scroll-region` et produisait un débordement
(~18 px) ; la hauteur vient désormais de la chaîne `data-egen-fill`.
