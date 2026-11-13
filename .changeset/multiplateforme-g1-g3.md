---
'@egen-civitas/esm-app-shell': minor
'@egen-civitas/esm-navigation': minor
'@egen-civitas/esm-ai-tools': minor
---

Sécurité (G1, G3) : le build du shell échoue si un nom des ponts `EGEN_AI_*` / `EGEN_TENANT_*` évoque un secret. En natif, `navigate()` envoie les URL absolues par `platform.openExternal` au lieu de remplacer le SPA dans le WebView, et `switch_tenant` (changement d'établissement par sous-domaine) est refusé. Web inchangé.
