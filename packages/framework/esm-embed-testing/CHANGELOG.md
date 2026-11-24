# @egen-civitas/esm-embed-testing

## 0.2.0

### Minor Changes

- 18cec62: Sécurité : `api.fetch` avec `path` est désormais **deny-by-default** (liste `paths` obligatoire dans le grant, normalisation anti-contournement : `..`, `%2e`, `//`…) pour qu'une app embarquée ne puisse pas appeler tout l'API du Core avec la session de l'utilisateur ; `negotiateCapabilities` ignore les entrées malformées ; tests de fuzz déterministes. Outillage : `egen-embed-check` (manifeste, capacités, `frame-ancestors`).

### Patch Changes

- Updated dependencies [18cec62]
  - @egen-civitas/esm-embed-protocol@0.2.0
  - @egen-civitas/esm-embed-host@0.2.0
  - @egen-civitas/esm-embed-client@0.1.1

## 0.1.0

### Minor Changes

- d70760d: Nouveau paquet : hôte de test en mémoire (`createTestHost`), suite de conformité du protocole v2 (`defineConformance`), simulateur de Shell (`egen-embed-sim`).

### Patch Changes

- Updated dependencies [10f0584]
- Updated dependencies [744cd20]
- Updated dependencies [cf9d90d]
  - @egen-civitas/esm-embed-client@0.1.0
  - @egen-civitas/esm-embed-protocol@0.1.0
  - @egen-civitas/esm-embed-host@0.1.0
