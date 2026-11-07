---
'@egen-civitas/esm-globals': minor
'@egen-civitas/esm-api': minor
'@egen-civitas/esm-dynamic-loading': minor
'@egen-civitas/esm-framework': minor
'@egen-civitas/egen': minor
---

Réforme multiplateforme, lot P0 (docs/EGEN-FRAMEWORK-DEV.md) :

- esm-globals : `EgenTarget`, `CapabilityName`, `getEgenTarget()`, `isNativeTarget()`.
- esm-platform (nouveau package, 1.0.0) : contrats des capacités (annexe 2), `PlatformError`, détection de la cible, `getPlatform()` (adaptateur Web : session vide, `openExternal`, `lifecycle`, `files.select`, `camera`, `permissions` ; jamais de faux coffre ni de biométrie simulée. En natif, aucune capacité tant que le client de pont n'est pas branché, `ready` rejette `INCOMPATIBLE` sans Host), `createMockPlatform` (sous-chemin `/testing`).
- esm-framework : ré-export de `@egen-civitas/esm-platform` (`index`, `internal`, mocks).
- egen (CLI) : option `build --platform web|android|ios`.
- esm-api : `setAuthorizationProvider` (jeton fourni par la plateforme, rafraîchissement unique sur 401, rejeu GET/HEAD, politique `credentials`) ; `FetchConfig.replayOnUnauthorized` ; `isDevAuthBypassEnabled()` inerte en natif. Sans fournisseur, comportement inchangé.
- esm-dynamic-loading : overrides d'import map et de route map désactivés en cible native.
