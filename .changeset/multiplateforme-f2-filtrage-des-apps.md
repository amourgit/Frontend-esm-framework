---
'@egen-civitas/esm-globals': minor
'@egen-civitas/esm-routes': minor
'@egen-civitas/esm-platform': minor
'@egen-civitas/esm-app-shell': minor
---

Contrat d'app multiplateforme (F2) : `EgenAppRoutes.platforms` et `requiredCapabilities`. `registerApp` écarte (sans rien enregistrer) une app non éligible à la plateforme ou dont une capacité requise manque. `esm-globals` : `setCapabilityResolver` / `hasCapability`. `esm-platform` : `registerPlatformCapabilities()`. Shell : capacités rendues consultables avant l'enregistrement des apps. Sans champs dans `routes.json`, comportement inchangé.
