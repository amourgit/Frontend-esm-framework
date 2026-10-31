---
'@egen-civitas/esm-styleguide': minor
---

Le styleguide ne porte plus aucun logo : suppression du sprite SVG (`#egen-logo-full-color`, `#egen-logo-icon-color`, `#egen-logo-partial-color`, `#egen-logo-white`) — en réalité un ancien logo hérité d'un autre projet —, de sa palette SCSS (`--logo-*`) et de `setupLogo()` (interne). Le framework reste générique et neutre : l'identité visuelle appartient au projet client, qui affiche son logo comme une image ordinaire. **À savoir** : tout consommateur qui référençait ces identifiants de sprite doit migrer vers son propre logo.
