// =============================================================================
//  @egen/esm-ai-events — Types d'événements IA
//
//  Tous les événements du système IA EGEN sont définis ici.
//  Le système d'événements permet : logging, debugging, analytics, extensions.
// =============================================================================

// ─── Noms d'événements ────────────────────────────────────────────────────────

export const AI_EVENTS = {
  // Configuration
  CONFIG_CHANGED: 'egen:ai:config:changed',
  CONFIG_ERROR: 'egen:ai:config:error',

  // Contexte
  CONTEXT_BUILT: 'egen:ai:context:built',
  CONTEXT_PROVIDER_REGISTERED: 'egen:ai:context:provider:registered',
  CONTEXT_PROVIDER_REMOVED: 'egen:ai:context:provider:removed',
  CONTEXT_UPDATED: 'egen:ai:context:updated',

  // Tools
  TOOL_REGISTERED: 'egen:ai:tool:registered',
  TOOL_OVERRIDDEN: 'egen:ai:tool:overridden',
  TOOL_DECORATED: 'egen:ai:tool:decorated',
  TOOL_REMOVED: 'egen:ai:tool:removed',
  TOOL_EXECUTING: 'egen:ai:tool:executing',
  TOOL_EXECUTED: 'egen:ai:tool:executed',
  TOOL_FAILED: 'egen:ai:tool:failed',
  TOOL_TIMEOUT: 'egen:ai:tool:timeout',
  TOOL_PERMISSION_DENIED: 'egen:ai:tool:permission:denied',

  // Capacités
  CAPABILITY_REGISTERED: 'egen:ai:capability:registered',
  CAPABILITY_REMOVED: 'egen:ai:capability:removed',

  // Messages / Conversation
  MESSAGE_SENT: 'egen:ai:message:sent',
  MESSAGE_RECEIVED: 'egen:ai:message:received',
  MESSAGE_ERROR: 'egen:ai:message:error',
  MESSAGE_STREAMING: 'egen:ai:message:streaming',
  MESSAGE_STREAM_END: 'egen:ai:message:stream:end',

  // Session
  SESSION_STARTED: 'egen:ai:session:started',
  SESSION_ENDED: 'egen:ai:session:ended',
  SESSION_CLEARED: 'egen:ai:session:cleared',

  // Pipeline
  PIPELINE_STARTED: 'egen:ai:pipeline:started',
  PIPELINE_COMPLETED: 'egen:ai:pipeline:completed',
  PIPELINE_FAILED: 'egen:ai:pipeline:failed',
} as const;

export type AIEventName = (typeof AI_EVENTS)[keyof typeof AI_EVENTS];

// ─── Payloads d'événements ────────────────────────────────────────────────────

export interface AIEventPayload {
  /** Timestamp ISO de l'événement */
  timestamp: string;
  /** Identifiant unique de l'événement */
  eventId: string;
}

export interface AIConfigChangedPayload extends AIEventPayload {
  previousEnabled: boolean;
  newEnabled: boolean;
  source: string;
}

export interface AIContextBuiltPayload extends AIEventPayload {
  contextSize: number;
  providerCount: number;
  truncated: boolean;
}

export interface AIContextProviderPayload extends AIEventPayload {
  providerId: string;
  providerName: string;
}

export interface AIToolRegisteredPayload extends AIEventPayload {
  toolId: string;
  toolName: string;
  moduleName: string;
}

export interface AIToolExecutionPayload extends AIEventPayload {
  toolId: string;
  toolName: string;
  executionId: string;
  args?: Record<string, unknown>;
}

export interface AIToolExecutedPayload extends AIToolExecutionPayload {
  durationMs: number;
  success: boolean;
}

export interface AIToolFailedPayload extends AIToolExecutionPayload {
  error: string;
  durationMs: number;
}

export interface AIToolPermissionDeniedPayload extends AIEventPayload {
  toolId: string;
  requiredPrivileges: string[];
  userPrivileges: string[];
}

export interface AICapabilityPayload extends AIEventPayload {
  capabilityId: string;
  capabilityName: string;
}

export interface AIMessagePayload extends AIEventPayload {
  sessionId: string;
  messageId: string;
  role: 'user' | 'assistant' | 'system';
  contentLength?: number;
}

export interface AIMessageStreamingPayload extends AIEventPayload {
  sessionId: string;
  messageId: string;
  chunk: string;
  chunkIndex: number;
}

export interface AIPipelinePayload extends AIEventPayload {
  pipelineId: string;
  toolId?: string;
  step?: string;
}

// ─── Map événement → payload ──────────────────────────────────────────────────

export interface AIEventPayloadMap {
  [AI_EVENTS.CONFIG_CHANGED]: AIConfigChangedPayload;
  [AI_EVENTS.CONFIG_ERROR]: AIEventPayload & { errors: string[] };
  [AI_EVENTS.CONTEXT_BUILT]: AIContextBuiltPayload;
  [AI_EVENTS.CONTEXT_PROVIDER_REGISTERED]: AIContextProviderPayload;
  [AI_EVENTS.CONTEXT_PROVIDER_REMOVED]: AIContextProviderPayload;
  [AI_EVENTS.CONTEXT_UPDATED]: AIContextBuiltPayload;
  [AI_EVENTS.TOOL_REGISTERED]: AIToolRegisteredPayload;
  [AI_EVENTS.TOOL_OVERRIDDEN]: AIToolRegisteredPayload & { previousModuleName: string };
  [AI_EVENTS.TOOL_DECORATED]: AIToolRegisteredPayload;
  [AI_EVENTS.TOOL_REMOVED]: AIToolRegisteredPayload;
  [AI_EVENTS.TOOL_EXECUTING]: AIToolExecutionPayload;
  [AI_EVENTS.TOOL_EXECUTED]: AIToolExecutedPayload;
  [AI_EVENTS.TOOL_FAILED]: AIToolFailedPayload;
  [AI_EVENTS.TOOL_TIMEOUT]: AIToolExecutionPayload & { timeoutMs: number };
  [AI_EVENTS.TOOL_PERMISSION_DENIED]: AIToolPermissionDeniedPayload;
  [AI_EVENTS.CAPABILITY_REGISTERED]: AICapabilityPayload;
  [AI_EVENTS.CAPABILITY_REMOVED]: AICapabilityPayload;
  [AI_EVENTS.MESSAGE_SENT]: AIMessagePayload;
  [AI_EVENTS.MESSAGE_RECEIVED]: AIMessagePayload;
  [AI_EVENTS.MESSAGE_ERROR]: AIMessagePayload & { error: string };
  [AI_EVENTS.MESSAGE_STREAMING]: AIMessageStreamingPayload;
  [AI_EVENTS.MESSAGE_STREAM_END]: AIMessagePayload;
  [AI_EVENTS.SESSION_STARTED]: AIEventPayload & { sessionId: string };
  [AI_EVENTS.SESSION_ENDED]: AIEventPayload & { sessionId: string; messageCount: number };
  [AI_EVENTS.SESSION_CLEARED]: AIEventPayload;
  [AI_EVENTS.PIPELINE_STARTED]: AIPipelinePayload;
  [AI_EVENTS.PIPELINE_COMPLETED]: AIPipelinePayload & { durationMs: number };
  [AI_EVENTS.PIPELINE_FAILED]: AIPipelinePayload & { error: string };
}

// ─── Listener ─────────────────────────────────────────────────────────────────

export type AIEventListener<K extends AIEventName> = (payload: AIEventPayloadMap[K]) => void;

export type AIEventUnsubscribe = () => void;
