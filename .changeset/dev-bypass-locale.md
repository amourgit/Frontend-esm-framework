---
'@egen-civitas/esm-api': patch
'@egen-civitas/esm-app-shell': patch
---

Bypass d'authentification de développement (`EGEN_DEV_NO_AUTH`) : émule désormais le changement de langue, comme un vrai backend. Avant, changer de langue dans la TopBar ne produisait aucun effet en dev : `POST /session { locale }` renvoyait toujours la session en `fr` (la page se rechargeait en `fr`), et `POST /user/<uuid> { userProperties.defaultLocale }` n'était pas intercepté, partait vers un serveur sans API et échouait.

- `POST /session { locale }` : langue de la session, conservée dans `sessionStorage` ; le store de session et `<html lang>` sont mis à jour tout de suite.
- `POST /user/<uuid> { userProperties }` : langue par défaut, conservée dans `localStorage`.
- Priorité à l'initialisation : langue de session, puis langue par défaut, puis `fr`. Les locales non autorisées sont ignorées.
- Nouvelle fonction `getDevBypassSession()` (session fictive courante).
- L'app-shell est republié car il embarque `esm-api` (le correctif n'atteint les apps que par le bundle du shell).
