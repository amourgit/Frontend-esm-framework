---
'@egen-civitas/esm-platform': minor
'@egen-civitas/esm-app-shell': minor
---

Capacités natives P0 (C7) : `session`, `secureStorage`, `openExternal` et `lifecycle` branchées sur le client de pont, avec validation des réponses du Host (en-tête d'autorisation sans CR/LF, types stricts) et des arguments avant envoi. Session native (D4) : le Shell pose, de façon synchrone au début de `run()`, un fournisseur d'autorisation d'`egenFetch` qui attend le handshake ; sans effet en Web.
