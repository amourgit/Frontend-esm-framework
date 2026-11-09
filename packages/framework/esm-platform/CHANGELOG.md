# @egen-civitas/esm-platform

## 1.2.0

### Minor Changes

- c5d96c9: Client du protocole Host v1 (C5) : `createBridgeClient` (handshake mémorisé, délais, concurrence, messages invalides ignorés et comptés), `getHostInfo()`, `getHostBridge()`, `createMockHost()` (testing). En natif, `getPlatform().ready` attend désormais le handshake et rejette `INCOMPATIBLE` si le Host est de version incompatible ou annonce une autre plateforme. Aucun changement en Web.
- 340f5fe: Registre de capacités (C6).

  - `esm-platform` : `src/registry.ts` devient l'unique description des capacités (version, méthodes, adaptateurs Web et natif) ; le gabarit « indisponible », les adaptateurs, le handshake et la disponibilité en sont dérivés. Une capacité n'est disponible que si le Host l'annonce dans une version supérieure ou égale à celle du registre. `Platform` est dérivé de `CapabilityInterfaces`, extensible par fusion de déclaration. Procédure « ajouter une capacité » dans le README ; comportement des 9 capacités v1 inchangé.
  - `esm-globals` : `EgenCapabilityExtensions` permet d'étendre `CapabilityName` sans modifier ce paquet. Les 9 noms v1 restent une union fermée.

### Patch Changes

- Updated dependencies [340f5fe]
  - @egen-civitas/esm-globals@2.2.0

## 1.1.0

### Minor Changes

- d1d2d7d: Contrat d'app multiplateforme (F2) : `EgenAppRoutes.platforms` et `requiredCapabilities`. `registerApp` écarte (sans rien enregistrer) une app non éligible à la plateforme ou dont une capacité requise manque. `esm-globals` : `setCapabilityResolver` / `hasCapability`. `esm-platform` : `registerPlatformCapabilities()`. Shell : capacités rendues consultables avant l'enregistrement des apps. Sans champs dans `routes.json`, comportement inchangé.

### Patch Changes

- Updated dependencies [d1d2d7d]
- Updated dependencies [669cbd6]
- Updated dependencies [5958a56]
  - @egen-civitas/esm-globals@2.1.0
