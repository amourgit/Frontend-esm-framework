---
'@egen-civitas/esm-ai-config': minor
'@egen-civitas/esm-ai-events': minor
'@egen-civitas/esm-ai-framework': minor
---

Le moteur IA est entièrement côté backend ; le frontend n'est plus qu'une interface.

- Suppression du paquet `@egen-civitas/esm-ai-memory` (la mémoire de conversation est gérée par le backend).
- `esm-ai-config` : suppression de `provider` (modèle, température, clé API, mode direct) et de `memory` ; `backend.stream` remplace `provider.stream`.
- `esm-ai-events` : suppression des évènements `MEMORY_*`.
- `esm-ai-framework` : ne ré-exporte plus `AIProviderConfig` ni `AIMemoryConfig`.
