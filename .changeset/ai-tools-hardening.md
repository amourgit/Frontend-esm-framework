---
'@egen-civitas/esm-ai-tools': minor
'@egen-civitas/esm-ai-config': patch
'@egen-civitas/esm-ai-framework': patch
'@egen-civitas/esm-app-shell': patch
---

Durcissement des tools appelés à distance par le backend IA : `navigate` / `navigate_and_inspect` refusent les destinations externes ; `fetch_data` n'accepte que des chemins d'API relatifs (egenFetch envoyait sinon les credentials vers n'importe quel hôte) ; `download_file` refuse `javascript:` / `data:` et assainit le nom de fichier ; `switch_tenant` valide le slug ; la validation numérique ne convertit plus `''`, `[5]`, `true` en nombre ; les clés `__proto__` / `constructor` ne sont plus transmises ; le masquage des secrets dans les événements fonctionne (clé `apiKey` jamais masquée auparavant) et couvre les objets imbriqués ; des arguments absents ne font plus planter l'exécuteur.

Correctif : la liste blanche des variables `EGEN_AI_*` du shell ne contenait pas les variables du canal (`EGEN_AI_CHANNEL_URL`, `HEARTBEAT_MS`, `RECONNECT_*`) qui étaient donc ignorées dans le navigateur, et embarquait encore `EGEN_AI_API_KEY`. Elle est resynchronisée et gardée par un test. Le mock de `esm-ai-framework` est aligné sur la config.

Voir `MIGRATION-AI.md` pour le tableau complet des retraits d'API publique.
