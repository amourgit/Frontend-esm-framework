import { describe, expect, it } from 'vitest';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resolveTarget, isMeaningfulImportmap, isMeaningfulRoutesRegistry } = require('./targets');

const NATIVE_ENV = {
  EGEN_API_URL: 'https://api.exemple.ga/egen',
  EGEN_ESM_IMPORTMAP: '{"imports":{"@egen/esm-home-app":"./home/app.js"}}',
  EGEN_ROUTES: '{"@egen/esm-home-app":{"pages":[]}}',
};

describe('isMeaningful*', () => {
  it('traite les valeurs vides comme absentes', () => {
    expect(isMeaningfulImportmap(undefined)).toBe(false);
    expect(isMeaningfulImportmap('{"imports":{}}')).toBe(false);
    expect(isMeaningfulImportmap('{"imports":{"a":"./a.js"}}')).toBe(true);
    expect(isMeaningfulImportmap('{pas du json')).toBe(true);
    expect(isMeaningfulRoutesRegistry('{}')).toBe(false);
    expect(isMeaningfulRoutesRegistry('{"a":{}}')).toBe(true);
  });
});

describe('resolveTarget — web (non-régression : comportement historique)', () => {
  it('défauts = valeurs actuelles du rspack.config.js', () => {
    expect(resolveTarget({})).toEqual({
      target: 'web',
      native: false,
      publicPath: '/egen-civitas/spa',
      serviceWorker: false,
      offlineData: false,
      importmapDef: undefined,
      importmapUrl: '/egen-civitas/spa/importmap.json',
      routesDef: undefined,
      routesUrl: '/egen-civitas/spa/routes.registry.json',
      allowImportMapOverrides: true,
      allowDevAuthBypass: true,
      requireAbsoluteApiUrl: false,
      warnings: [],
    });
  });

  it('EGEN_TARGET vide ou espaces = web', () => {
    expect(resolveTarget({ EGEN_TARGET: '' }).target).toBe('web');
    expect(resolveTarget({ EGEN_TARGET: '  ' }).target).toBe('web');
  });

  it('retire le slash final et respecte EGEN_PUBLIC_PATH', () => {
    const t = resolveTarget({ EGEN_PUBLIC_PATH: '/mon/spa/' });
    expect(t.publicPath).toBe('/mon/spa');
    expect(t.importmapUrl).toBe('/mon/spa/importmap.json');
  });

  it('EGEN_PUBLIC_PATH vide retombe sur le défaut (comportement historique)', () => {
    expect(resolveTarget({ EGEN_PUBLIC_PATH: '' }).publicPath).toBe('/egen-civitas/spa');
  });

  it('EGEN_OFFLINE=enable active service worker ET données', () => {
    const t = resolveTarget({ EGEN_OFFLINE: 'enable' });
    expect(t.serviceWorker).toBe(true);
    expect(t.offlineData).toBe(true);
    expect(resolveTarget({ EGEN_OFFLINE: 'disable' }).serviceWorker).toBe(false);
  });

  it("l'import map vide fourni par build:production est traité comme absent", () => {
    const t = resolveTarget({ EGEN_ESM_IMPORTMAP: '{"imports":{}}', EGEN_ROUTES: '{}' });
    expect(t.importmapDef).toBeUndefined();
    expect(t.routesDef).toBeUndefined();
  });

  it('URLs explicites conservées', () => {
    const t = resolveTarget({ EGEN_ESM_IMPORTMAP_URL: 'https://x/i.json', EGEN_ROUTES_URL: 'https://x/r.json' });
    expect(t.importmapUrl).toBe('https://x/i.json');
    expect(t.routesUrl).toBe('https://x/r.json');
  });

  it("n'applique AUCUNE validation native (dev bypass et API relative tolérés)", () => {
    expect(() =>
      resolveTarget({ EGEN_DEV_NO_AUTH: 'true', EGEN_API_URL: '/egen' }, { environment: 'development' }),
    ).not.toThrow();
  });
});

