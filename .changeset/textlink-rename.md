---
'@egen-civitas/esm-styleguide': patch
---

`Link` (composant de lien de texte) est renommé `TextLink` : le nom `Link` entrait en conflit avec le type `Link` d'`@egen-civitas/esm-api`, ce qui faisait échouer la construction d'`@egen-civitas/esm-framework` (qui ré-exporte les deux). `TextLinkProps` remplace `LinkProps`.
