---
'@egen-civitas/egen': minor
'@egen-civitas/esm-globals': patch
'@egen-civitas/esm-framework': patch
---

`egen develop` : hub de logs du terminal. Toute la sortie (processus principal, serveur de dev de chaque app, processus `develop`) est structurée (source, niveau, horodatage, ANSI conservé) et diffusée en temps réel (SSE) sur `<spaPath>/__egen_logs__/stream` (+ `/history`, `/health`), exposée au navigateur via `window.egenLogsUrl`. Écoute locale uniquement (127.0.0.1), absente en production.
