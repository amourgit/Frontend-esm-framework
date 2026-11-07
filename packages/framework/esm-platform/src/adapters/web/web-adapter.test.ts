import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPlatform } from '../../platform';
import { isPlatformError } from '../../errors';
import { createWebCapabilities } from './index';
import { getWebFile, releaseWebFile } from './file-registry';
import { assertExternalUrl } from './open-external';

const w = window as unknown as Record<string, unknown>;

/** Simule le sélecteur de fichiers : à `click()`, l'input reçoit `files` (ou un événement `cancel`). */
function stubFilePicker(behaviour: { files?: File[]; cancel?: boolean }) {
  const inputs: HTMLInputElement[] = [];
  vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(function (this: HTMLInputElement) {
    inputs.push(this);
    // Le navigateur émet l'événement après le retour de `click()`.
    queueMicrotask(() => {
      if (behaviour.cancel) {
        this.dispatchEvent(new Event('cancel'));
        return;
      }
      Object.defineProperty(this, 'files', { value: behaviour.files ?? [], configurable: true });
      this.dispatchEvent(new Event('change'));
    });
  });
  return inputs;
}

/** happy-dom fournit une API Permissions : l'absence doit être simulée explicitement. */
const removePermissionsApi = () =>
  Object.defineProperty(navigator, 'permissions', { value: undefined, configurable: true });

const pdf = () => new File(['contenu'], 'bilan.pdf', { type: 'application/pdf' });
const rejection = (promise: Promise<unknown>) =>
  promise.then(
    () => {
      throw new Error('devait rejeter');
    },
    (error: unknown) => error,
  );

beforeEach(() => {
  delete w.egenTarget;
});
afterEach(() => {
  vi.restoreAllMocks();
  delete (navigator as unknown as Record<string, unknown>).permissions;
  delete w.Notification;
  document.body.innerHTML = '';
});

describe('session (fournisseur vide : le cookie reste le mécanisme)', () => {
  const { session } = getPlatform();

  it('getAuthorization → null, refresh → false, clear → no-op', async () => {
    await expect(session.getAuthorization()).resolves.toBeNull();
    await expect(session.refresh()).resolves.toBe(false);
    await expect(session.clear()).resolves.toBeUndefined();
  });

  it('setTokens → UNAVAILABLE : aucun jeton n’est stocké dans le navigateur', async () => {
    const error = await rejection(session.setTokens({ access: 'SECRET-ACCESS' }));
    expect(error).toMatchObject({ code: 'UNAVAILABLE', capability: 'session', method: 'setTokens' });
    expect(String((error as Error).message)).not.toContain('SECRET-ACCESS');
    expect(JSON.stringify(localStorage)).not.toContain('SECRET-ACCESS');
    expect(JSON.stringify(sessionStorage)).not.toContain('SECRET-ACCESS');
  });
});

describe('secureStorage, push, biometric : jamais simulés', () => {
  it.each([
    ['secureStorage', 'get'],
    ['secureStorage', 'set'],
    ['secureStorage', 'remove'],
    ['push', 'register'],
    ['biometric', 'isAvailable'],
    ['biometric', 'authenticate'],
  ] as const)('%s.%s → UNAVAILABLE en Web', async (capability, method) => {
    const platform = getPlatform();
    expect(platform.has(capability)).toBe(false);
    const target = platform[capability] as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>;
    await expect(target[method]('k', 'v')).rejects.toMatchObject({ code: 'UNAVAILABLE', capability, method });
  });

  it('secureStorage.set n’écrit rien dans localStorage (pas de faux coffre)', async () => {
    await getPlatform()
      .secureStorage.set('clé', 'valeur-secrète')
      .catch(() => {});
    expect(localStorage.getItem('clé')).toBeNull();
    expect(JSON.stringify(localStorage)).not.toContain('valeur-secrète');
  });
});

