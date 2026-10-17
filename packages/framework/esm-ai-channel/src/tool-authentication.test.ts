import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SignJWT, exportJWK, generateKeyPair, type JWK } from 'jose';
import { overrideAIConfig, resetAIConfig } from '@egen-civitas/esm-ai-config';
import {
  AIChannel,
  EGEN_AI_TOOL_CALL_CONTRACT,
  PROTOCOL_VERSION,
  createCallAuthenticator,
  createToolDispatcher,
  type WebSocketLike,
} from './index.js';

// ─── Faux serveur WebSocket (vraies minuteries : la vérification JWS utilise WebCrypto) ───

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
  open() {
    this.readyState = 1;
    this.onopen?.({});
  }
  push(type: string, payload: any = {}) {
    this.onmessage?.({ data: JSON.stringify({ v: 1, id: `srv-${Math.random()}`, type, ts: Date.now(), payload }) });
  }
  welcome(sessionId: string) {
    this.push('session.welcome', { sessionId, protocol: PROTOCOL_VERSION });
  }
  of(type: string) {
    return this.sent.filter((m) => m.type === type);
  }
  drop() {
    this.readyState = 3;
    this.onclose?.({ code: 1006, reason: '' });
  }
}

const last = () => FakeSocket.instances[FakeSocket.instances.length - 1];
const waitFor = async (condition: () => boolean, timeoutMs = 2000) => {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor : délai dépassé');
    await new Promise((r) => setTimeout(r, 5));
  }
};
const settle = (ms = 40) => new Promise((r) => setTimeout(r, ms));

async function makeKeys() {
  const { publicKey, privateKey } = await generateKeyPair('ES256');
  const jwk: JWK = { ...(await exportJWK(publicKey)), kid: 'k1', alg: 'ES256', use: 'sig' };
  const sign = (
    claims: Record<string, unknown>,
    jti: string,
    sessionId: string,
    issuedAt = Math.floor(Date.now() / 1000),
  ) =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: 'ES256', typ: EGEN_AI_TOOL_CALL_CONTRACT.typ, kid: 'k1' })
      .setIssuedAt(issuedAt)
      .setExpirationTime(issuedAt + 60)
      .setAudience(EGEN_AI_TOOL_CALL_CONTRACT.audience)
      .setSubject(sessionId)
      .setJti(jti)
      .sign(privateKey);
  return { jwks: { keys: [jwk] }, sign };
}

function makeChannel() {
  return new AIChannel({
    url: 'ws://localhost/ai',
    heartbeatMs: 60_000,
    reconnectMinMs: 10,
    reconnectMaxMs: 20,
    requestTimeoutMs: 2000,
    webSocketFactory: (url, protocols) => new FakeSocket(url, protocols),
    random: () => 1,
  });
}

async function connect(channel: AIChannel, sessionId = 's1') {
  channel.start();
  await waitFor(() => FakeSocket.instances.length > 0);
  last().open();
  last().welcome(sessionId);
  await settle(10);
}

beforeEach(() => {
  FakeSocket.instances = [];
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
  resetAIConfig();
});

