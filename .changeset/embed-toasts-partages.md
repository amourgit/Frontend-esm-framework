---
'@egen-civitas/esm-embed-protocol': minor
'@egen-civitas/esm-embed-client': minor
'@egen-civitas/esm-embed-host': minor
'@egen-civitas/esm-embed-testing': minor
---

Toasts partagés : le Core est l'afficheur, l'app notifie en temps réel sans doublon. Politique d'opérateur dans le grant `notifications` (`exclusive`, défaut vrai ; `rate`, défaut 10 par 10 s), `id` de dédoublonnage, réponse `{ displayed }`, anti-spam `RATE_LIMITED`. Client : `egen.notify(toast, local?)` (point d'entrée unique, repli local si le Core n'affiche pas), `egen.coreDisplaysNotifications`, hook `useEgenNotify`. Hôte : le fournisseur peut répondre `false` (doublon). Testing : hôte de test, conformité et vérificateur couvrent le modèle.
