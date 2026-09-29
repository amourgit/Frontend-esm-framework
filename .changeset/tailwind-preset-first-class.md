---
"@egen-civitas/tailwind-preset": minor
---

Tailwind devient un citoyen de premier rang face au SCSS/Carbon : les utilitaires sont émis sans `@layer` (le reset Carbon non-layeré écrasait padding/margin/border/font des utilitaires), Preflight est activé dans `@layer base` (priorité minimale, ne peut pas écraser Carbon), et `--font-sans`/`--font-mono` sont pontés vers les tokens du thème.
