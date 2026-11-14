---
'@egen-civitas/esm-api': patch
---

Un handshake natif refusé (`PlatformError` `INCOMPATIBLE`) n'est plus signalé comme erreur globale non interceptée par la récupération de la session : le shell affiche déjà son écran bloquant. Les autres échecs de session restent signalés.
