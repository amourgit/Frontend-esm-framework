# @egen-civitas/esm-embed-protocol

## 0.2.0

### Minor Changes

- 18cec62: Sécurité : `api.fetch` avec `path` est désormais **deny-by-default** (liste `paths` obligatoire dans le grant, normalisation anti-contournement : `..`, `%2e`, `//`…) pour qu'une app embarquée ne puisse pas appeler tout l'API du Core avec la session de l'utilisateur ; `negotiateCapabilities` ignore les entrées malformées ; tests de fuzz déterministes. Outillage : `egen-embed-check` (manifeste, capacités, `frame-ancestors`).

## 0.1.0

### Minor Changes

- 10f0584: Nouveau SDK `esm-embed-client` (connexion v2, 15 façades de capacités, mode autonome, liaison React). Protocole : message `probe` de poignée de main et `wrapHandshake`.
- 744cd20: Nouveau paquet `esm-embed-host` (iframe sécurisée, poignée de main v2, grants appliqués, fournisseurs, `createFetchApiProvider`, navigation partagée, compatibilité du pont 1.1). Protocole : `pickFields`, refus `UNAVAILABLE`, réponse trop volumineuse signalée à l'appelant.
- cf9d90d: Nouveau paquet : protocole v2 d'intégration des apps embarquées (poignée de main, catalogue de 15 capacités, grants effectifs, négociation, moteur RPC à dispatch fermé).
