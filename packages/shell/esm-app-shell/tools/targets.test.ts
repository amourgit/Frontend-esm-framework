import { describe, expect, it } from 'vitest';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resolveTarget, buildNativeCsp, TARGETS, NATIVE_PUBLIC_PATH } = require('./targets');

type Env = Record<string, string | undefined>;

const IMPORTMAP = '{"imports":{"@egen/x-app":"./x.js"}}';
const ROUTES = '{"@egen/x-app":{"pages":[]}}';

/** Environnement natif valide : chaque test d'erreur en retire/modifie exactement une valeur. */
const validNative = (overrides: Env = {}): Env => ({
  EGEN_TARGET: 'android',
  EGEN_ENV: 'production',
  EGEN_API_URL: 'https://api.exemple.ga/egen',
  EGEN_ESM_IMPORTMAP: IMPORTMAP,
  EGEN_ROUTES: ROUTES,
  ...overrides,
});

describe('resolveTarget — web (non-régression : défauts identiques à l’existant)', () => {
  it('sans aucune variable : comportement Web historique', () => {
    expect(resolveTarget({})).toEqual({
      target: 'web',
      native: false,
      publicPath: '/egen-civitas/spa',
      serviceWorker: false,
      offlineData: false,
      importmapMode: 'url',
      routesMode: 'url',
      allowImportMapOverrides: true,
      allowDevAuthBypass: true,
      requireAbsoluteApiUrl: false,
      csp: null,
    });
  });

  it.each([undefined, ''])('EGEN_TARGET=%j équivaut à web', (value) => {
    expect(resolveTarget({ EGEN_TARGET: value }).target).toBe('web');
  });

  it.each([
    ['/egen-civitas/spa', '/egen-civitas/spa'],
    ['/custom/spa/', '/custom/spa'],
    ['/custom/spa///', '/custom/spa'],
    ['/', ''],
    ['', '/egen-civitas/spa'], // piège connu : la chaîne vide retombe sur le défaut
    [undefined, '/egen-civitas/spa'],
  ])('EGEN_PUBLIC_PATH=%j → publicPath %j', (input, expected) => {
    expect(resolveTarget({ EGEN_PUBLIC_PATH: input }).publicPath).toBe(expected);
  });

  it('EGEN_OFFLINE=enable active service worker ET données hors ligne ; toute autre valeur : aucun des deux', () => {
    expect(resolveTarget({ EGEN_OFFLINE: 'enable' })).toMatchObject({ serviceWorker: true, offlineData: true });
    for (const value of [undefined, '', 'disable', 'true', 'ENABLE']) {
      expect(resolveTarget({ EGEN_OFFLINE: value })).toMatchObject({ serviceWorker: false, offlineData: false });
    }
  });

  it('EGEN_OFFLINE_DATA est ignoré en web', () => {
    expect(resolveTarget({ EGEN_OFFLINE_DATA: 'disable', EGEN_OFFLINE: 'enable' }).offlineData).toBe(true);
  });

  it.each([
    [undefined, 'url'],
    ['', 'url'],
    ['{}', 'url'],
    ['{"imports":{}}', 'url'], // forme réelle de build:production / watch
    [IMPORTMAP, 'inline'],
    ['pas du json', 'inline'], // on ne devine pas : le parsing échouera, de façon explicite, côté client
  ])('import map %j → mode %s (même règle que isMeaningfulImportmap)', (value, mode) => {
    expect(resolveTarget({ EGEN_ESM_IMPORTMAP: value }).importmapMode).toBe(mode);
  });

  it.each([
    [undefined, 'url'],
    ['{}', 'url'],
    [ROUTES, 'inline'],
  ])('routes %j → mode %s', (value, mode) => {
    expect(resolveTarget({ EGEN_ROUTES: value }).routesMode).toBe(mode);
  });

  it('n’impose aucune validation native : bypass d’auth, API relative et EGEN_ENV=development restent permis', () => {
    expect(() =>
      resolveTarget({ EGEN_DEV_NO_AUTH: 'true', EGEN_API_URL: '/egen', EGEN_ENV: 'development' }),
    ).not.toThrow();
  });

  it('le résultat est figé (immuable)', () => {
    const config = resolveTarget({});
    expect(Object.isFrozen(config)).toBe(true);
  });
});

describe.each(['android', 'ios'])('resolveTarget — %s', (platform) => {
  const config = resolveTarget(validNative({ EGEN_TARGET: platform }));

  it('produit la configuration native attendue', () => {
    expect(config).toMatchObject({
      target: platform,
      native: true,
      publicPath: '/app',
      serviceWorker: false,
      offlineData: true,
      importmapMode: 'inline',
      routesMode: 'inline',
      allowImportMapOverrides: false,
      allowDevAuthBypass: false,
      requireAbsoluteApiUrl: true,
    });
    expect(config.csp).toEqual(expect.any(String));
  });

  it('android et ios ne diffèrent que par le nom de la cible', () => {
    const other = resolveTarget(validNative({ EGEN_TARGET: platform === 'android' ? 'ios' : 'android' }));
    expect({ ...other, target: platform }).toEqual(config);
  });
});

