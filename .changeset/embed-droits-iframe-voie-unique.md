---
'@egen-civitas/esm-embed-protocol': minor
'@egen-civitas/esm-embed-host': minor
'@egen-civitas/esm-embed-testing': minor
'@egen-civitas/esm-embed-client': patch
---

Droits d'iframe négociés et voie unique SDK.

- **protocole** : bloc `iframe` (`sandbox[]`, `allow[]`) dans la déclaration `egen-config.json` (demande) et dans le plafond approuvé ; listes blanches strictes (`IFRAME_SANDBOX_TOKENS`, `IFRAME_ALLOW_TOKENS`, jamais de `allow-top-navigation*`) ; `validateIframeRights`, `effectiveIframe` (demande ∩ plafond), `sanitizeIframeRights` ; `config` publique validée (≤ 8 Ko) ; `ApprovedGrants` accepte `iframe`. **Breaking** : `SUPPORTED_PROTOCOLS` ne contient plus que `2` (le protocole 1 / pont 1.1 est retiré) ; `negotiateProtocol(1)` → `null`.
- **hôte** : option `iframe` (droits effectifs) qui étend le socle et pose les attributs `sandbox` et `allow`, avec revalidation par liste blanche. **Breaking** : l'option `sandbox` est remplacée par `iframe` ; l'option `legacy` et le pont 1.1 (`handleLegacy`, `legacySend`) sont retirés ; la poignée de main ne propose plus que le protocole 2.
- **testing** : `createTestHost` accepte `manifestIframe` et expose `iframe` (droits effectifs) ; `egen-embed-check` valide la forme `iframe`, rappelle l'approbation requise et signale les permissions sensibles ; le simulateur applique les droits d'iframe.
- **client** : documentation (les droits se demandent dans `egen-config.json`), le manifeste s'appelle désormais `egen-config.json`.
