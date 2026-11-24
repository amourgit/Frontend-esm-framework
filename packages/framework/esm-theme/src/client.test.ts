import { describe, expect, it, vi } from 'vitest';
import { defaultThemeStyles } from './theme-styles.js';
import {
  THEME_APPLIED_ENDPOINT,
  THEME_ENDPOINT,
  assertSameOriginPath,
  fetchTheme,
  parseResolvedTheme,
  reportThemeApplied,
  type ResolvedTheme,
} from './client.js';

const resolved: ResolvedTheme = {
  styles: defaultThemeStyles,
  checksum: 'abc123',
  sources: { scope: 'tenant:uob', theme: 'uob', version: 4, overridden: false, user: 'none' },
};

function res(status: number, body?: unknown, headers: Record<string, string> = {}): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), { status, headers });
}

describe('assertSameOriginPath', () => {
  it('accepte les chemins relatifs de même origine', () => {
    expect(assertSameOriginPath('/api/theme')).toBe('/api/theme');
    expect(assertSameOriginPath('/a/b_c-d.e')).toBe('/a/b_c-d.e');
  });
  it.each([
    'https://evil.example/api/theme',
    '//evil.example/api/theme',
    'http://localhost:3000/api/theme',
    'api/theme',
    '/api/../etc',
    '/api/theme?x=1',
    '/api/theme#x',
    '/api\\theme',
    '',
  ])('refuse %j', (p) => {
    expect(() => assertSameOriginPath(p)).toThrow(/même origine/);
  });
});

describe('parseResolvedTheme', () => {
  it('accepte une réponse complète', () => {
    expect(parseResolvedTheme(resolved).sources.version).toBe(4);
  });
  it.each([
    [null],
    [{}],
    [{ styles: {} }],
    [{ styles: { light: {}, dark: {} } }],
    [{ styles: { light: {}, dark: {} }, checksum: 'x' }],
    [{ styles: { light: {}, dark: {} }, checksum: 'x', sources: { theme: 'a', version: 1.5 } }],
    [{ styles: { light: [], dark: {} }, checksum: 'x', sources: { theme: 'a', version: 1 } }],
  ])('refuse %j', (b) => {
    expect(() => parseResolvedTheme(b)).toThrow(/invalide/);
  });
});

describe('fetchTheme', () => {
  it('appelle /api/theme en GET, même origine, sans tenant ni utilisateur', async () => {
    const f = vi.fn().mockResolvedValue(res(200, resolved, { etag: '"v4"' }));
    const r = await fetchTheme({ fetch: f });
    expect(r).toMatchObject({ status: 200, etag: '"v4"' });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe(THEME_ENDPOINT);
    expect(init.method).toBe('GET');
    expect(init.credentials).toBe('same-origin');
    expect(Object.keys(init.headers)).toEqual(['Accept']);
  });
  it('transmet app et If-None-Match', async () => {
    const f = vi.fn().mockResolvedValue(res(304, undefined, { etag: '"v4"' }));
    const r = await fetchTheme({ fetch: f, app: 'esm-login', etag: '"v4"' });
    expect(r).toEqual({ status: 304, etag: '"v4"' });
    expect(f.mock.calls[0][0]).toBe('/api/theme?app=esm-login');
    expect(f.mock.calls[0][1].headers['If-None-Match']).toBe('"v4"');
  });
  it('refuse un endpoint absolu avant tout appel réseau', async () => {
    const f = vi.fn();
    await expect(fetchTheme({ fetch: f, endpoint: 'https://tokiforge.example/api/theme' })).rejects.toThrow(/même origine/);
    expect(f).not.toHaveBeenCalled();
  });
  it("refuse un identifiant d'application invalide avant tout appel réseau", async () => {
    const f = vi.fn();
    await expect(fetchTheme({ fetch: f, app: 'A b&x=1' })).rejects.toThrow(/invalide/);
    expect(f).not.toHaveBeenCalled();
  });
  it('lève sur un statut d’erreur et sur une réponse mal formée', async () => {
    await expect(fetchTheme({ fetch: vi.fn().mockResolvedValue(res(502)) })).rejects.toThrow(/502/);
    await expect(fetchTheme({ fetch: vi.fn().mockResolvedValue(res(200, { styles: 1 })) })).rejects.toThrow(/invalide/);
  });
});

describe('reportThemeApplied', () => {
  it("envoie l'accusé du thème appliqué", async () => {
    const f = vi.fn().mockResolvedValue(res(202, { accepted: true }));
    expect(await reportThemeApplied(resolved, { fetch: f, app: 'esm-login' })).toBe(true);
    const [url, init] = f.mock.calls[0];
    expect(url).toBe(THEME_APPLIED_ENDPOINT);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ theme: 'uob', version: 4, checksum: 'abc123', app: 'esm-login' });
  });
  it('ne transmet rien pour le thème de repli', async () => {
    const f = vi.fn();
    expect(await reportThemeApplied({ ...resolved, checksum: 'fallback' }, { fetch: f })).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });
  it("n'échoue jamais", async () => {
    expect(await reportThemeApplied(resolved, { fetch: vi.fn().mockRejectedValue(new Error('réseau')) })).toBe(false);
    expect(await reportThemeApplied(resolved, { fetch: vi.fn().mockResolvedValue(res(500)) })).toBe(false);
  });
});