describe.each(['android', 'ios'])('resolveTarget — %s', (target) => {
  it('produit une configuration native verrouillée', () => {
    const t = resolveTarget({ ...NATIVE_ENV, EGEN_TARGET: target }, { environment: 'production' });
    expect(t).toMatchObject({
      target,
      native: true,
      publicPath: '/app',
      serviceWorker: false,
      offlineData: true,
      importmapUrl: '',
      routesUrl: '',
      allowImportMapOverrides: false,
      allowDevAuthBypass: false,
      requireAbsoluteApiUrl: true,
    });
    expect(t.importmapDef).toBe(NATIVE_ENV.EGEN_ESM_IMPORTMAP);
    expect(t.routesDef).toBe(NATIVE_ENV.EGEN_ROUTES);
  });

  it('EGEN_OFFLINE_DATA=disable coupe les données hors ligne', () => {
    expect(resolveTarget({ ...NATIVE_ENV, EGEN_TARGET: target, EGEN_OFFLINE_DATA: 'disable' }).offlineData).toBe(false);
  });

  it('ignore (avec avertissement) un EGEN_PUBLIC_PATH différent de /app', () => {
    const t = resolveTarget({ ...NATIVE_ENV, EGEN_TARGET: target, EGEN_PUBLIC_PATH: '/egen-civitas/spa' });
    expect(t.publicPath).toBe('/app');
    expect(t.warnings).toHaveLength(1);
    expect(resolveTarget({ ...NATIVE_ENV, EGEN_TARGET: target, EGEN_PUBLIC_PATH: '/app/' }).warnings).toHaveLength(0);
  });

  it.each([
    ['EGEN_DEV_NO_AUTH=true', { EGEN_DEV_NO_AUTH: 'true' }, /EGEN_DEV_NO_AUTH/],
    ['API relative', { EGEN_API_URL: '/egen' }, /EGEN_API_URL/],
    ['API http non sécurisée', { EGEN_API_URL: 'http://api.exemple.ga' }, /EGEN_API_URL/],
    ['API absente', { EGEN_API_URL: undefined }, /EGEN_API_URL/],
    ['import map vide', { EGEN_ESM_IMPORTMAP: '{"imports":{}}' }, /EGEN_ESM_IMPORTMAP/],
    ['routes vides', { EGEN_ROUTES: '{}' }, /EGEN_ROUTES/],
    ['import map par URL', { EGEN_ESM_IMPORTMAP_URL: 'https://x/i.json' }, /_URL/],
    ['registre par URL', { EGEN_ROUTES_URL: 'https://x/r.json' }, /_URL/],
  ])('échoue : %s', (_label, patch, message) => {
    expect(() =>
      resolveTarget({ ...NATIVE_ENV, EGEN_TARGET: target, ...patch }, { environment: 'production' }),
    ).toThrow(message);
  });

  it('échoue hors production', () => {
    expect(() => resolveTarget({ ...NATIVE_ENV, EGEN_TARGET: target }, { environment: 'development' })).toThrow(
      /EGEN_ENV=production/,
    );
  });

  it('liste TOUTES les erreurs en une seule fois', () => {
    expect(() =>
      resolveTarget({ EGEN_TARGET: target, EGEN_DEV_NO_AUTH: 'true' }, { environment: 'development' }),
    ).toThrow(
      /EGEN_DEV_NO_AUTH[\s\S]*EGEN_API_URL[\s\S]*EGEN_ESM_IMPORTMAP[\s\S]*EGEN_ROUTES[\s\S]*EGEN_ENV=production/,
    );
  });
});

describe('resolveTarget — cible inconnue', () => {
  it('échoue sans repli silencieux', () => {
    expect(() => resolveTarget({ EGEN_TARGET: 'windows' })).toThrow(/inconnu/);
  });
});
