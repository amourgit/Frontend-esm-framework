---
'@egen-civitas/esm-ai-tools': minor
---

L'agent peut désormais lire et déchiffrer tout ce qui est chargé dans la page courante, avec précision, quel que soit le composant (titre, sous-titre, carte, tableau, formulaire, notification, modale…).

**Nouveaux tools (frontend uniquement)** : `read_page` (plan structuré et paginé de tout le contenu : landmarks, composants, titres, textes, listes, tableaux, champs avec valeur/erreurs/options, boutons, liens, images ; Shadow DOM et iframes même origine inclus), `read_component` (titre / sous-titre / corps / métadonnées / actions / médias / champs d'un composant, identité React et Carbon, props du composant React et données déclarées par l'app), `read_table` (lignes paginées, ARIA grid et Carbon DataTable), `find_in_page` (localise un texte, même coupé par des balises inline, avec section, composant et position), `discover_components` (inventaire des composants par nature), `get_dom_tree` (arbre DOM compact), `get_page_state` (URL, modales, alertes, chargement en cours, micro-apps montées, focus…), `scroll_to`, `navigate_and_read`. Chaque nœud renvoyé porte une référence stable `eNN` (sans toucher au DOM) acceptée par `read_component`, `read_table`, `inspect_element`, `scroll_to`…

**Tools existants améliorés** :
- `describe_screen` : références, landmarks, `inViewport`, pagination (`limit`/`offset`), Shadow DOM ; la valeur d'un champ n'était masquée que pour `type="password"` — elle l'est maintenant pour tout champ sensible (jeton, IBAN, code OTP, libellé « mot de passe »…, y compris `<textarea>` et `<select>`).
- `inspect_element` : cible par `ref`, niveaux de détail `full` / `standard` / `compact`, options de `<select>`, texte injecté par CSS (`::before` / `::after`), chaîne des composants React. Correctif de sécurité : les props React d'un champ sensible exposaient sa valeur en clair ; elles sont désormais masquées, ainsi que toute clé évoquant un secret (`password`, `token`, `authorization`…).
- `inspect_interface` / `navigate_and_inspect` : `detail` (défaut `standard`), `limit` (défaut 120) et `offset` — le rapport « full » sur 500 nœuds (CSS intégral + cascade par nœud) pouvait atteindre plusieurs Mo. `full` reste disponible. `navigate_and_inspect` attend aussi la fin des indicateurs de chargement.
- `fill_field` : gère `<select>` (par valeur ou libellé), cases à cocher et boutons radio, refuse les champs désactivés / en lecture seule, et déclenche `change` en plus d'`input`.
- Les zones marquées `data-ai-ignore` sont ignorées par tous les tools de lecture.
