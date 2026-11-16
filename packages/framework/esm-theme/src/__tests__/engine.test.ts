import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeEngine } from '../engine.js';
import { ThemeValidationError } from '../model/errors.js';
import type { ThemeStorage } from '../model/types.js';

const memory = (): ThemeStorage & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
};
const theme = (priority: number, primary: string, extra: Record<string, unknown> = {}) => ({
  priority,
  meta: { name: `t${priority}` },
  colors: { primary: { '500': primary }, surface: { light: { background: '#fff' }, dark: { background: '#000' } } },
  ...extra,
});
const mockFetch = (files: Record<string, unknown>) =>
  vi.fn(async (url: string) => {
    const key = Object.keys(files).find((k) => url.startsWith(k));
    if (!key) return { ok: false, status: 404, text: async () => '' };
    return { ok: true, status: 200, text: async () => JSON.stringify(files[key]) };
  });
const styleText = (id: string) => document.getElementById(id)?.textContent ?? null;
const make = (over: Partial<ConstructorParameters<typeof ThemeEngine>[0]> = {}) =>
  new ThemeEngine({ themeUrls: ['/a.json', '/b.json'], storage: memory(), modeStorageKey: null, ...over });

beforeEach(() => {
  document.head.innerHTML = '';
  document.documentElement.removeAttribute('data-theme');
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('thème de base', () => {
  it('retient le plus prioritaire et injecte les variables --egen-*', async () => {
    vi.stubGlobal('fetch', mockFetch({ '/a.json': theme(1, '#111'), '/b.json': theme(5, '#222') }));
    const onApplied = vi.fn();
    const e = make({ onApplied });
    await e.apply();
    expect(styleText('tokiforge-theme')).toContain('--egen-colors-primary-500: #222;');
    expect(e.getState()).toMatchObject({ status: 'applied' });
    expect(onApplied).toHaveBeenCalledWith(
      expect.objectContaining({ priority: 5 }),
      expect.objectContaining({ base: expect.any(Object) }),
    );
  });

  it("n'applique rien et signale l'erreur si aucun thème n'est chargeable (pas de thème codé en dur)", async () => {
    vi.stubGlobal('fetch', mockFetch({}));
    const onError = vi.fn();
    const e = make({ onError });
    await expect(e.apply()).resolves.toBeNull();
    expect(e.getState()).toMatchObject({ status: 'error', activeTheme: null, cssVarsCount: 0 });
    expect(document.getElementById('tokiforge-theme')).toBeNull();
    expect(onError).toHaveBeenCalled();
  });

  it('ignore un thème invalide et prend le suivant', async () => {
    vi.stubGlobal('fetch', mockFetch({ '/a.json': { colors: {} }, '/b.json': theme(2, '#333') }));
    const e = make();
    await e.apply();
    expect(e.getState().activeTheme?.url).toContain('/b.json');
  });

  it('hot-reload : ne ré-applique que si le contenu change', async () => {
    vi.useFakeTimers();
    const files: Record<string, unknown> = { '/a.json': theme(1, '#111') };
    vi.stubGlobal('fetch', mockFetch(files));
    const onApplied = vi.fn();
    const e = make({ themeUrls: ['/a.json'], pollIntervalMs: 1000, onApplied });
    await e.apply();
    await vi.advanceTimersByTimeAsync(1100); // première passe : hash inconnu → appliqué
    const afterFirst = onApplied.mock.calls.length;
    await vi.advanceTimersByTimeAsync(1100); // identique → rien
    expect(onApplied.mock.calls.length).toBe(afterFirst);
    files['/a.json'] = theme(1, '#999');
    await vi.advanceTimersByTimeAsync(1100);
    expect(styleText('tokiforge-theme')).toContain('#999');
    e.destroy();
    expect(document.getElementById('tokiforge-theme')).toBeNull();
  });
});

describe('mode (TokiForge ThemeController)', () => {
  it('une seule feuille de thème : le mode courant, bascule, data-theme, mémorisation, abonnés', async () => {
    vi.stubGlobal('fetch', mockFetch({ '/a.json': theme(1, '#111') }));
    const onModeChanged = vi.fn();
    const e = make({ themeUrls: ['/a.json'], modeStorageKey: 'k', defaultMode: 'light', onModeChanged });
    await e.apply();
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(styleText('tokiforge-theme')).toContain('--egen-colors-surface-background: #fff;');
    expect(onModeChanged).not.toHaveBeenCalled(); // le mode initial n'est pas un changement
    e.toggleMode();
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(styleText('tokiforge-theme')).toContain('--egen-colors-surface-background: #000;');
    expect(window.localStorage.getItem('k')).toBe('dark');
    expect(onModeChanged).toHaveBeenCalledExactlyOnceWith('dark');
    expect(make({ modeStorageKey: 'k' }).getMode()).toBe('dark'); // relu depuis data-theme/stockage
    expect(document.querySelectorAll('style#tokiforge-theme')).toHaveLength(1);
  });
  it('le mode choisi avant le premier rendu est conservé', async () => {
    vi.stubGlobal('fetch', mockFetch({ '/a.json': theme(1, '#111') }));
    const e = make({ themeUrls: ['/a.json'] });
    e.setMode('light');
    await e.apply();
    expect(e.getMode()).toBe('light');
    expect(styleText('tokiforge-theme')).toContain('#fff');
  });
});

describe('surcharges', () => {
  const ready = async () => {
    vi.stubGlobal('fetch', mockFetch({ '/a.json': theme(1, '#111') }));
    const e = make({ themeUrls: ['/a.json'] });
    await e.apply();
    return e;
  };

  it('par application : scope dédié, priorité, retrait', async () => {
    const e = await ready();
    e.applyAppOverride('demo', { colors: { primary: { '500': '#aaa' } } }, { id: 'low', priority: 1 });
    e.applyAppOverride('demo', { colors: { primary: { '500': '#bbb' } } }, { id: 'high', priority: 9 });
    expect(styleText('egen-theme-override-demo')).toContain("[data-egen-app='demo']");
    expect(styleText('egen-theme-override-demo')).toContain('#bbb');
    expect(e.getState().activeOverrideScopes).toEqual(['demo']);
    e.removeAppOverride('demo', 'high');
    expect(styleText('egen-theme-override-demo')).toContain('#aaa');
    e.removeAppOverride('demo');
    expect(document.getElementById('egen-theme-override-demo')).toBeNull();
    expect(e.getState().activeOverrideScopes).toEqual([]);
  });

  it('globale : fusionnée au document, un seul thème effectif', async () => {
    const e = await ready();
    e.applyGlobalOverride({ colors: { primary: { '500': '#fed' } } }, { id: 'studio', priority: 100 });
    expect(styleText('tokiforge-theme')).toContain('--egen-colors-primary-500: #fed;');
    expect(document.querySelectorAll('style[id^="egen-theme-override-"]')).toHaveLength(0);
    expect(e.isGlobalOverrideApplied('studio')).toBe(true);
    expect(e.isGlobalOverrideApplied('autre')).toBe(false);
    expect(e.getState().activeGlobalOverrides).toEqual(['studio']);
    expect(e.getState().activeOverrideScopes).toEqual([]); // le scope global n'est pas public
  });

  it('refuse un document invalide (erreur typée) et un scope dangereux', async () => {
    const e = await ready();
    expect(() => e.applyGlobalOverride({ spacing: { value: '1px' } })).toThrow(ThemeValidationError);
    expect(() => e.applyAppOverride("x'] { }", {})).toThrow(/scope invalide/);
    expect(styleText('tokiforge-theme')).not.toContain('value');
    expect(e.isGlobalOverrideApplied()).toBe(false);
  });

  it('les surcharges survivent à un rechargement du thème de base', async () => {
    const e = await ready();
    e.applyAppOverride('demo', { x: '1px' });
    await e.apply();
    expect(styleText('egen-theme-override-demo')).toContain('--egen-x: 1px;');
  });
});

describe('application persistante (ADR-005)', () => {
  const boot = async (storage: ThemeStorage) => {
    vi.stubGlobal('fetch', mockFetch({ '/a.json': theme(1, '#111') }));
    const e = new ThemeEngine({ themeUrls: ['/a.json'], storage, modeStorageKey: null });
    await e.apply();
    return e;
  };

  it('apply → rechargement → réappliqué avant tout rendu', async () => {
    const storage = memory();
    const first = await boot(storage);
    first.applyGlobalOverride(
      { colors: { primary: { '500': '#abc' } } },
      { id: 'studio', priority: 100, persist: true },
    );
    first.destroy();
    document.head.innerHTML = '';
    const second = await boot(storage); // « rechargement de la page »
    expect(second.isGlobalOverrideApplied('studio')).toBe(true);
    expect(styleText('tokiforge-theme')).toContain('--egen-colors-primary-500: #abc;');
  });

  it('sans persist, rien n’est conservé', async () => {
    const storage = memory();
    (await boot(storage)).applyGlobalOverride({ x: '1px' }, { id: 's' });
    expect(storage.data.size).toBe(0);
  });

  it('retrait persistant : ne revient pas au prochain démarrage', async () => {
    const storage = memory();
    const e = await boot(storage);
    e.applyGlobalOverride({ x: '1px' }, { id: 's', persist: true });
    e.removeGlobalOverride('s');
    e.destroy();
    expect((await boot(storage)).isGlobalOverrideApplied()).toBe(false);
  });

  it('ignore un stockage corrompu ou altéré (jamais appliqué)', async () => {
    const storage = memory();
    storage.setItem(
      'egen-theme-applied',
      JSON.stringify({
        v: 1,
        overrides: [
          { id: 'evil', priority: 1, document: { a: 'red; } body { display:none', spacing: { value: 'x' } } },
        ],
      }),
    );
    expect((await boot(storage)).isGlobalOverrideApplied()).toBe(false);
    storage.setItem('egen-theme-applied', '{oops');
    expect((await boot(storage)).isGlobalOverrideApplied()).toBe(false);
  });

  it('fonctionne sans stockage disponible', async () => {
    vi.stubGlobal('fetch', mockFetch({ '/a.json': theme(1, '#111') }));
    const e = new ThemeEngine({ themeUrls: ['/a.json'], overridesStorageKey: null, modeStorageKey: null });
    await e.apply();
    expect(() => e.applyGlobalOverride({ x: '1px' }, { persist: true })).not.toThrow();
    expect(e.isGlobalOverrideApplied()).toBe(true);
  });
});

describe('documents en ligne', () => {
  it('s’appliquent sans réseau et concourent par priorité avec les URL', async () => {
    const fetchMock = mockFetch({ '/a.json': theme(1, '#111') });
    vi.stubGlobal('fetch', fetchMock);
    const e = new ThemeEngine({
      themeUrls: [],
      themeDocuments: [theme(3, '#ccc')],
      storage: memory(),
      modeStorageKey: null,
    });
    await e.apply();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(styleText('tokiforge-theme')).toContain('--egen-colors-primary-500: #ccc;');
    const e2 = new ThemeEngine({
      themeUrls: ['/a.json'],
      themeDocuments: [theme(0, '#000')],
      storage: memory(),
      modeStorageKey: null,
    });
    await e2.apply();
    expect(e2.getState().activeTheme?.url).toContain('/a.json'); // priorité 1 > 0
  });
  it('ignore un document invalide', async () => {
    const e = new ThemeEngine({
      themeUrls: [],
      themeDocuments: [{ colors: {} } as never],
      storage: memory(),
      modeStorageKey: null,
    });
    await expect(e.apply()).resolves.toBeNull();
  });
});
