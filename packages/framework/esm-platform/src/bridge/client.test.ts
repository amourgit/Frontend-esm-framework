import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlatformError } from '../errors';
import { createMockHost } from '../testing';
import { createBridgeClient } from './client';
import { MAX_MESSAGE_LENGTH } from './protocol';

const CAPS = { secureStorage: { v: 1 }, lifecycle: { v: 1 } } as const;

function setup(hostOptions: Parameters<typeof createMockHost>[0] = {}, clientOptions: { timeoutMs?: number } = {}) {
  const host = createMockHost({ capabilities: CAPS, ...hostOptions });
  const client = createBridgeClient({
    bridge: host.bridge,
    environment: 'android',
    framework: '3.2.0',
    ...clientOptions,
  });
  return { host, client };
}

async function rejection(promise: Promise<unknown>): Promise<PlatformError> {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(PlatformError);
  return error as PlatformError;
}

describe('handshake', () => {
  it('négocie la version et expose ce que le Host annonce (capacités inconnues ou invalides ignorées)', async () => {
    const { host, client } = setup({
      host: '2.1.0',
      capabilities: {
        secureStorage: { v: 1 },
        lifecycle: { v: 3 },
        futur: { v: 1 },
        files: { v: 0 },
        camera: 'x',
      } as never,
    });

    const info = await client.hello();

    expect(info).toEqual({
      protocol: 1,
      host: '2.1.0',
      platform: 'android',
      capabilities: { secureStorage: { v: 1 }, lifecycle: { v: 3 } },
    });
    expect(client.hostInfo).toBe(info);
    expect(host.sent[0]).toMatchObject({
      p: 'egen-host',
      v: 1,
      ns: 'host',
      m: 'hello',
      a: { protocol: { min: 1, max: 1 }, framework: '3.2.0' },
    });
  });

  it('est mémorisé : un seul message envoyé même si hello() est appelé plusieurs fois', async () => {
    const { host, client } = setup();
    await Promise.all([client.hello(), client.hello(), client.hello()]);
    await client.hello();
    expect(host.sent.filter((r) => r.m === 'hello')).toHaveLength(1);
    expect(host.subscribeCount).toBe(1);
  });

  it('protocole du Host non supporté ⇒ INCOMPATIBLE', async () => {
    const { client } = setup({ protocol: 2, replyVersion: 1 });
    expect((await rejection(client.hello())).code).toBe('INCOMPATIBLE');
  });

  it('Host qui répond dans une version de message inconnue ⇒ INCOMPATIBLE immédiat (pas de timeout)', async () => {
    const { client } = setup({ protocol: 1, replyVersion: 7 });
    expect((await rejection(client.hello())).code).toBe('INCOMPATIBLE');
  });

  it('plateforme annoncée différente de la cible du build ⇒ INCOMPATIBLE', async () => {
    const { client } = setup({ platform: 'ios' });
    const error = await rejection(client.hello());
    expect(error.code).toBe('INCOMPATIBLE');
    expect(error.message).toContain('ios');
  });

  it.each([
    ['null', null],
    ['tableau', []],
    ['sans version de Host', { protocol: 1, platform: 'android', capabilities: {} }],
    ['Host trop long', { protocol: 1, platform: 'android', host: 'x'.repeat(65), capabilities: {} }],
  ])('réponse hello invalide (%s) ⇒ INCOMPATIBLE', async (_label, helloResult) => {
    const { client } = setup({ helloResult });
    expect((await rejection(client.hello())).code).toBe('INCOMPATIBLE');
  });

  it('une incompatibilité est définitive : pas de nouvel envoi', async () => {
    const { host, client } = setup({ protocol: 2 });
    await rejection(client.hello());
    await rejection(client.hello());
    expect(host.sent.filter((r) => r.m === 'hello')).toHaveLength(1);
  });
});

