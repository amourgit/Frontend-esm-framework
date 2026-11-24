---
'@egen-civitas/esm-app-shell': patch
---

Corrige la boucle « ResizeObserver loop completed with undelivered notifications » : la publication des hauteurs de barres (`--egen-navbar-height`, `--egen-footer-height`) est différée à la frame suivante via `requestAnimationFrame` au lieu d'écrire le DOM dans le callback de l'observer.
