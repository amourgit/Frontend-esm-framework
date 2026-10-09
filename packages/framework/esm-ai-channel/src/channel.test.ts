import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AIChannel,
  ChannelClosedError,
  ChannelNotReadyError,
  ChannelRemoteError,
  PROTOCOL_VERSION,
  createContextSync,
  createConversationClient,
  createToolDispatcher,
  createToolsProvisioning,
  resolveChannelUrl,
  type WebSocketLike,
} from './index.js';

// ─── Faux serveur WebSocket ───────────────────────────────────────────────────

class FakeSocket implements WebSocketLike {
  static instances: FakeSocket[] = [];
  readyState = 0;
  sent: any[] = [];
  onopen: any = null;
  onmessage: any = null;
  onclose: any = null;
  onerror: any = null;
  constructor(
    public url: string,
    public protocols: string[],
  ) {
    FakeSocket.instances.push(this);
  }
  send(data: string) {
    this.sent.push(JSON.parse(data));
  }
  close(code = 1000, reason = '') {
    this.readyState = 3;
    this.onclose?.({ code, reason });
  }
  // côté « serveur »
  open() {
    this.readyState = 1;
    this.onopen?.({});
  }
  push(type: string, payload: any = {}, replyTo?: string) {
    this.onmessage?.({ data: JSON.stringify({ v: 1, id: `srv-${Math.random()}`, type, ts: Date.now(), replyTo, payload }) });
  }
  welcome(sessionId = 's1', protocol = PROTOCOL_VERSION) {
    this.push('session.welcome', { sessionId, protocol });
  }
  of(type: string) {
    return this.sent.filter((m) => m.type === type);
  }
  drop(code = 1006) {
    this.readyState = 3;
    this.onclose?.({ code, reason: '' });
  }
}

const last = () => FakeSocket.instances[FakeSocket.instances.length - 1];
const tick = async (ms = 0) => {
  await vi.advanceTimersByTimeAsync(ms);
};

function makeChannel(extra: Partial<ConstructorParameters<typeof AIChannel>[0]> = {}) {
  return new AIChannel({
    url: 'ws://test/ai',
    heartbeatMs: 1000,
    reconnectMinMs: 100,
    reconnectMaxMs: 800,
    requestTimeoutMs: 2000,
    webSocketFactory: (url, protocols) => new FakeSocket(url, protocols),
    random: () => 1,
    ...extra,
  });
}

async function connect(channel: AIChannel) {
  channel.start();
  await tick();
  last().open();
  last().welcome();
  await tick();
}