describe('openExternal', () => {
  it.each(['https://exemple.ga/page?x=1', 'mailto:contact@exemple.ga', 'tel:+24101020304'])(
    'ouvre %s avec window.open(_blank, noopener,noreferrer)',
    async (url) => {
      const open = vi.spyOn(window, 'open').mockReturnValue(null);
      await getPlatform().openExternal.open(url);
      expect(open).toHaveBeenCalledTimes(1);
      expect(open).toHaveBeenCalledWith(new URL(url).href, '_blank', 'noopener,noreferrer');
    },
  );

  it.each([
    'http://exemple.ga',
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'file:///etc/passwd',
    'ftp://exemple.ga',
    '//exemple.ga',
    '/chemin/relatif',
    'pas une url',
    '',
  ])('refuse %j (INVALID_ARGS) sans rien ouvrir', async (url) => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const error = await rejection(getPlatform().openExternal.open(url));
    expect(error).toMatchObject({ code: 'INVALID_ARGS', capability: 'openExternal', method: 'open' });
    expect(open).not.toHaveBeenCalled();
  });

  it('refuse une valeur qui n’est pas une chaîne', async () => {
    await expect(getPlatform().openExternal.open(undefined as unknown as string)).rejects.toMatchObject({
      code: 'INVALID_ARGS',
    });
  });

  it('le message d’erreur ne reprend jamais l’URL (elle peut contenir un secret)', () => {
    try {
      assertExternalUrl('javascript:steal("TOKEN-SECRET")');
    } catch (error) {
      expect((error as Error).message).not.toContain('TOKEN-SECRET');
    }
  });
});

describe('lifecycle (visibilitychange)', () => {
  function setVisibility(state: 'visible' | 'hidden') {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
    document.dispatchEvent(new Event('visibilitychange'));
  }
  afterEach(() => {
    delete (document as unknown as Record<string, unknown>).visibilityState;
  });

  it('onResume ne se déclenche que quand la page redevient visible ; onPause quand elle est masquée', () => {
    const { lifecycle } = getPlatform();
    const resume = vi.fn();
    const pause = vi.fn();
    const offResume = lifecycle.onResume(resume);
    const offPause = lifecycle.onPause(pause);

    setVisibility('hidden');
    expect(pause).toHaveBeenCalledTimes(1);
    expect(resume).not.toHaveBeenCalled();

    setVisibility('visible');
    expect(resume).toHaveBeenCalledTimes(1);
    expect(pause).toHaveBeenCalledTimes(1);

    offResume();
    offPause();
  });

  it('la fonction retournée désabonne', () => {
    const resume = vi.fn();
    const off = getPlatform().lifecycle.onResume(resume);
    off();
    setVisibility('visible');
    expect(resume).not.toHaveBeenCalled();
  });

  it('plusieurs abonnés sont indépendants', () => {
    const { lifecycle } = getPlatform();
    const a = vi.fn();
    const b = vi.fn();
    const offA = lifecycle.onResume(a);
    const offB = lifecycle.onResume(b);
    offA();
    setVisibility('visible');
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
    offB();
  });

  it('un callback qui n’est pas une fonction lève INVALID_ARGS', () => {
    expect(() => getPlatform().lifecycle.onResume('x' as unknown as () => void)).toThrowError(
      expect.objectContaining({ code: 'INVALID_ARGS', method: 'onResume' }),
    );
  });
});

