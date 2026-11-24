import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultThemeStyles, type ThemeStyles } from './theme-styles.js';
import type { ResolvedTheme } from './client.js';

const KEY = 'egen-theme-mode';
const custom: ThemeStyles = {
  light: { ...defaultThemeStyles.light, primary: 'oklch(0.55 0.2 145)' },
  dark: { ...defaultThemeStyles.dark, primary: 'oklch(0.7 0.2 145)' },
};
const resolved = (styles: ThemeStyles = custom, extra: Partial<ResolvedTheme> = {}): ResolvedTheme => ({
  styles,
  checksum: 'sum1',
  sources: { scope: 'tenant:uob', theme: 'uob', version: 2, overridden: false, user: 'none' },
  ...extra,
});
const ok = (body: unknown, etag = '"e1"') => new Response(JSON.stringify(body), { status: 200, headers: { etag } });
const baseStyle = () => document.getElementById('egen-theme')?.textContent ?? '';

async function load() {
  vi.resetModules();
  return import('./singleton.js');
}

beforeEach(() => {
  document.head.innerHTML = '';
  document.documentElement.className = '';
  window.localStorage.clear();
});
afterEach(() => vi.restoreAllMocks());

describe('avant setupTheme', () => {
  it('getTheme lève, les raccourcis sont sans effet', async () => {
    const t = await load();
    expect(() => t.getTheme()).toThrow(/non initialisé/);
    expect(t.getThemeMode()).toBeNull();
    expect(t.toggleThemeMode()).toBeNull();
    expect(await t.reloadTheme()).toBe(false);
  });
});

describe('setupTheme', () => {
  it('applique le thème du backend (même origine) et accuse réception', async () => {
    const t = await load();
    const f = vi.fn().mockImplementation((url: string) =>
      Promise.resolve(url === '/api/theme' ? ok(resolved()) : new Response(null, { status: 202 })),
    );
    const rt = await t.setupTheme({ fetch: f });
    expect(rt).toBe(t.getTheme());
    expect(baseStyle()).toContain('oklch(0.55 0.2 145)');
    await vi.waitFor(() => expect(f).toHaveBeenCalledTimes(2));
    expect(f.mock.calls[1][0]).toBe('/api/theme/applied');
    expect(JSON.parse(f.mock.calls[1][1].body)).toEqual({ theme: 'uob', version: 2, checksum: 'sum1' });
  });

  it('démarre toujours : backend injoignable → thème de repli conservé, sans lever', async () => {
    const t = await load();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await t.setupTheme({ fetch: vi.fn().mockRejectedValue(new Error('réseau')) });
    expect(baseStyle()).toContain(defaultThemeStyles.light.primary);
    expect(warn).toHaveBeenCalled();
  });

  it('refuse un thème dangereux du backend et garde le repli', async () => {
    const t = await load();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const evil: ThemeStyles = {
      light: { ...defaultThemeStyles.light, primary: 'red; } body { display:none' },
      dark: defaultThemeStyles.dark,
    };
    await t.setupTheme({ fetch: vi.fn().mockResolvedValue(ok(resolved(evil))), reportApplied: false });
    expect(baseStyle()).not.toContain('display:none');
    expect(baseStyle()).toContain(defaultThemeStyles.light.primary);
  });

  it('abandonne après timeoutMs sans bloquer le démarrage', async () => {
    const t = await load();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const f = vi.fn().mockImplementation(
      (_u: string, init: RequestInit) =>
        new Promise((_res, rej) => init.signal?.addEventListener('abort', () => rej(new Error('abort')))),
    );
    const t0 = Date.now();
    await t.setupTheme({ fetch: f, timeoutMs: 30 });
    expect(Date.now() - t0).toBeLessThan(1500);
    expect(baseStyle()).toContain(defaultThemeStyles.light.primary);
  });

  it("ne transmet pas d'accusé pour le thème de repli du backend, ni si reportApplied est faux", async () => {
    const t = await load();
    const f = vi.fn().mockResolvedValue(ok(resolved(custom, { checksum: 'fallback' })));
    await t.setupTheme({ fetch: f });
    await new Promise((r) => setTimeout(r, 20));
    expect(f).toHaveBeenCalledTimes(1);
    const g = vi.fn().mockResolvedValue(ok(resolved()));
    await t.setupTheme({ fetch: g, reportApplied: false });
    await new Promise((r) => setTimeout(r, 20));
    expect(g).toHaveBeenCalledTimes(1);
  });

  it('refuse un endpoint absolu : aucun appel réseau, repli conservé', async () => {
    const t = await load();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const f = vi.fn();
    await t.setupTheme({ fetch: f, endpoint: 'https://tokiforge.example/api/theme' });
    expect(f).not.toHaveBeenCalled();
    expect(baseStyle()).toContain(defaultThemeStyles.light.primary);
  });
});

