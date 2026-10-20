---
'@egen-civitas/esm-ai-tools': patch
---

Vérification finale des tools de lecture de page : 325 tests (couverture 96 % des instructions, 90 % des branches, exécutés aussi en ordre aléatoire) et corrections de défauts qu'ils ont révélés.

**Sécurité** : le texte d'un `<textarea>` est sa valeur ; `inspect_element` (`textContent` / `innerText`), le nom accessible d'un conteneur focalisable, le texte des modales et alertes de `get_page_state` et l'arbre DOM de `get_dom_tree` l'exposaient en clair, y compris pour un champ sensible, dès qu'un conteneur en contenait un. Nouveau `safeTextContent` (ignore `<textarea>`, champs sensibles, scripts, styles) utilisé partout où le texte d'un élément quelconque part vers le backend ; `inlineText` ne lit plus jamais le contenu d'un champ.

**Lecture de page** :
- un `<label>` qui enveloppe son champ (`<label>Texte <input type="checkbox"></label>`) faisait disparaître le champ du plan ;
- `role="link"` et les SVG nommés isolés sont lus comme liens / images avec leur référence ;
- les actions et observables déclarés par l'app sont désormais indiqués sur les boutons, liens et listes (`déclaré: id`), pas seulement sur les composants ;
- le texte des listes et tableaux n'est plus dupliqué dans `parts.body` de `read_component` ;
- `discover_components` et `find_in_page` ne renvoient plus rien quand leur zone cible est masquée.

**Tests** : suites indépendantes de l'ordre d'exécution (un test de tenant laissait `window.location` modifié et faisait échouer d'autres tests selon la graine).
