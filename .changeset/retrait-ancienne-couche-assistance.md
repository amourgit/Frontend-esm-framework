---
'@egen-civitas/esm-framework': major
'@egen-civitas/esm-styleguide': major
'@egen-civitas/esm-app-shell': major
'@egen-civitas/rspack-config': major
'@egen-civitas/esm-embed-protocol': minor
'@egen-civitas/esm-embed-host': minor
'@egen-civitas/esm-embed-client': minor
'@egen-civitas/esm-embed-testing': minor
---

Retrait radical de l'ancienne couche d'assistance par agent. Elle était trop rigide et sera reconstruite sur une base saine, selon la nouvelle architecture documentée dans `Frontend-esm-core/docs/integration-ai/`.

- **Packages supprimés** : les sept packages de l'ancienne couche (configuration, canal, contexte, événements, extensions, outils, façade). Le tag `pre-ai-removal-2026-11-25` conserve l'état précédent.
- `esm-framework` : ne ré-exporte plus la façade de l'ancienne couche. **Rupture** pour tout consommateur qui l'importait via `esm-framework`.
- `esm-styleguide` : le dossier `assistant/` est supprimé (orbe, robot 3D, scène Spline, saisie de prompt, fond d'érosion, modale « verre d'eau », audio), ainsi que les jetons CSS `--ui-ai-*` et les dépendances `three`, `@react-three/fiber`, `@splinetool/*`.
- `esm-app-shell` : le pont des variables `EGEN_AI_*` vers `window.egenAi*` est supprimé (configuration, gabarit `index.ejs`, bootstrap natif). Le garde-fou des ponts ne porte plus que sur `EGEN_TENANT_*`.
- `rspack-config` : `EGEN_AI_` n'est plus un préfixe de variable publique.
- `esm-embed-*` : la capacité d'outils pilotés par un agent est retirée du catalogue du SDK embed (protocole, hôte, client, simulateur et vérificateur de test).