beforeEach(() => {
  FakeSocket.instances = [];
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe('poignée de main et état', () => {
  it('envoie hello puis passe à ready sur welcome', async () => {
    const ch = makeChannel();
    ch.start();
    await tick();
    expect(ch.state.getState().status).toBe('connecting');
    last().open();
    expect(ch.state.getState().status).toBe('handshaking');
    expect(last().of('session.hello')[0].payload).toMatchObject({ protocol: PROTOCOL_VERSION });
    expect(last().protocols).toEqual(['egen-ai.v1']);
    last().welcome('abc');
    expect(ch.state.getState()).toMatchObject({ status: 'ready', sessionId: 'abc' });
  });

  it('refuse un protocole incompatible sans reconnecter', async () => {
    const ch = makeChannel();
    ch.start();
    await tick();
    last().open();
    last().welcome('x', 99);
    expect(ch.state.getState().status).toBe('incompatible');
    await tick(5000);
    expect(FakeSocket.instances).toHaveLength(1);
  });

  it('4401 → unauthorized, aucune reconnexion', async () => {
    const ch = makeChannel();
    await connect(ch);
    last().drop(4401);
    expect(ch.state.getState().status).toBe('unauthorized');
    await tick(5000);
    expect(FakeSocket.instances).toHaveLength(1);
  });

  it('reconnecte avec backoff après une coupure et reprend la session', async () => {
    const ch = makeChannel();
    await connect(ch);
    last().drop();
    expect(ch.state.getState().status).toBe('reconnecting');
    await tick(100);
    expect(FakeSocket.instances).toHaveLength(2);
    last().open();
    expect(last().of('session.hello')[0].payload.resumeSessionId).toBe('s1');
    last().welcome('s1');
    expect(ch.state.getState().status).toBe('ready');
    expect(ch.state.getState().attempt).toBe(0);
  });

  it('détecte une coupure silencieuse (heartbeat) et reconnecte', async () => {
    const ch = makeChannel();
    await connect(ch);
    await tick(1000);
    expect(last().of('ping').length).toBe(1);
    await tick(3000); // > 2,5 × heartbeat sans rien recevoir
    expect(FakeSocket.instances.length).toBeGreaterThan(1);
  });
});

describe('envoi, requêtes et flux', () => {
  it('send hors ligne → ChannelNotReadyError ; reliable → livré à la reconnexion', async () => {
    const ch = makeChannel();
    expect(() => ch.send('ping', { t: 1 })).toThrow(ChannelNotReadyError);
    ch.send('ping', { t: 2 }, { reliable: true });
    await connect(ch);
    expect(last().of('ping').map((m) => m.payload.t)).toContain(2);
  });

  it('request résout sur la réponse corrélée et rejette sur erreur distante', async () => {
    const ch = makeChannel();
    await connect(ch);
    const p = ch.request('speech.request', { text: 'bonjour' });
    const req = last().of('speech.request')[0];
    last().push('speech.audio', { audioBase64: 'UENN' }, req.id);
    expect((await p).payload).toEqual({ audioBase64: 'UENN' });

    const p2 = ch.request('speech.request', { text: 'x' });
    last().push('error', { message: 'indisponible', code: 'tts' }, last().of('speech.request')[1].id);
    await expect(p2).rejects.toBeInstanceOf(ChannelRemoteError);
  });

  it('request expire sans réponse', async () => {
    const ch = makeChannel();
    await connect(ch);
    const p = ch.request('speech.request', { text: 'x' });
    const assertion = expect(p).rejects.toThrow(/Aucune réponse/);
    await tick(2001);
    await assertion;
  });

  it('les requêtes en vol sont rejetées si le canal se coupe', async () => {
    const ch = makeChannel();
    await connect(ch);
    const p = ch.request('speech.request', { text: 'x' });
    const assertion = expect(p).rejects.toBeInstanceOf(ChannelClosedError);
    last().drop();
    await assertion;
  });

  it('conversation : flux texte + transcription + fin', async () => {
    const ch = makeChannel();
    const conv = createConversationClient();
    ch.use(conv);
    await connect(ch);
    const deltas: string[] = [];
    const p = conv.sendText('salut', { mode: 'conversation', onDelta: (t) => deltas.push(t) });
    const msg = last().of('conversation.message')[0];
    expect(msg.payload).toEqual({ text: 'salut', mode: 'conversation' });
    last().push('conversation.transcript', { text: 'salut' }, msg.id);
    last().push('conversation.delta', { text: 'Bon' }, msg.id);
    last().push('conversation.delta', { text: 'jour' }, msg.id);
    last().push('conversation.end', {}, msg.id);
    expect(await p).toMatchObject({ text: 'Bonjour', transcript: 'salut', streamId: msg.id });
    expect(deltas).toEqual(['Bon', 'jour']);
  });

  it('conversation : erreur distante → rejet explicite', async () => {
    const ch = makeChannel();
    const conv = createConversationClient();
    ch.use(conv);
    await connect(ch);
    const p = conv.sendText('salut');
    last().push('conversation.error', { message: 'quota dépassé' }, last().of('conversation.message')[0].id);
    await expect(p).rejects.toThrow(/quota dépassé/);
  });

  it("conversation : l'annulation envoie conversation.cancel", async () => {
    const ch = makeChannel();
    const conv = createConversationClient();
    ch.use(conv);
    await connect(ch);
    const ctrl = new AbortController();
    const p = conv.sendText('long', { signal: ctrl.signal });
    const assertion = expect(p).rejects.toThrow();
    ctrl.abort();
    await assertion;
    expect(last().of('conversation.cancel')[0].payload.streamId).toBe(last().of('conversation.message')[0].id);
  });

  it('conversation : historique demandé au backend', async () => {
    const ch = makeChannel();
    const conv = createConversationClient();
    ch.use(conv);
    await connect(ch);
    const p = conv.fetchHistory();
    last().push('conversation.history', { messages: [{ id: '1', role: 'user', content: 'a' }] }, last().of('conversation.history.request')[0].id);
    expect(await p).toHaveLength(1);
  });
});

describe('provisionnement des tools', () => {
  const descriptor = (id: string, description = 'd') => ({
    id,
    name: id,
    description,
    parameters: { type: 'object' as const, properties: {}, required: [] },
    requiredPrivileges: [],
    moduleName: 'test',
  });

  it('tools.sync à la connexion, tools.delta sur changement, resync à la demande', async () => {
    let tools = [descriptor('navigate')];
    let notify: () => void = () => undefined;
    const ch = makeChannel();
    ch.use(
      createToolsProvisioning({
        getDescriptors: () => tools,
        getPrivileges: () => [],
        subscribePrivileges: () => () => undefined,
        subscribeRegistry: (l) => {
          notify = l;
          return () => undefined;
        },
        debounceMs: 10,
      }),
    );
    await connect(ch);
    expect(last().of('tools.sync')[0].payload.tools.map((t: any) => t.id)).toEqual(['navigate']);

    tools = [descriptor('navigate'), descriptor('describe_screen')];
    notify();
    await tick(20);
    expect(last().of('tools.delta')[0].payload).toMatchObject({ upsert: [{ id: 'describe_screen' }], removed: [] });

    tools = [descriptor('describe_screen', 'modifié')];
    notify();
    await tick(20);
    expect(last().of('tools.delta')[1].payload).toMatchObject({ upsert: [{ id: 'describe_screen' }], removed: ['navigate'] });

    notify();
    await tick(20);
    expect(last().of('tools.delta')).toHaveLength(2); // rien de neuf → rien envoyé

    last().push('tools.request_sync');
    expect(last().of('tools.sync')).toHaveLength(2);
    expect(last().of('tools.sync')[1].payload.tools.map((t: any) => t.id)).toEqual(['describe_screen']);
  });

  it('resynchronise tout le catalogue après reconnexion', async () => {
    const ch = makeChannel();
    ch.use(
      createToolsProvisioning({
        getDescriptors: () => [descriptor('navigate')],
        getPrivileges: () => [],
        subscribePrivileges: () => () => undefined,
        subscribeRegistry: () => () => undefined,
      }),
    );
    await connect(ch);
    last().drop();
    await tick(100);
    last().open();
    last().welcome();
    expect(last().of('tools.sync')).toHaveLength(1);
  });
});

describe('exécution des appels de tools par le frontend', () => {
  it('exécute tool.call et renvoie tool.result ; dédoublonne par callId', async () => {
    const execute = vi.fn(async () => ({ success: true, data: { ok: 1 }, durationMs: 3 }));
    const ch = makeChannel();
    const dispatcher = createToolDispatcher({ execute });
    const activity: string[] = [];
    dispatcher.onActivity((a) => activity.push(a.status));
    ch.use(dispatcher);
    await connect(ch);

    last().push('tool.call', { callId: 'c1', tool: 'navigate', arguments: { route: '/x' } });
    await tick();
    expect(execute).toHaveBeenCalledWith({ tool: 'navigate', arguments: { route: '/x' } });
    expect(last().of('tool.result')[0].payload).toMatchObject({ callId: 'c1', success: true, data: { ok: 1 } });
    expect(activity).toEqual(['running', 'success']);

    last().push('tool.call', { callId: 'c1', tool: 'navigate', arguments: { route: '/x' } });
    await tick();
    expect(execute).toHaveBeenCalledTimes(1);
    expect(last().of('tool.result')).toHaveLength(2); // résultat mis en cache renvoyé
  });

  it('renvoie une erreur explicite quand le tool échoue ou dépasse le délai', async () => {
    const execute = vi.fn().mockResolvedValueOnce({ success: false, error: 'Tool inconnu', durationMs: 1 }).mockImplementationOnce(() => new Promise(() => undefined));
    const ch = makeChannel();
    ch.use(createToolDispatcher({ execute }));
    await connect(ch);
    last().push('tool.call', { callId: 'a', tool: 'nope', arguments: {} });
    await tick();
    expect(last().of('tool.result')[0].payload).toMatchObject({ callId: 'a', success: false, error: 'Tool inconnu' });
    last().push('tool.call', { callId: 'b', tool: 'slow', arguments: {}, timeoutMs: 50 });
    await tick(60);
    expect(last().of('tool.result')[1].payload).toMatchObject({ callId: 'b', success: false });
    expect(last().of('tool.result')[1].payload.error).toMatch(/délai/);
  });

  it('exécute séquentiellement et respecte tool.cancel sur un appel en file', async () => {
    const order: string[] = [];
    let release: () => void = () => undefined;
    const execute = vi.fn(async ({ tool }: any) => {
      order.push(tool);
      if (tool === 'first') await new Promise<void>((r) => (release = r));
      return { success: true, durationMs: 1 };
    });
    const ch = makeChannel();
    ch.use(createToolDispatcher({ execute }));
    await connect(ch);
    last().push('tool.call', { callId: '1', tool: 'first', arguments: {} });
    last().push('tool.call', { callId: '2', tool: 'second', arguments: {} });
    last().push('tool.call', { callId: '3', tool: 'third', arguments: {} });
    last().push('tool.cancel', { callId: '2' });
    await tick();
    release();
    await tick();
    expect(order).toEqual(['first', 'third']);
  });
});

describe('synchronisation du contexte', () => {
  it('pousse le contexte à la connexion puis à chaque changement réel', async () => {
    let json = '{"route":"/a"}';
    let notify: () => void = () => undefined;
    const ch = makeChannel();
    ch.use(
      createContextSync({
        debounceMs: 10,
        getSnapshot: () => ({ contextJson: json, truncated: false, size: json.length }),
        subscribe: (l) => {
          notify = l;
          return () => undefined;
        },
      }),
    );
    await connect(ch);
    expect(last().of('context.update')[0].payload.context).toEqual({ route: '/a' });
    notify();
    await tick(20);
    expect(last().of('context.update')).toHaveLength(1);
    json = '{"route":"/b"}';
    notify();
    await tick(20);
    expect(last().of('context.update')[1].payload).toMatchObject({ context: { route: '/b' }, revision: 2 });
  });
});

describe('resolveChannelUrl', () => {
  const env = { egenBase: '/egen-civitas', location: { protocol: 'https:', host: 'app.example.ga' } };
  it.each([
    ['wss://x/ws', 'wss://x/ws'],
    ['https://api.x/ai/ws', 'wss://api.x/ai/ws'],
    ['http://localhost:8082/ai/ws', 'ws://localhost:8082/ai/ws'],
    ['/api/ai/ws', 'wss://app.example.ga/api/ai/ws'],
    ['${egenBase}/api/ai/ws', 'wss://app.example.ga/egen-civitas/api/ai/ws'],
  ])('%s → %s', (input, expected) => {
    expect(resolveChannelUrl(input, env)).toBe(expected);
  });
});
