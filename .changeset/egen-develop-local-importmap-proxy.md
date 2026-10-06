---
'@egen-civitas/egen': patch
---

`egen develop` : une app lancée localement n'est plus réécrite comme si elle était servie par le backend. Le premier serveur de dev d'app reçoit le port 8082, qui est aussi le backend par défaut (`--backend http://localhost:8082`) : `proxyImportmapAndRoutes` réécrivait alors son URL en chemin relatif (`.//egen-esm-xxx.js`), le shell la demandait au serveur du shell qui répondait une page 404 HTML, et l'app mourait avec « The global variable … does not refer to a federated module ». `proxyImportmapAndRoutes` accepte désormais `localImportKeys` (les apps lancées par `runProject`) et ne les réécrit jamais.
