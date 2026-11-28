---
'@egen-civitas/esm-embed-protocol': patch
---

`effectiveGrants` et `allowedContributions` ne lèvent plus d'exception quand le plafond approuvé ou la demande n'est pas un objet (ils valent « rien accordé »). Défaut trouvé par le fuzzing léger des gardes (revue de sécurité P7.4). Ajout de suites de fuzzing déterministes (protocole : parseurs, `validateManifest`, `effectiveIframe`, pollution de prototype ; hôte : `normalizeAppPath`, `stripSensitive`, URL de navigation).
