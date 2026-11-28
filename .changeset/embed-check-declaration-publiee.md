---
'@egen-civitas/esm-embed-testing': minor
---

`egen-embed-check --probe` vérifie aussi la déclaration publiée à `<url>/egen-config.json` (voie normale, doc 17 §7) : présence (404 = information sur le second recours), absence de redirection, JSON et forme valides selon le protocole, écart avec la déclaration contrôlée (champs nommés) et rappel `Cache-Control: no-store` (le Core fige son SHA-256).
