export declare const initAIFramework: any;
export declare const cleanupAIFramework: any;
export declare const isAIFrameworkInitialized: any;
export declare const getAIConfig: () => {
  enabled: boolean;
  schemaVersion: string;
  provider: {
    provider: string;
    model: string;
    temperature: number;
    topP: number;
    topK: number;
    maxTokens: number;
    stream: boolean;
  };
  backend: {
    baseUrl: string;
    chatEndpoint: string;
    streamEndpoint: string;
    requestTimeoutMs: number;
    maxRetries: number;
    retryDelayMs: number;
  };
  context: {
    maxContextSize: number;
    includeActiveExtensions: boolean;
    includeNavigation: boolean;
    includeModuleConfig: boolean;
    includeFeatureFlags: boolean;
    serializationDepth: number;
  };
  memory: {
    enabled: boolean;
    maxMessages: number;
    storageKey: string;
    persist: boolean;
  };
  security: {
    requiredPrivileges: never[];
    validateToolsClient: boolean;
    toolTimeoutMs: number;
    auditLog: boolean;
  };
  observability: {
    debug: boolean;
    eventsEnabled: boolean;
    analyticsEnabled: boolean;
    logLevel: 'warn';
  };
};
export declare const useAIEnabled: () => boolean;
export declare const useAIConfig: () => {
  enabled: boolean;
  schemaVersion: string;
  provider: {
    provider: string;
    model: string;
    temperature: number;
    topP: number;
    topK: number;
    maxTokens: number;
    stream: boolean;
  };
  backend: {
    baseUrl: string;
    chatEndpoint: string;
    streamEndpoint: string;
    requestTimeoutMs: number;
    maxRetries: number;
    retryDelayMs: number;
  };
  context: {
    maxContextSize: number;
    includeActiveExtensions: boolean;
    includeNavigation: boolean;
    includeModuleConfig: boolean;
    includeFeatureFlags: boolean;
    serializationDepth: number;
  };
  memory: {
    enabled: boolean;
    maxMessages: number;
    storageKey: string;
    persist: boolean;
  };
  security: {
    requiredPrivileges: never[];
    validateToolsClient: boolean;
    toolTimeoutMs: number;
    auditLog: boolean;
  };
  observability: {
    debug: boolean;
    eventsEnabled: boolean;
    analyticsEnabled: boolean;
    logLevel: 'warn';
  };
};
export declare const useAIContext: () => null;
export declare const useAIContextJson: () => string;
export declare const useExecuteTool: () => {
  execute: () => Promise<{
    success: boolean;
    error: string;
    durationMs: number;
  }>;
  executing: boolean;
  lastResult: null;
  lastError: null;
};
export declare const useAvailableToolsSchema: () => never[];
export declare const AI_EVENTS: any;
export declare const dispatchAIEvent: () => void;
export declare const subscribeToAIEvent: () => () => void;
export declare const subscribeToAllAIEvents: () => () => void;
export declare const observeAIEvent: () => {
  subscribe: () => {
    unsubscribe: () => void;
  };
};
export declare const registerTool: () => void;
export declare const overrideTool: () => void;
export declare const decorateTool: () => () => void;
export declare const removeTool: () => void;
export declare const executeTool: () => Promise<{
  success: boolean;
  error: string;
  durationMs: number;
}>;
export declare const getAllTools: () => never[];
export declare const hasTool: () => boolean;
export declare const getToolsSchemaForLLM: () => never[];
export declare const registerCapability: () => void;
export declare const removeCapability: () => void;
export declare const getAllCapabilities: () => never[];
export declare const registerAIContextProvider: () => () => void;
export declare const removeAIContextProvider: () => void;
export declare const buildAIContext: () => {
  context: null;
  contextJson: string;
  truncated: boolean;
  size: number;
};
export declare const getAIContext: () => null;
export declare const getAIContextJson: () => string;
export declare const defineAIModule: () => () => void;
export declare const overrideAIConfig: () => boolean;
export declare const resetAIConfig: () => void;
//# sourceMappingURL=mock.d.ts.map
