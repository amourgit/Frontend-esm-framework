# Politique de stockage (E3)

Inventaire réalisé le 2026-11-13 (`grep -rn "localStorage\|sessionStorage\|indexedDB\|Dexie" --include=*.ts --include=*.tsx packages`, hors tests/dist).

**Règle N5** : en natif (`isNativeTarget()`), aucun jeton ni secret dans le stockage du WebView. Les jetons vivent dans le Host (capacité `session` / `secureStorage`, C7/D4).

| Clé / base | Mécanisme | Package | Sensibilité | Comportement en natif |
|---|---|---|---|---|
| `egen:session:token`, `token` | localStorage / sessionStorage (**lecture seule**, écrits par une app de login hors framework) | `esm-tenant` (`resolveByJwt`) | **Secret (jeton)** | **Jamais lus** (E3) ; stratégie `jwt` inopérante, le tenant vient de `static`/`subdomain`/… ; Web inchangé |
| `egen:tenant:active`, `…:header` | localStorage | `esm-tenant` | Identifiant de tenant (non secret) | Inchangé |
| `egen:sessionStoreState` | sessionStorage | `esm-data-api` | Identifiants d'entité/session de travail (UUID, non secret) | Inchangé |
| `egen:history` (clé d'historique) | sessionStorage | `esm-navigation` | URLs visitées (peut contenir des paramètres) | Inchangé |
| `egen-routes:*`, `import-map-override:*`, désactivations | localStorage | `esm-dynamic-loading` | Configuration de développement | Ignorés en natif (F1, lockdown) |
| `egen:devtools` | localStorage | `esm-api`, shell | Drapeau de développement | Sans effet en natif (build `production`) |
| langue de session / par défaut (dev bypass) | sessionStorage / localStorage | `esm-api` | Préférence | Bypass d'auth désactivé en natif (F1) |
| `egen:temporaryConfig` | localStorage | `esm-config` | Configuration temporaire | Inchangé |
| `egen:feature-flag:*`, `…-meta:*` | localStorage | `esm-feature-flags`, `esm-ai-context` | Préférences | Inchangé |
| mode hors ligne (`offlineModeStorageKey`) | localStorage / sessionStorage | `esm-offline` | Préférence | Inchangé |
| Bases Dexie (`OfflineDb`, données hors ligne) | IndexedDB | `esm-offline` | **Données métier** potentiellement sensibles | Inchangé — **à valider sur appareil** |
| Base du service worker (`ServiceWorkerDb`) | IndexedDB | `shell/esm-app-shell` | Cache technique | Inchangé |
| Clés du workbench, assistant, son, thème (mode) | localStorage | `esm-styleguide`, `esm-theme` | Préférences d'interface | Inchangé |
| Langue i18n | localStorage (détection i18next) | `shell/esm-app-shell` | Préférence | Inchangé |

## Ce qui est fait / pas fait

- **Fait** : `esm-tenant` ne lit plus de jeton en natif (tests : clés jamais ouvertes ; Web inchangé).
- **Pas fait, volontairement** : aucune migration de stockage « par principe ». La persistance/quotas d'IndexedDB et `localStorage` en WebView Android / WKWebView est **non testée** : décision après constat sur appareil (X-4).
- **À trancher avec le backend (X-1)** : ce que le jeton apporte exactement au tenant ; d'ici là le tenant natif vient de la configuration du build (`EGEN_TENANT_*`) ou du sous-domaine.
- **À vérifier** : le contenu des données hors ligne (Dexie) avant tout usage natif avec des données sensibles (chiffrement via `secureStorage` à étudier).