describe('files', () => {
  it('select : <input type="file"> éphémère, handles sans binaire, input retiré du document', async () => {
    const inputs = stubFilePicker({ files: [pdf()] });
    const handles = await getPlatform().files.select({ accept: ['application/pdf', '.csv'] });

    expect(inputs).toHaveLength(1);
    expect(inputs[0].type).toBe('file');
    expect(inputs[0].accept).toBe('application/pdf,.csv');
    expect(inputs[0].multiple).toBe(false);
    expect(document.body.contains(inputs[0])).toBe(false);
    expect(handles).toEqual([{ id: expect.any(String), name: 'bilan.pdf', size: 7, mime: 'application/pdf' }]);
    expect(Object.keys(handles[0]).sort()).toEqual(['id', 'mime', 'name', 'size']);
  });

  it('select multiple : un handle par fichier, identifiants distincts, fichiers retrouvables puis libérables', async () => {
    const inputs = stubFilePicker({ files: [pdf(), new File(['x'], 'a.png', { type: '' })] });
    const handles = await getPlatform().files.select({ multiple: true });
    expect(inputs[0].multiple).toBe(true);
    expect(new Set(handles.map((h) => h.id)).size).toBe(2);
    expect(handles[1].mime).toBe('application/octet-stream');
    expect(getWebFile(handles[0].id)?.name).toBe('bilan.pdf');
    expect(releaseWebFile(handles[0].id)).toBe(true);
    expect(getWebFile(handles[0].id)).toBeUndefined();
    expect(releaseWebFile(handles[0].id)).toBe(false);
  });

  it('annulation (événement cancel) → CANCELLED, input retiré', async () => {
    const inputs = stubFilePicker({ cancel: true });
    const error = await rejection(getPlatform().files.select());
    expect(error).toMatchObject({ code: 'CANCELLED', capability: 'files', method: 'select' });
    expect(document.body.contains(inputs[0])).toBe(false);
  });

  it('aucun fichier choisi → CANCELLED', async () => {
    stubFilePicker({ files: [] });
    await expect(getPlatform().files.select()).rejects.toMatchObject({ code: 'CANCELLED' });
  });

  it.each([['<script>'], ['image/*;x'], [''], ['a b']])(
    'accept invalide %j → INVALID_ARGS, sélecteur jamais ouvert',
    async (entry) => {
      const inputs = stubFilePicker({ files: [pdf()] });
      await expect(getPlatform().files.select({ accept: [entry] })).rejects.toMatchObject({ code: 'INVALID_ARGS' });
      expect(inputs).toHaveLength(0);
    },
  );

  it('download n’est pas fourni en Web (UNAVAILABLE), select l’est', async () => {
    const platform = getPlatform();
    expect(platform.has('files')).toBe(true);
    await expect(platform.files.download('https://exemple.ga/f.pdf', 'f.pdf')).rejects.toMatchObject({
      code: 'UNAVAILABLE',
      method: 'download',
    });
  });
});

describe('camera (input capture — choix documenté dans camera.ts)', () => {
  it('capture arrière par défaut : accept image/*, attribut capture=environment', async () => {
    const inputs = stubFilePicker({ files: [new File(['p'], 'photo.jpg', { type: 'image/jpeg' })] });
    const handle = await getPlatform().camera.capture();
    expect(inputs[0].accept).toBe('image/*');
    const capture = inputs[0].getAttribute('capture');
    expect(capture).toBe('environment');
    expect(handle).toMatchObject({ name: 'photo.jpg', mime: 'image/jpeg', size: 1 });
  });

  it('facing "front" → capture=user ; "back" → environment', async () => {
    const file = new File(['p'], 'photo.jpg', { type: 'image/jpeg' });
    const front = stubFilePicker({ files: [file] });
    await getPlatform().camera.capture({ facing: 'front' });
    const frontCapture = front[0].getAttribute('capture');
    expect(frontCapture).toBe('user');
    vi.restoreAllMocks();
    const back = stubFilePicker({ files: [file] });
    await getPlatform().camera.capture({ facing: 'back' });
    const backCapture = back[0].getAttribute('capture');
    expect(backCapture).toBe('environment');
  });

  it('facing invalide → INVALID_ARGS ; annulation → CANCELLED', async () => {
    await expect(getPlatform().camera.capture({ facing: 'left' as 'front' })).rejects.toMatchObject({
      code: 'INVALID_ARGS',
    });
    stubFilePicker({ cancel: true });
    await expect(getPlatform().camera.capture()).rejects.toMatchObject({ code: 'CANCELLED', capability: 'camera' });
  });
});