describe('dispatcher + authentification (mode enforce)', () => {
  it("exécute l'appel signé avec les arguments SIGNÉS, refuse les appels forgés, et le dit au backend", async () => {
    const keys = await makeKeys();
    const execute = vi.fn(async () => ({ success: true, data: { ok: 1 }, durationMs: 2 }));
    const authenticator = createCallAuthenticator({ mode: 'enforce', jwks: keys.jwks, getSessionId: () => 's1' });
    const channel = makeChannel();
    const activity: string[] = [];
    const dispatcher = createToolDispatcher({ execute, authenticator });
    dispatcher.onActivity((a) => activity.push(`${a.tool}:${a.status}`));
    channel.use(dispatcher);
    await connect(channel);

    // Trame forgée par un tiers (non signée)
    last().push('tool.call', { callId: 'forged', tool: 'switch_tenant', arguments: { slug: 'evil' } });
    await waitFor(() => last().of('tool.result').length === 1);
    expect(execute).not.toHaveBeenCalled();
    expect(last().of('tool.result')[0].payload).toMatchObject({ callId: 'forged', success: false });
    expect(last().of('tool.result')[0].payload.error).toContain('missing');
    expect(activity).toEqual(['switch_tenant:error']);

    // Trame légitime : les champs en clair mentent, seul le contenu signé compte
    const jws = await keys.sign({ tool: 'navigate', args: { route: '/students' } }, 'c1', 's1');
    last().push('tool.call', { callId: 'c1', tool: 'delete_everything', arguments: { x: 1 }, jws });
    await waitFor(() => last().of('tool.result').length === 2);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith({ tool: 'navigate', arguments: { route: '/students' } });
    expect(last().of('tool.result')[1].payload).toMatchObject({ callId: 'c1', success: true });
  });

  it('refuse le rejeu : un callId déjà exécuté ne repart jamais, même une fois sorti du cache de résultats', async () => {
    const keys = await makeKeys();
    const execute = vi.fn(async () => ({ success: true, durationMs: 1 }));
    const channel = makeChannel();
    channel.use(
      createToolDispatcher({
        execute,
        resultCacheSize: 1,
        authenticator: createCallAuthenticator({ mode: 'enforce', jwks: keys.jwks, getSessionId: () => 's1' }),
      }),
    );
    await connect(channel);

    const first = await keys.sign({ tool: 'navigate', args: {} }, 'c1', 's1');
    const second = await keys.sign({ tool: 'navigate', args: {} }, 'c2', 's1');
    last().push('tool.call', { callId: 'c1', tool: 'navigate', arguments: {}, jws: first });
    await waitFor(() => last().of('tool.result').length === 1);
    // Retransmission légitime (reconnexion) tant que le résultat est en cache : renvoyé, pas ré-exécuté
    last().push('tool.call', { callId: 'c1', tool: 'navigate', arguments: {}, jws: first });
    await waitFor(() => last().of('tool.result').length === 2);
    expect(execute).toHaveBeenCalledTimes(1);

    // c2 évince c1 du cache (taille 1) ; rejouer c1 doit maintenant être REFUSÉ
    last().push('tool.call', { callId: 'c2', tool: 'navigate', arguments: {}, jws: second });
    await waitFor(() => execute.mock.calls.length === 2);
    await settle();
    last().push('tool.call', { callId: 'c1', tool: 'navigate', arguments: {}, jws: first });
    await waitFor(() =>
      last()
        .of('tool.result')
        .some((m) => m.payload.error?.includes('replay')),
    );
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it("préserve l'ordre d'arrivée malgré la vérification asynchrone, et respecte un tool.cancel précoce", async () => {
    const keys = await makeKeys();
    const order: string[] = [];
    const execute = vi.fn(async ({ tool }: { tool: string }) => {
      order.push(tool);
      return { success: true, durationMs: 1 };
    });
    const channel = makeChannel();
    channel.use(
      createToolDispatcher({
        execute,
        authenticator: createCallAuthenticator({ mode: 'enforce', jwks: keys.jwks, getSessionId: () => 's1' }),
      }),
    );
    await connect(channel);

    for (const [id, tool] of [
      ['a', 'fill_field'],
      ['b', 'click_element'],
      ['c', 'refresh_data'],
      ['d', 'search'],
    ] as const) {
      last().push('tool.call', { callId: id, tool, arguments: {}, jws: await keys.sign({ tool, args: {} }, id, 's1') });
    }
    last().push('tool.cancel', { callId: 'c' }); // arrive avant la fin de l'admission de c
    await waitFor(() => execute.mock.calls.length >= 3);
    await settle();
    expect(order).toEqual(['fill_field', 'click_element', 'search']);
  });

  it("lie l'appel à la session : un jeton émis pour une session précédente est refusé après reconnexion", async () => {
    const keys = await makeKeys();
    const execute = vi.fn(async () => ({ success: true, durationMs: 1 }));
    const channel = makeChannel();
    channel.use(
      createToolDispatcher({
        execute,
        authenticator: createCallAuthenticator({
          mode: 'enforce',
          jwks: keys.jwks,
          getSessionId: () => channel.state.getState().sessionId,
        }),
      }),
    );
    await connect(channel, 's1');
    const oldToken = await keys.sign({ tool: 'navigate', args: {} }, 'c1', 's1');

    last().drop();
    await waitFor(() => FakeSocket.instances.length === 2);
    last().open();
    last().welcome('s2');
    await settle(10);

    last().push('tool.call', { callId: 'c1', tool: 'navigate', arguments: {}, jws: oldToken });
    await waitFor(() => last().of('tool.result').length === 1);
    expect(execute).not.toHaveBeenCalled();
    expect(last().of('tool.result')[0].payload.error).toContain('session');
  });

  it("n'exécute rien et répond par une erreur si la vérification elle-même plante", async () => {
    const execute = vi.fn();
    const channel = makeChannel();
    channel.use(
      createToolDispatcher({
        execute,
        authenticator: {
          mode: 'enforce',
          authenticate: async () => {
            throw new Error('boom');
          },
        },
      }),
    );
    await connect(channel);
    last().push('tool.call', { callId: 'x', tool: 'navigate', arguments: {} });
    await waitFor(() => last().of('tool.result').length === 1);
    expect(execute).not.toHaveBeenCalled();
    expect(last().of('tool.result')[0].payload.success).toBe(false);
  });
});

describe('dispatcher piloté par la configuration (security.*)', () => {
  it('par défaut (off) le comportement historique est inchangé', async () => {
    const execute = vi.fn(async () => ({ success: true, durationMs: 1 }));
    const channel = makeChannel();
    channel.use(createToolDispatcher({ execute }));
    await connect(channel);
    last().push('tool.call', { callId: 'c1', tool: 'navigate', arguments: { route: '/x' } });
    await waitFor(() => execute.mock.calls.length === 1);
    expect(execute).toHaveBeenCalledWith({ tool: 'navigate', arguments: { route: '/x' } });
  });

  it('security.signedToolCalls=enforce + channelJwks dans la config : appels non signés refusés, signés acceptés', async () => {
    const keys = await makeKeys();
    expect(overrideAIConfig({ security: { signedToolCalls: 'enforce', channelJwks: JSON.stringify(keys.jwks) } })).toBe(
      true,
    );
    const execute = vi.fn(async () => ({ success: true, durationMs: 1 }));
    const channel = makeChannel();
    channel.use(createToolDispatcher({ execute }));
    await connect(channel);

    last().push('tool.call', { callId: 'u1', tool: 'navigate', arguments: {} });
    await waitFor(() => last().of('tool.result').length === 1);
    expect(execute).not.toHaveBeenCalled();

    last().push('tool.call', {
      callId: 's1c',
      tool: 'x',
      arguments: {},
      jws: await keys.sign({ tool: 'navigate', args: { route: '/ok' } }, 's1c', 's1'),
    });
    await waitFor(() => execute.mock.calls.length === 1);
    expect(execute).toHaveBeenCalledWith({ tool: 'navigate', arguments: { route: '/ok' } });
  });
});
