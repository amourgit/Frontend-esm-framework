// =============================================================================
//  @egen/esm-ai-framework — Mock pour les tests des consommateurs
// =============================================================================

export const initAIFramework = jest.fn ? jest.fn(() => () => {}) : () => () => {};
export const cleanupAIFramework = jest.fn ? jest.fn() : () => {};
export const isAIFrameworkInitialized = jest.fn ? jest.fn(() => false) : () => false;

export const getAIConfig = () => ({
  enabled: false,
  schemaVersion: '1.0.0',
  provider: {
    provider: 'gemini',
    model: 'gemini-2.5-pro',
    temperature: 0.7,
    topP: 0.95,
    topK: 40,
    maxTokens: 8192,
    stream: false,
  },
  backend: {
    baseUrl: '/api/ai',
    chatEndpoint: '/chat',
    streamEndpoint: '/chat/stream',
    requestTimeoutMs: 30000,
    maxRetries: 3,
    retryDelayMs: 1000,
  },
  context: {
    maxContextSize: 100000,
    includeActiveExtensions: true,
    includeNavigation: true,
    includeModuleConfig: false,
    includeFeatureFlags: true,
    serializationDepth: 4,
  },
  memory: { enabled: false, maxMessages: 50, storageKey: 'egen:ai:memory', persist: false },
  security: { requiredPrivileges: [], validateToolsClient: true, toolTimeoutMs: 30000, auditLog: false },
  observability: { debug: false, eventsEnabled: false, analyticsEnabled: false, logLevel: 'warn' as const },
});

export const useAIEnabled = () => false;
export const useAIConfig = getAIConfig;
export const useAIContext = () => null;
export const useAIContextJson = () => '{}';
export const useExecuteTool = () => ({
  execute: async () => ({ success: false, error: 'mock', durationMs: 0 }),
  executing: false,
  lastResult: null,
  lastError: null,
});
export const useAvailableToolsSchema = () => [];

export const AI_EVENTS = {} as any;
export const dispatchAIEvent = () => {};
export const subscribeToAIEvent = () => () => {};
export const subscribeToAllAIEvents = () => () => {};
export const observeAIEvent = () => ({ subscribe: () => ({ unsubscribe: () => {} }) });

export const registerTool = () => {};
export const overrideTool = () => {};
export const decorateTool = () => () => {};
export const removeTool = () => {};
export const executeTool = async () => ({ success: false, error: 'mock', durationMs: 0 });
export const getAllTools = () => [];
export const hasTool = () => false;
export const getToolsSchemaForLLM = () => [];

export const registerCapability = () => {};
export const removeCapability = () => {};
export const getAllCapabilities = () => [];

export const registerAIContextProvider = () => () => {};
export const removeAIContextProvider = () => {};
export const buildAIContext = () => ({ context: null, contextJson: '{}', truncated: false, size: 0 });
export const getAIContext = () => null;
export const getAIContextJson = () => '{}';

export const defineAIModule = () => () => {};
export const overrideAIConfig = () => true;
export const resetAIConfig = () => {};