describe('mode clair / sombre', () => {
  const offline = () => vi.fn().mockRejectedValue(new Error('réseau'));
  beforeEach(() => vi.spyOn(console, 'warn').mockImplementation(() => {}));

  it('sombre par défaut ; classe .dark posée', async () => {
    const t = await load();
    await t.setupTheme({ fetch: offline() });
    expect(t.getThemeMode()).toBe('dark');
    expect(document.documentElement).toHaveClass('dark');
  });

  it('reprend le choix mémorisé', async () => {
    window.localStorage.setItem(KEY, 'light');
    const t = await load();
    await t.setupTheme({ fetch: offline() });
    expect(t.getThemeMode()).toBe('light');
    expect(document.documentElement).not.toHaveClass('dark');
  });

  it('ignore une valeur mémorisée invalide', async () => {
    window.localStorage.setItem(KEY, 'sepia');
    const t = await load();
    await t.setupTheme({ fetch: offline(), defaultMode: 'light' });
    expect(t.getThemeMode()).toBe('light');
  });

  it('mémorise toute bascule, quel que soit le chemin', async () => {
    const t = await load();
    await t.setupTheme({ fetch: offline() });
    expect(t.toggleThemeMode()).toBe('light');
    expect(window.localStorage.getItem(KEY)).toBe('light');
    t.getTheme().setMode('dark');
    expect(window.localStorage.getItem(KEY)).toBe('dark');
    t.setThemeMode('light');
    expect(window.localStorage.getItem(KEY)).toBe('light');
  });

  it('modeStorageKey: null désactive la mémorisation', async () => {
    window.localStorage.setItem(KEY, 'light');
    const t = await load();
    await t.setupTheme({ fetch: offline(), modeStorageKey: null });
    expect(t.getThemeMode()).toBe('dark');
    t.toggleThemeMode();
    expect(window.localStorage.getItem(KEY)).toBe('light'); // inchangé
  });

  it('un localStorage indisponible ne bloque rien', async () => {
    const t = await load();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqué');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqué');
    });
    await t.setupTheme({ fetch: offline() });
    expect(() => t.toggleThemeMode()).not.toThrow();
  });

  it('conserve le mode quand le thème du backend est appliqué', async () => {
    window.localStorage.setItem(KEY, 'light');
    const t = await load();
    await t.setupTheme({ fetch: vi.fn().mockResolvedValue(ok(resolved())), reportApplied: false });
    expect(t.getThemeMode()).toBe('light');
  });
});

describe('reloadTheme et réinitialisation', () => {
  it("renvoie l'ETag connu ; 304 = rien à appliquer ; nouvelle version = appliquée", async () => {
    const t = await load();
    const f = vi
      .fn()
      .mockResolvedValueOnce(ok(resolved(), '"e1"'))
      .mockResolvedValueOnce(new Response(null, { status: 304, headers: { etag: '"e1"' } }))
      .mockResolvedValueOnce(
        ok(resolved({ light: { ...custom.light, primary: 'oklch(0.4 0.1 30)' }, dark: custom.dark }), '"e2"'),
      );
    await t.setupTheme({ fetch: f, reportApplied: false });
    expect(await t.reloadTheme()).toBe(false);
    expect(f.mock.calls[1][1].headers['If-None-Match']).toBe('"e1"');
    expect(await t.reloadTheme()).toBe(true);
    expect(f.mock.calls[2][1].headers['If-None-Match']).toBe('"e1"');
    expect(baseStyle()).toContain('oklch(0.4 0.1 30)');
  });

  it("un second setupTheme remplace l'instance sans laisser de doublon de <style>", async () => {
    const t = await load();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const off = () => vi.fn().mockRejectedValue(new Error('réseau'));
    const a = await t.setupTheme({ fetch: off() });
    const b = await t.setupTheme({ fetch: off() });
    expect(b).not.toBe(a);
    expect(t.getTheme()).toBe(b);
    expect(document.querySelectorAll('#egen-theme').length).toBe(1);
  });
});
