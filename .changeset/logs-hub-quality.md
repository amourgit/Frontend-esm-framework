---
'@egen-civitas/egen': patch
---

Hub de logs : niveaux plus justes (pluriels « errors/warnings », succès resserré, stderr sans indice = info), lignes de suite d'un bloc d'erreur/avertissement héritant du niveau, retours chariot (barres de progression) réduits à leur dernier état, couleurs ANSI conservées chez les processus fils, ids croissants entre redémarrages (reprise SSE fiable).
