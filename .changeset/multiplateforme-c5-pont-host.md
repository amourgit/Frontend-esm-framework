---
'@egen-civitas/esm-platform': minor
'@egen-civitas/esm-framework': minor
---

Client du protocole Host v1 (C5) : `createBridgeClient` (handshake mémorisé, délais, concurrence, messages invalides ignorés et comptés), `getHostInfo()`, `getHostBridge()`, `createMockHost()` (testing). En natif, `getPlatform().ready` attend désormais le handshake et rejette `INCOMPATIBLE` si le Host est de version incompatible ou annonce une autre plateforme. Aucun changement en Web.
