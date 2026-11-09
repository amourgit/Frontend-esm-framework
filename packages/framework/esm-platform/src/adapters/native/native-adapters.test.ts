import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPlatform } from '../../index';
import { PlatformError } from '../../errors';
import { createMockHost, type MockHostOptions } from '../../testing';
import { MAX_SECRET_LENGTH } from './validate';

afterEach(() => {
  const w = window as unknown as Record<string, unknown>;
  delete w.egenTarget;
  delete w.egenHostBridge;
});

const ALL = { session: { v: 1 }, secureStorage: { v: 1 }, openExternal: { v: 1 }, lifecycle: { v: 1 } } as const;

async function native(options: MockHostOptions = {}) {
  window.egenTarget = 'android';
  const host = createMockHost({ capabilities: ALL, ...options });
  host.install();
  const platform = getPlatform();
  await platform.ready;
  return { host, platform };
}

const sentAfterHello = (host: { sent: Array<Record<string, unknown>> }) => host.sent.slice(1);

async function rejection(promise: Promise<unknown>): Promise<PlatformError> {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(PlatformError);
  return error as PlatformError;
}

describe('session (natif)', () => {
  it("getAuthorization : retourne l'en-tête fourni par le Host ; null = pas de session", async () => {
    const { platform } = await native({ handlers: { 'session.getAuthorization': () => 'Bearer abc.def' } });
    await expect(platform.session.getAuthorization()).resolves.toBe('Bearer abc.def');

    const none = await native({ handlers: { 'session.getAuthorization': () => null } });
    await expect(none.platform.session.getAuthorization()).resolves.toBeNull();
  });

  it.each([
    ['injection CRLF', 'Bearer x\r\nSet-Cookie: pirate=1'],
    ['saut de ligne', 'Bearer x\ny'],
    ['non textuel', 42],
    ['vide', ''],
    ['caractère non ASCII', 'Bearer é'],
    ['démesuré', 'B'.repeat(MAX_SECRET_LENGTH + 1)],
  ])('refuse une réponse du Host invalide (%s) ⇒ HOST_ERROR, sans reprendre la valeur', async (_label, value) => {
    const { platform } = await native({ handlers: { 'session.getAuthorization': () => value } });
    const error = await rejection(platform.session.getAuthorization());
    expect(error.code).toBe('HOST_ERROR');
    expect(error.message).not.toContain('pirate');
  });

  it('setTokens : ne transmet QUE les champs connus', async () => {
    const { host, platform } = await native({ handlers: { 'session.setTokens': () => null } });
    await platform.session.setTokens({ access: 'a', refresh: 'r', expiresAt: 123, extra: 'secret-parasite' } as never);
    expect(sentAfterHello(host)[0]).toMatchObject({
      ns: 'session',
      m: 'setTokens',
      a: { access: 'a', refresh: 'r', expiresAt: 123 },
    });
    expect(JSON.stringify(sentAfterHello(host)[0])).not.toContain('secret-parasite');
  });

  it.each([
    ['access absent', {}],
    ['access vide', { access: '' }],
    ['access non textuel', { access: 5 }],
    ['refresh vide', { access: 'a', refresh: '' }],
    ['expiresAt non fini', { access: 'a', expiresAt: Infinity }],
    ['expiresAt non numérique', { access: 'a', expiresAt: '1' }],
  ])('setTokens : %s ⇒ INVALID_ARGS, rien envoyé, jeton absent du message', async (_label, tokens) => {
    const { host, platform } = await native();
    const error = await rejection(platform.session.setTokens(tokens as never));
    expect(error.code).toBe('INVALID_ARGS');
    expect(sentAfterHello(host)).toHaveLength(0);
  });

  it('refresh : booléen strict ; clear transmis', async () => {
    const ok = await native({ handlers: { 'session.refresh': () => true, 'session.clear': () => null } });
    await expect(ok.platform.session.refresh()).resolves.toBe(true);
    await ok.platform.session.clear();
    expect(ok.host.sent.map((r) => r.m)).toEqual(['hello', 'refresh', 'clear']);

    const bad = await native({ handlers: { 'session.refresh': () => 'oui' } });
    expect((await rejection(bad.platform.session.refresh())).code).toBe('HOST_ERROR');
  });

  it('une erreur du Host (ex. DENIED) est propagée en PlatformError typée', async () => {
    const { platform } = await native({
      handlers: {
        'session.refresh': () => {
          throw Object.assign(new Error('session expirée'), { code: 'DENIED' });
        },
      },
    });
    expect(await rejection(platform.session.refresh())).toMatchObject({
      code: 'DENIED',
      capability: 'session',
      method: 'refresh',
    });
  });
});

