---
'@egen-civitas/esm-ai-channel': major
'@egen-civitas/esm-ai-config': minor
'@egen-civitas/esm-ai-tools': minor
'@egen-civitas/esm-ai-framework': minor
---

Canal temps réel frontend ↔ backend IA (nouveau paquet `esm-ai-channel`, WebSocket `egen-ai.v1`) : provisionnement du catalogue de tools frontend au backend (`tools.sync` / `tools.delta`), exécution des `tool.call` du backend, synchronisation du contexte, conversation texte/voix et TTS.

- `esm-ai-config` : `backend` ne porte plus d'URL HTTP ni d'endpoints chat/stream, mais `channelUrl`, `heartbeatMs`, `reconnectMinMs`, `reconnectMaxMs`, `requestTimeoutMs`.
- `esm-ai-tools` : `getToolDescriptors()` / `AIToolDescriptor`.
- `esm-ai-framework` : démarre/arrête le canal, ré-exporte l'API du canal (`useAIChannelState`, `getConversationClient`, `onToolActivity`…).
