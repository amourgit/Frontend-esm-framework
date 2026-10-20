import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { overrideAIConfig, resetAIConfig } from '@egen-civitas/esm-ai-config';
import { getAIChannel, getChannelStore, startAIChannel, stopAIChannel, type WebSocketLike } from './index.js';

// Le canal branche des modules qui lisent la session / le tenant : on neutralise esm-api (hors sujet ici).
vi.mock('@egen-civitas/esm-api', () => ({
  sessionStore: {
    getState: () => ({ loaded: true, session: { authenticated: false } }),
    subscribe: () => () => undefined,
  },
  getTenantId: () => null,
  isMultiTenant: () => false,
  subscribeTenant: () => () => undefined,
  egenFetch: vi.fn(),
}));

class SpySocket implements WebSocketLike {
  static instances: SpySocket[] = [];
  readyState = 0;
  onopen: any = null;
  onmessage: any = null;
  onclose: any = null;
  onerror: any = null;
  constructor(
    public url: string,
    public protocols: string[],
  ) {
    SpySocket.instances.push(this);
  }
  send() {}
  close() {
    this.readyState = 3;
  }
}

const factory = (url: string, protocols: string[]) => new SpySocket(url, protocols);
const settle = (ms = 60) => new Promise((r) => setTimeout(r, ms));

const startWith = async (channelUrl: string, security: Record<string, unknown> = {}) => {
  expect(overrideAIConfig({ enabled: true, backend: { channelUrl }, security } as never)).toBe(true);
  startAIChannel({ webSocketFactory: factory });
  await settle();
};

beforeEach(() => {
  SpySocket.instances = [];
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  stopAIChannel();
  resetAIConfig();
  vi.restoreAllMocks();
});

describe('startAIChannel : destination du canal (bout en bout)', () => {
  it("n'ouvre AUCUN socket vers un hôte distant en ws:// et explique comment déroger", async () => {
    await startWith('ws://api.egen.ga/ws');
    expect(SpySocket.instances).toHaveLength(0);
    expect(getChannelStore().getState().lastError).toContain('EGEN_AI_ALLOW_INSECURE_CHANNEL');
  });

  it('ouvre le socket vers un hôte wss://, et vers localhost en ws://', async () => {
    await startWith('wss://api.egen.ga/ws');
    expect(SpySocket.instances.map((s) => s.url)).toEqual(['wss://api.egen.ga/ws']);
    stopAIChannel();
    SpySocket.instances = [];
    await startWith('ws://localhost:8080/ws');
    expect(SpySocket.instances.map((s) => s.url)).toEqual(['ws://localhost:8080/ws']);
  });

  it('la dérogation explicite permet ws:// vers un hôte distant', async () => {
    await startWith('ws://10.0.0.5/ws', { allowInsecureChannel: true });
    expect(SpySocket.instances.map((s) => s.url)).toEqual(['ws://10.0.0.5/ws']);
  });

  it("applique l'épinglage des hôtes : hôte autorisé connecté, autre hôte jamais connecté", async () => {
    await startWith('wss://api.egen.ga/ws', { allowedChannelHosts: ['*.egen.ga'] });
    expect(SpySocket.instances).toHaveLength(1);
    stopAIChannel();
    SpySocket.instances = [];
    await startWith('wss://evil.example/ws', { allowedChannelHosts: ['*.egen.ga'] });
    expect(SpySocket.instances).toHaveLength(0);
    expect(getChannelStore().getState().lastError).toContain('EGEN_AI_CHANNEL_ALLOWED_HOSTS');
  });

  it('la politique est réévaluée à chaque tentative (reconnexion) et ne produit jamais de socket', async () => {
    await startWith('ws://api.egen.ga/ws');
    await settle(120); // plusieurs tentatives de reconnexion planifiées
    expect(SpySocket.instances).toHaveLength(0);
    expect(getAIChannel()).not.toBeNull();
  });

  it('IA désactivée : aucun canal, statut disabled', () => {
    overrideAIConfig({ enabled: false } as never);
    expect(startAIChannel({ webSocketFactory: factory })).toBeNull();
    expect(getChannelStore().getState().status).toBe('disabled');
    expect(SpySocket.instances).toHaveLength(0);
  });
});
