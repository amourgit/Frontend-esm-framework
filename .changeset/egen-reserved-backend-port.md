---
'@egen-civitas/egen': patch
---

`egen develop` n'alloue plus jamais à un serveur de dev d'app le port du backend : `getAvailablePort` accepte une liste de ports réservés (`reservedPorts`) transmise par `runProject`.