describe('permissions (API Permissions du navigateur)', () => {
  const stubPermissions = (query: (d: { name: string }) => Promise<{ state: string }>) =>
    Object.defineProperty(navigator, 'permissions', { value: { query }, configurable: true });

  it('sans API Permissions : capacité non fournie (has faux), méthodes UNAVAILABLE', async () => {
    removePermissionsApi();
    const platform = getPlatform();
    expect(platform.has('permissions')).toBe(false);
    await expect(platform.permissions.check('camera')).rejects.toMatchObject({ code: 'UNAVAILABLE' });
  });

  it.each(['granted', 'denied', 'prompt'])('check retourne l’état du navigateur (%s)', async (state) => {
    const query = vi.fn(async () => ({ state }));
    stubPermissions(query);
    const platform = getPlatform();
    expect(platform.has('permissions')).toBe(true);
    await expect(platform.permissions.check('microphone')).resolves.toBe(state);
    expect(query).toHaveBeenCalledWith({ name: 'microphone' });
  });

  it('un nom que le navigateur ne connaît pas → UNAVAILABLE (jamais une valeur inventée)', async () => {
    stubPermissions(async () => {
      throw new TypeError('inconnu');
    });
    await expect(getPlatform().permissions.check('camera')).rejects.toMatchObject({
      code: 'UNAVAILABLE',
      method: 'check',
    });
  });

  it('files n’a pas d’équivalent Web → UNAVAILABLE, sans interroger le navigateur', async () => {
    const query = vi.fn(async () => ({ state: 'granted' }));
    stubPermissions(query);
    await expect(getPlatform().permissions.check('files')).rejects.toMatchObject({ code: 'UNAVAILABLE' });
    expect(query).not.toHaveBeenCalled();
  });

  it('nom inconnu → INVALID_ARGS', async () => {
    stubPermissions(async () => ({ state: 'granted' }));
    await expect(getPlatform().permissions.check('gps' as 'camera')).rejects.toMatchObject({ code: 'INVALID_ARGS' });
    await expect(getPlatform().permissions.request('gps' as 'camera')).rejects.toMatchObject({ code: 'INVALID_ARGS' });
  });

  it.each([
    ['granted', 'granted'],
    ['denied', 'denied'],
    ['default', 'denied'], // fenêtre fermée sans choix : ce n’est pas un octroi
  ])('request(notifications) : Notification.requestPermission = %s → %s', async (browser, expected) => {
    stubPermissions(async () => ({ state: 'prompt' }));
    w.Notification = { requestPermission: vi.fn(async () => browser) };
    await expect(getPlatform().permissions.request('notifications')).resolves.toBe(expected);
  });

  it.each(['camera', 'microphone', 'files'] as const)(
    'request(%s) → UNAVAILABLE (le navigateur demande à l’usage)',
    async (name) => {
      stubPermissions(async () => ({ state: 'prompt' }));
      await expect(getPlatform().permissions.request(name)).rejects.toMatchObject({
        code: 'UNAVAILABLE',
        method: 'request',
      });
    },
  );
});

describe('assemblage Web', () => {
  it('createWebCapabilities : exactement les capacités fournies par un navigateur sans API Permissions', () => {
    removePermissionsApi();
    expect(Object.keys(createWebCapabilities()).sort()).toEqual([
      'camera',
      'files',
      'lifecycle',
      'openExternal',
      'session',
    ]);
  });

  it('getPlatform() en Web : has() reflète les capacités réellement fournies', async () => {
    Object.defineProperty(navigator, 'permissions', {
      value: { query: async () => ({ state: 'prompt' }) },
      configurable: true,
    });
    const platform = getPlatform();
    expect(platform.environment).toBe('web');
    await expect(platform.ready).resolves.toBeUndefined();
    const provided = ['session', 'openExternal', 'lifecycle', 'files', 'camera', 'permissions'] as const;
    const absent = ['secureStorage', 'push', 'biometric'] as const;
    for (const name of provided) expect(platform.has(name)).toBe(true);
    for (const name of absent) expect(platform.has(name)).toBe(false);
  });

  it('en natif, l’adaptateur Web n’est JAMAIS utilisé (aucune capacité du navigateur ne fuit vers un Host absent)', () => {
    w.egenTarget = 'android';
    const platform = getPlatform();
    for (const name of [
      'session',
      'openExternal',
      'lifecycle',
      'files',
      'camera',
      'permissions',
      'secureStorage',
      'push',
      'biometric',
    ] as const) {
      expect(platform.has(name)).toBe(false);
    }
  });

  it('toute erreur d’une capacité Web est une PlatformError (jamais une Error générique)', async () => {
    const errors = await Promise.all([
      rejection(getPlatform().openExternal.open('http://x')),
      rejection(getPlatform().files.download('https://x', 'f')),
      rejection(getPlatform().session.setTokens({ access: 'a' })),
    ]);
    for (const error of errors) expect(isPlatformError(error)).toBe(true);
  });
});
