---
"@egen-civitas/egen": patch
---

Dépend de `@egen-civitas/rspack-config` ^1.1.0 (règle `*.tw.css` / Tailwind). Avec `^1.0.1`, la CLI pouvait embarquer rspack-config 1.0.1 : les fichiers `*.tw.css` passaient alors par la règle CSS Modules sans PostCSS et Tailwind n'était jamais compilé.
