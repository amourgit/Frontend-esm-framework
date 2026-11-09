---
'@egen-civitas/esm-platform': minor
'@egen-civitas/esm-globals': minor
---

Registre de capacités (C6).

- `esm-platform` : `src/registry.ts` devient l'unique description des capacités (version, méthodes, adaptateurs Web et natif) ; le gabarit « indisponible », les adaptateurs, le handshake et la disponibilité en sont dérivés. Une capacité n'est disponible que si le Host l'annonce dans une version supérieure ou égale à celle du registre. `Platform` est dérivé de `CapabilityInterfaces`, extensible par fusion de déclaration. Procédure « ajouter une capacité » dans le README ; comportement des 9 capacités v1 inchangé.
- `esm-globals` : `EgenCapabilityExtensions` permet d'étendre `CapabilityName` sans modifier ce paquet. Les 9 noms v1 restent une union fermée.
