# @egen-civitas/esm-ai-channel

## 2.0.1

### Patch Changes

- 098d8dc: Documentation et test de la lecture audio en direct : les fragments `conversation.audio_chunk` sont relayés dès réception, avant la fin du flux de réponse.

## 2.0.0

### Major Changes

- cd1ccd2: Canal temps réel frontend ↔ backend IA (nouveau paquet `esm-ai-channel`, WebSocket `egen-ai.v1`) : provisionnement du catalogue de tools frontend au backend (`tools.sync` / `tools.delta`), exécution des `tool.call` du backend, synchronisation du contexte, conversation texte/voix et TTS.

  - `esm-ai-config` : `backend` ne porte plus d'URL HTTP ni d'endpoints chat/stream, mais `channelUrl`, `heartbeatMs`, `reconnectMinMs`, `reconnectMaxMs`, `requestTimeoutMs`.
  - `esm-ai-tools` : `getToolDescriptors()` / `AIToolDescriptor`.
  - `esm-ai-framework` : démarre/arrête le canal, ré-exporte l'API du canal (`useAIChannelState`, `getConversationClient`, `onToolActivity`…).

### Patch Changes

- Updated dependencies [cd1ccd2]
  - @egen-civitas/esm-ai-config@1.2.0
  - @egen-civitas/esm-ai-tools@1.1.0
