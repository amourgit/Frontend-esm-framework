# @egen-civitas/esm-ai-events

## 1.2.0

### Minor Changes

- a158b96: Audit des modules IA : suppression du code mort et correction d'imperfections.

  - `esm-ai-channel` : les capacités déclaratives (`registerCapability`) sont désormais provisionnées au backend (`tools.sync.capabilities`, `tools.delta.capabilitiesUpsert/capabilitiesRemoved`) ; un canal arrêté n'est plus redémarrable silencieusement (erreur explicite).
  - `esm-ai-config` : suppression des clés jamais lues (`context.includeModuleConfig`, `security.auditLog`, `observability.eventsEnabled/analyticsEnabled/logLevel`).
  - `esm-ai-events` : suppression des événements jamais émis (`CONFIG_*`, `MESSAGE_STREAMING`, `MESSAGE_STREAM_END`, `PIPELINE_*`) ; `SESSION_ENDED` est maintenant émis à l'arrêt et son payload ne porte plus de `messageCount` fictif.
  - `esm-ai-tools` : suppression de `getToolsSchemaForLLM` (remplacé par `getToolDescriptors`) ; ajout de `getCapabilityDescriptors` ; le paramètre de type `TArgs` inutilisé de `AIToolDefinition` est retiré.
  - `esm-ai-extensions` : `defineAIModule` restaure à son démontage les tools remplacés par un override (fuite corrigée) et nettoie dans l'ordre inverse ; tests ajoutés.
  - `esm-ai-framework` : suppression des hooks obsolètes `useAvailableToolsSchema` et `useAIContextJson` ; `useExecuteTool` utilise `useState` (shim inutile supprimé) ; export de `getToolDescriptors` / `getCapabilityDescriptors`.

### Patch Changes

- Updated dependencies [a158b96]
  - @egen-civitas/esm-ai-config@1.3.0

## 1.1.0

### Minor Changes

- e44019d: Le moteur IA est entièrement côté backend ; le frontend n'est plus qu'une interface.

  - Suppression du paquet `@egen-civitas/esm-ai-memory` (la mémoire de conversation est gérée par le backend).
  - `esm-ai-config` : suppression de `provider` (modèle, température, clé API, mode direct) et de `memory` ; `backend.stream` remplace `provider.stream`.
  - `esm-ai-events` : suppression des évènements `MEMORY_*`.
  - `esm-ai-framework` : ne ré-exporte plus `AIProviderConfig` ni `AIMemoryConfig`.

### Patch Changes

- Updated dependencies [e44019d]
  - @egen-civitas/esm-ai-config@1.1.0
