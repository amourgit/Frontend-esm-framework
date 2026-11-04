---
'@egen-civitas/esm-extensions': minor
'@egen-civitas/esm-styleguide': minor
---

`StaggeredMenuPanel` accepte des composants libres posés par les apps, comme les rails. Nouveau slot `staggered-menu-slot` (`STAGGERED_MENU_SLOT`) : une extension y déclare dans sa `meta` sa zone (`top`, `content`, `bottom`), son `order`, sa `priority`, `global` (visible quelle que soit l'app active ; sinon seulement quand son app est montée), `showTitle`, `titleKey`. Nouveaux exports : `registerStaggeredMenuEntry` (déclaration par le code), `resolveStaggeredMenuEntries`, `isStaggeredMenuEntryMeta`, `getStaggeredMenuEntryProblems`, `useStaggeredMenuEntries` et les types associés. Nouvelles props du panneau : `extensionSlot` (slot dédié ou `false`) et `maxExtensions` (limite par priorité). Le contenu est chargé à la première ouverture ; chaque composant reçoit `closeMenu`, `position` et `isOpen` en props ; un clic dans un menu/dialogue ouvert par un composant ne ferme plus le panneau (`closeOnClickAway`) ; le panneau fermé est `inert`. Aucun changement pour les usages existants.
