---
'@egen-civitas/esm-tenant': minor
---

Sécurité (E3, règle N5) : en cible native, la stratégie de résolution `jwt` ne lit plus jamais de jeton dans `localStorage` / `sessionStorage` du WebView (les jetons vivent dans le Host). Le tenant vient alors des autres stratégies (`static`, `subdomain`…). `@egen-civitas/esm-globals` (`^2.1.0`) devient peer dépendance (`isNativeTarget`). Web inchangé.
