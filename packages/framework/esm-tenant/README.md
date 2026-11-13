# @egen-civitas/esm-tenant

Résolution et contexte du tenant (établissement) actif d'une application EGEN.

Le tenant est résolu selon un ordre de stratégies (`resolutionOrder`) : `subdomain`, `path`, `query`, `jwt`, `header`, `localStorage`, `static` (valeur par défaut). La première qui répond l'emporte.

## Cibles natives (android, ios)

Règle N5 : aucun jeton dans le stockage du WebView (les jetons vivent dans le Host, capacité `session`). En natif, la stratégie `jwt` **ne lit jamais** `localStorage` / `sessionStorage` et ne répond pas : le tenant vient des autres stratégies (`static`, `subdomain`…). Web inchangé.

Inventaire complet des clés de stockage : `docs/stockage.md` (à la racine du dépôt).
