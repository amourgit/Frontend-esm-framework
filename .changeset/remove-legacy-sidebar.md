---
'@egen-civitas/esm-styleguide': major
'@egen-civitas/esm-react-utils': major
'@egen-civitas/esm-extensions': major
'@egen-civitas/esm-framework': major
'@egen-civitas/esm-translations': patch
'@egen-civitas/esm-ai-tools': patch
---

Suppression complète de l'ancienne barre latérale (sidebar) : plus aucune app ne peut la monter. La navigation passe par les rails et zones du shell (`shell-rail-left-slot`, `shell-rail-bottom-slot`, `shell-rail-right-slot`) et la TopBar niveau 2 (`topbar-level2-nav`).

Retirés : `LeftNavMenu`, `setLeftNav`, `unsetLeftNav`, `SetLeftNavParams`, `LeftNavStore`, `useLeftNav`, `useLeftNavStore`, `DashboardExtension`, `createDashboard` (lien de sidebar), la variable `--egen-sidenav-width`, les styles `.cds--side-nav*` / `.active-left-nav-link`, la clé de traduction `leftNavigation` et les alias `side-nav` / `sidenav` de `esm-ai-tools`.