describe('resolveTarget — natif : valeurs', () => {
  it('ignore EGEN_PUBLIC_PATH (constante /app)', () => {
    expect(resolveTarget(validNative({ EGEN_PUBLIC_PATH: '/autre' })).publicPath).toBe(NATIVE_PUBLIC_PATH);
    expect(resolveTarget(validNative({ EGEN_PUBLIC_PATH: '' })).publicPath).toBe('/app');
  });

  it('ignore EGEN_OFFLINE : jamais de service worker', () => {
    expect(resolveTarget(validNative({ EGEN_OFFLINE: 'enable' })).serviceWorker).toBe(false);
  });

  it('données hors ligne actives sauf EGEN_OFFLINE_DATA=disable', () => {
    expect(resolveTarget(validNative()).offlineData).toBe(true);
    expect(resolveTarget(validNative({ EGEN_OFFLINE_DATA: 'enable' })).offlineData).toBe(true);
    expect(resolveTarget(validNative({ EGEN_OFFLINE_DATA: 'disable' })).offlineData).toBe(false);
  });

  it('la CSP autorise l’origine de l’API (et seulement elle) et n’autorise jamais eval ni script inline', () => {
    const { csp } = resolveTarget(validNative({ EGEN_API_URL: 'https://api.exemple.ga:8443/egen/v1' }));
    expect(csp).toContain("connect-src 'self' https://api.exemple.ga:8443;");
    expect(csp).toContain("script-src 'self';");
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
    expect(csp).toBe(buildNativeCsp('https://api.exemple.ga:8443'));
  });
});

describe('resolveTarget — erreurs', () => {
  it.each(['Android', 'WEB', 'windows', 'desktop', ' android'])(
    'EGEN_TARGET inconnu %j → erreur (pas de repli silencieux)',
    (value) => {
      expect(() => resolveTarget({ EGEN_TARGET: value })).toThrow(/EGEN_TARGET inconnu/);
    },
  );

  it('la liste des cibles connues est exactement web, android, ios', () => {
    expect([...TARGETS]).toEqual(['web', 'android', 'ios']);
  });

  it.each(['true', 'TRUE', ' true '])('natif + EGEN_DEV_NO_AUTH=%j → erreur', (value) => {
    expect(() => resolveTarget(validNative({ EGEN_DEV_NO_AUTH: value }))).toThrow(/EGEN_DEV_NO_AUTH/);
  });

  it.each(['false', '', undefined])('natif + EGEN_DEV_NO_AUTH=%j → accepté', (value) => {
    expect(() => resolveTarget(validNative({ EGEN_DEV_NO_AUTH: value }))).not.toThrow();
  });

  it.each([undefined, '', '/egen', 'http://api.exemple.ga', '//api.exemple.ga', 'api.exemple.ga'])(
    'natif + EGEN_API_URL=%j → erreur (https:// absolu exigé)',
    (value) => {
      expect(() => resolveTarget(validNative({ EGEN_API_URL: value }))).toThrow(/EGEN_API_URL/);
    },
  );

  it('natif + EGEN_API_URL https:// mais invalide → erreur', () => {
    expect(() => resolveTarget(validNative({ EGEN_API_URL: 'https://' }))).toThrow(/EGEN_API_URL/);
  });

  it.each([undefined, '', '{}', '{"imports":{}}'])('natif + import map %j → erreur (artefact autonome)', (value) => {
    expect(() => resolveTarget(validNative({ EGEN_ESM_IMPORTMAP: value }))).toThrow(/EGEN_ESM_IMPORTMAP/);
  });

  it.each([undefined, '', '{}'])('natif + routes %j → erreur (artefact autonome)', (value) => {
    expect(() => resolveTarget(validNative({ EGEN_ROUTES: value }))).toThrow(/EGEN_ROUTES/);
  });

  it('natif + une URL d’import map ne remplace pas l’import map inline', () => {
    expect(() =>
      resolveTarget(
        validNative({ EGEN_ESM_IMPORTMAP: undefined, EGEN_ESM_IMPORTMAP_URL: 'https://cdn.exemple.ga/im.json' }),
      ),
    ).toThrow(/EGEN_ESM_IMPORTMAP/);
  });

  it('natif + JSON invalide pour l’import map ou les routes → erreur (on ne peut pas se rattraper au runtime)', () => {
    expect(() => resolveTarget(validNative({ EGEN_ESM_IMPORTMAP: '{pas du json' }))).toThrow(/JSON valide/);
    expect(() => resolveTarget(validNative({ EGEN_ROUTES: '{pas du json' }))).toThrow(/JSON valide/);
  });

  it.each([undefined, '', 'development', 'test', 'prod'])(
    'natif + EGEN_ENV=%j → erreur (la valeur doit déjà être résolue en "production")',
    (value) => {
      expect(() => resolveTarget(validNative({ EGEN_ENV: value }))).toThrow(/EGEN_ENV/);
    },
  );

  it('signale toutes les violations d’un coup', () => {
    expect.assertions(5);
    try {
      resolveTarget({ EGEN_TARGET: 'ios', EGEN_ENV: 'development', EGEN_DEV_NO_AUTH: 'true', EGEN_API_URL: '/egen' });
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain('"ios"');
      expect(message).toContain('EGEN_ENV');
      expect(message).toContain('EGEN_DEV_NO_AUTH');
      expect(message).toContain('EGEN_API_URL');
      expect(message).toContain('EGEN_ESM_IMPORTMAP');
    }
  });
});

describe('resolveTarget — pureté', () => {
  it('ne lit pas process.env', () => {
    const before = process.env.EGEN_TARGET;
    process.env.EGEN_TARGET = 'ios'; // serait une erreur de validation si la fonction le lisait
    try {
      expect(resolveTarget({}).target).toBe('web');
    } finally {
      if (before === undefined) delete process.env.EGEN_TARGET;
      else process.env.EGEN_TARGET = before;
    }
  });

  it('ne modifie pas l’objet reçu', () => {
    const env = validNative();
    const copy = { ...env };
    resolveTarget(env);
    expect(env).toEqual(copy);
  });
});