describe('appels de capacités', () => {
  it('exige un handshake réussi (règle 1)', async () => {
    const { host, client } = setup();
    const error = await rejection(client.call('secureStorage', 'get', { key: 'k' }));
    expect(error.code).toBe('INCOMPATIBLE');
    expect(host.sent).toHaveLength(0);
  });

  it("refuse une capacité que le Host n'annonce pas, sans rien envoyer", async () => {
    const { host, client } = setup();
    await client.hello();
    const error = await rejection(client.call('camera', 'capture'));
    expect(error.code).toBe('UNAVAILABLE');
    expect(host.sent).toHaveLength(1); // le hello seul
  });

  it('réserve le namespace "host" au handshake', async () => {
    const { client } = setup();
    await client.hello();
    expect((await rejection(client.call('host', 'hello'))).code).toBe('INVALID_ARGS');
  });

  it('transmet les arguments et retourne le résultat', async () => {
    const { host, client } = setup({
      handlers: { 'secureStorage.get': (a) => `valeur-de-${(a as { key: string }).key}` },
    });
    await client.hello();

    await expect(client.call('secureStorage', 'get', { key: 'jeton' })).resolves.toBe('valeur-de-jeton');
    expect(host.sent[1]).toMatchObject({ ns: 'secureStorage', m: 'get', a: { key: 'jeton' } });
  });

  it('un appel sans argument n’envoie pas de champ `a`', async () => {
    const { host, client } = setup({ handlers: { 'secureStorage.get': () => null } });
    await client.hello();
    await client.call('secureStorage', 'get');
    expect(host.sent[1]).not.toHaveProperty('a');
  });

  it('convertit une erreur du Host en PlatformError (code connu conservé, retryable repris)', async () => {
    const { client } = setup({
      handlers: {
        'secureStorage.get': () => {
          throw Object.assign(new Error('refusé par l’utilisateur'), { code: 'DENIED' });
        },
      },
    });
    await client.hello();
    const error = await rejection(client.call('secureStorage', 'get', {}));
    expect(error).toMatchObject({
      code: 'DENIED',
      message: 'refusé par l’utilisateur',
      capability: 'secureStorage',
      method: 'get',
      retryable: false,
    });
  });

  it('code d’erreur inconnu ⇒ HOST_ERROR ; message tronqué ; contenu non fiable jamais propagé tel quel', async () => {
    const { client } = setup({
      handlers: {
        'secureStorage.get': () => {
          throw Object.assign(new Error('x'.repeat(2000)), { code: 'PIRATE' });
        },
      },
    });
    await client.hello();
    const error = await rejection(client.call('secureStorage', 'get', {}));
    expect(error.code).toBe('HOST_ERROR');
    expect(error.message.length).toBeLessThanOrEqual(500);
  });

  it('G4 : aucun argument d’appel (jeton) ne se retrouve dans les erreurs, leur pile ou leur sérialisation', async () => {
    const SECRET = 'Bearer SECRET-TOKEN-123';
    const { client } = setup({
      handlers: {
        'secureStorage.get': () => {
          throw Object.assign(new Error('refus du Host'), { code: 'DENIED' });
        },
      },
    });
    await client.hello();

    const failures = [
      // Hôte qui refuse
      await rejection(client.call('secureStorage', 'get', { token: SECRET })),
      // Arguments trop volumineux
      await rejection(client.call('secureStorage', 'set', { token: SECRET.repeat(MAX_MESSAGE_LENGTH) })),
      // Arguments non sérialisables
      await rejection(client.call('secureStorage', 'set', { token: SECRET, self: (() => { const o: Record<string, unknown> = {}; o.o = o; return o; })() })),
    ];

    for (const error of failures) {
      const everything = [error.message, error.stack ?? '', JSON.stringify({ ...error })].join('\n');
      expect(everything).not.toContain('SECRET-TOKEN');
    }
  });

  it('les réponses arrivant dans le désordre sont associées au bon appel', async () => {
    const releases: Record<string, () => void> = {};
    const gate = (name: string) =>
      new Promise<string>((resolve) => {
        releases[name] = () => resolve(name);
      });
    const { client } = setup({ handlers: { 'secureStorage.get': (a) => gate((a as { key: string }).key) } });
    await client.hello();

    const first = client.call('secureStorage', 'get', { key: 'premier' });
    const second = client.call('secureStorage', 'get', { key: 'second' });
    await vi.waitFor(() => expect(Object.keys(releases)).toHaveLength(2));
    releases.second();
    releases.premier();

    await expect(Promise.all([first, second])).resolves.toEqual(['premier', 'second']);
  });

  it('64 appels simultanés : chacun reçoit SA réponse, plus rien en vol', async () => {
    const { client } = setup({ handlers: { 'secureStorage.get': (a) => (a as { n: number }).n * 2 } });
    await client.hello();

    const results = await Promise.all(
      Array.from({ length: 64 }, (_, n) => client.call<number>('secureStorage', 'get', { n })),
    );

    expect(results).toEqual(Array.from({ length: 64 }, (_, n) => n * 2));
    expect(client.stats().inFlight).toBe(0);
  });

  it('les identifiants de requête sont uniques', async () => {
    const { host, client } = setup({ handlers: { 'secureStorage.get': () => 1 } });
    await client.hello();
    await Promise.all(Array.from({ length: 50 }, () => client.call('secureStorage', 'get')));
    const ids = host.sent.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('validation des arguments (avant tout envoi)', () => {
  it.each([
    ['namespace invalide', 'secure-storage', 'get'],
    ['méthode invalide', 'secureStorage', 'get;drop'],
    ['méthode vide', 'secureStorage', ''],
    ['commence par un chiffre', 'secureStorage', '1get'],
  ])('%s ⇒ INVALID_ARGS', async (_label, ns, m) => {
    const { host, client } = setup();
    await client.hello();
    expect((await rejection(client.call(ns, m))).code).toBe('INVALID_ARGS');
    expect(host.sent).toHaveLength(1);
  });

  it('arguments non sérialisables (référence circulaire) ⇒ INVALID_ARGS', async () => {
    const { host, client } = setup();
    await client.hello();
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect((await rejection(client.call('secureStorage', 'set', circular))).code).toBe('INVALID_ARGS');
    expect(host.sent).toHaveLength(1);
  });

  it('message trop volumineux ⇒ INVALID_ARGS (référence de fichier attendue)', async () => {
    const { host, client } = setup();
    await client.hello();
    const error = await rejection(client.call('secureStorage', 'set', { v: 'x'.repeat(MAX_MESSAGE_LENGTH) }));
    expect(error.code).toBe('INVALID_ARGS');
    expect(error.message).toContain('référence de fichier');
    expect(host.sent).toHaveLength(1);
  });

  it('échec de bridge.send ⇒ HOST_ERROR, sans appel en vol résiduel', async () => {
    const host = createMockHost({ capabilities: CAPS });
    const client = createBridgeClient({ bridge: host.bridge, environment: 'android' });
    await client.hello();
    const bridge = {
      send: () => {
        throw new Error('WebView détruite');
      },
      subscribe: host.bridge.subscribe,
    };
    const failing = createBridgeClient({ bridge, environment: 'android' });
    const error = await rejection(failing.hello());
    expect(error.code).toBe('HOST_ERROR');
    expect(error.message).toContain('WebView détruite');
    expect(failing.stats().inFlight).toBe(0);
  });
});

describe('délais', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('hello : TIMEOUT rejouable, puis un second essai peut réussir', async () => {
    const host = createMockHost({ capabilities: CAPS, respond: false });
    const client = createBridgeClient({ bridge: host.bridge, environment: 'android', timeoutMs: 1000 });

    const first = rejection(client.hello());
    await vi.advanceTimersByTimeAsync(1000);
    const error = await first;
    expect(error).toMatchObject({ code: 'TIMEOUT', retryable: true });

    // Le Host « se réveille » : un nouvel appel doit renvoyer un hello (échec passager non mémorisé).
    const retry = client.hello();
    retry.catch(() => {});
    expect(host.sent.filter((r) => r.m === 'hello')).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1000);
  });

  it('appel : TIMEOUT retryable, délai par appel prioritaire, réponse tardive ignorée', async () => {
    const host = createMockHost({
      capabilities: CAPS,
      latencyMs: 5000,
      handlers: { 'secureStorage.get': () => 'tard' },
    });
    const client = createBridgeClient({ bridge: host.bridge, environment: 'android', timeoutMs: 60_000 });
    const hello = client.hello();
    await vi.advanceTimersByTimeAsync(5000);
    await hello;

    const pendingCall = rejection(client.call('secureStorage', 'get', {}, { timeoutMs: 100 }));
    await vi.advanceTimersByTimeAsync(100);
    expect(await pendingCall).toMatchObject({
      code: 'TIMEOUT',
      retryable: true,
      capability: 'secureStorage',
      method: 'get',
    });
    expect(client.stats().inFlight).toBe(0);

    await vi.advanceTimersByTimeAsync(5000); // la réponse arrive après expiration
    expect(client.stats().ignoredMessages).toBe(1);
  });
});

describe('messages entrants', () => {
  it('ignore et compte tout ce qui est invalide, orphelin ou de version inconnue — sans effet de bord', async () => {
    const { host, client } = setup();
    await client.hello();
    const before = client.stats().ignoredMessages;

    host.inject('{pas du json');
    host.inject(JSON.stringify({ p: 'autre', v: 1, id: 'x', ok: true }));
    host.inject(JSON.stringify({ p: 'egen-host', v: 1, id: 'inconnu', ok: true, r: 1 })); // orpheline
    host.inject(JSON.stringify({ p: 'egen-host', v: 9, ev: 'lifecycle.resume' })); // événement de version inconnue
    host.inject('x'.repeat(MAX_MESSAGE_LENGTH + 1));

    expect(client.stats().ignoredMessages - before).toBe(5);
    expect(client.stats().inFlight).toBe(0);
  });
});

describe('événements', () => {
  it('route un événement à ses abonnés, avec sa donnée', async () => {
    const { host, client } = setup();
    await client.hello();
    const resume = vi.fn();
    const other = vi.fn();
    client.onEvent('lifecycle.resume', resume);
    client.onEvent('lifecycle.pause', other);

    host.emit('lifecycle.resume', { at: 1 });

    expect(resume).toHaveBeenCalledWith({ at: 1 });
    expect(other).not.toHaveBeenCalled();
  });

  it('se désabonne proprement', async () => {
    const { host, client } = setup();
    await client.hello();
    const callback = vi.fn();
    const unsubscribe = client.onEvent('lifecycle.resume', callback);
    unsubscribe();
    host.emit('lifecycle.resume');
    expect(callback).not.toHaveBeenCalled();
  });

  it("un abonné qui lève n'empêche ni les autres abonnés ni la suite", async () => {
    const { host, client } = setup();
    await client.hello();
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const healthy = vi.fn();
    client.onEvent('lifecycle.resume', () => {
      throw new Error('bug applicatif');
    });
    client.onEvent('lifecycle.resume', healthy);

    host.emit('lifecycle.resume');

    expect(healthy).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});