describe('secureStorage (natif)', () => {
  it('get / set / remove', async () => {
    const store = new Map<string, string>();
    const { host, platform } = await native({
      handlers: {
        'secureStorage.set': (a) => void store.set((a as { key: string }).key, (a as { value: string }).value),
        'secureStorage.get': (a) => store.get((a as { key: string }).key) ?? null,
        'secureStorage.remove': (a) => void store.delete((a as { key: string }).key),
      },
    });

    await platform.secureStorage.set('refresh', 'secret');
    await expect(platform.secureStorage.get('refresh')).resolves.toBe('secret');
    await platform.secureStorage.remove('refresh');
    await expect(platform.secureStorage.get('refresh')).resolves.toBeNull();
    expect(host.sent.map((r) => r.m)).toEqual(['hello', 'set', 'get', 'remove', 'get']);
  });

  it.each([
    ['clé vide', ''],
    ['clé trop longue', 'k'.repeat(257)],
    ['clé non textuelle', 7],
  ])('%s ⇒ INVALID_ARGS sans envoi', async (_label, key) => {
    const { host, platform } = await native();
    expect((await rejection(platform.secureStorage.get(key as never))).code).toBe('INVALID_ARGS');
    expect((await rejection(platform.secureStorage.remove(key as never))).code).toBe('INVALID_ARGS');
    expect(sentAfterHello(host)).toHaveLength(0);
  });

  it('set exige une valeur textuelle : aucune sérialisation implicite', async () => {
    const { host, platform } = await native();
    expect((await rejection(platform.secureStorage.set('k', { a: 1 } as never))).code).toBe('INVALID_ARGS');
    expect(sentAfterHello(host)).toHaveLength(0);
  });

  it('get : réponse du Host non textuelle ⇒ HOST_ERROR', async () => {
    const { platform } = await native({ handlers: { 'secureStorage.get': () => ({ piege: true }) } });
    expect((await rejection(platform.secureStorage.get('k'))).code).toBe('HOST_ERROR');
  });
});

describe('openExternal (natif)', () => {
  it('transmet l’URL normalisée au Host', async () => {
    const { host, platform } = await native({ handlers: { 'openExternal.open': () => null } });
    await platform.openExternal.open('https://exemple.ga/a b?x=1');
    expect(sentAfterHello(host)[0]).toMatchObject({
      ns: 'openExternal',
      m: 'open',
      a: { url: 'https://exemple.ga/a%20b?x=1' },
    });
  });

  it.each([
    'javascript:alert(1)',
    'data:text/html,<script>1</script>',
    'file:///etc/passwd',
    'http://exemple.ga',
    'intent://x#Intent;end',
    'pas une url',
    42,
  ])('refuse %s AVANT tout envoi', async (url) => {
    const { host, platform } = await native();
    expect((await rejection(platform.openExternal.open(url as string))).code).toBe('INVALID_ARGS');
    expect(sentAfterHello(host)).toHaveLength(0);
  });

  it.each(['mailto:contact@exemple.ga', 'tel:+24101020304'])('accepte %s', async (url) => {
    const { platform } = await native({ handlers: { 'openExternal.open': () => null } });
    await expect(platform.openExternal.open(url)).resolves.toBeUndefined();
  });
});

describe('lifecycle (natif)', () => {
  it('reprise / mise en arrière-plan : événements du Host, désabonnement', async () => {
    const { host, platform } = await native();
    const resume = vi.fn();
    const pause = vi.fn();
    const stopResume = platform.lifecycle.onResume(resume);
    platform.lifecycle.onPause(pause);

    host.emit('lifecycle.resume');
    host.emit('lifecycle.pause');
    host.emit('lifecycle.resume');
    expect(resume).toHaveBeenCalledTimes(2);
    expect(pause).toHaveBeenCalledTimes(1);

    stopResume();
    host.emit('lifecycle.resume');
    expect(resume).toHaveBeenCalledTimes(2);
  });

  it('callback invalide ⇒ INVALID_ARGS (levé, faute de promesse)', async () => {
    const { platform } = await native();
    expect(() => platform.lifecycle.onResume('x' as never)).toThrowError(
      expect.objectContaining({ code: 'INVALID_ARGS' }),
    );
  });

  it("n'envoie aucune requête : les événements sont poussés par le Host", async () => {
    const { host, platform } = await native();
    platform.lifecycle.onPause(() => {});
    expect(sentAfterHello(host)).toHaveLength(0);
  });
});

describe('disponibilité', () => {
  it('has() : vrai seulement pour ce que le Host annonce', async () => {
    const { platform } = await native({ capabilities: { session: { v: 1 }, lifecycle: { v: 1 } } });
    expect(platform.has('session')).toBe(true);
    expect(platform.has('lifecycle')).toBe(true);
    expect(platform.has('secureStorage')).toBe(false);
    expect(platform.has('openExternal')).toBe(false);
    expect((await rejection(platform.secureStorage.get('k'))).code).toBe('UNAVAILABLE');
  });
});
