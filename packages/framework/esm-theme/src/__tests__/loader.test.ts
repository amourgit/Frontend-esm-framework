import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadHighestPriorityTheme, loadHighestPriorityThemeIfChanged } from '../loader';

function mockFetch(byUrl: Record<string, { ok: boolean; status?: number; body?: unknown; raw?: string }>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string) => {
      const url = String(input).split('?')[0];
      const entry = byUrl[url];
      if (!entry || !entry.ok) return { ok: false, status: entry?.status ?? 404 } as Response;
      const text = entry.raw ?? JSON.stringify(entry.body);
      return { ok: true, text: async () => text, json: async () => JSON.parse(text) } as unknown as Response;
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('loadHighestPriorityTheme — validation + sélection', () => {
  it('ignore les fichiers qui échouent au fetch (HTTP non-ok)', async () => {
    mockFetch({
      '/a.json': { ok: false, status: 500 },
      '/b.json': { ok: true, body: { priority: 1, meta: { name: 'B' } } },
    });
    const result = await loadHighestPriorityTheme(['/a.json', '/b.json']);
    expect(result?.schema.meta?.name).toBe('B');
  });

  it('ignore les fichiers structurellement invalides (zod) sans faire échouer le chargement global', async () => {
    mockFetch({
      '/invalid.json': { ok: true, body: { priority: 'haute' } }, // priority non numérique -> rejeté
      '/valid.json': { ok: true, body: { priority: 1, meta: { name: 'Valide' } } },
    });
    const result = await loadHighestPriorityTheme(['/invalid.json', '/valid.json']);
    expect(result?.schema.meta?.name).toBe('Valide');
  });

  it('retourne null si tous les fichiers échouent', async () => {
    mockFetch({ '/a.json': { ok: false } });
    const result = await loadHighestPriorityTheme(['/a.json']);
    expect(result).toBeNull();
  });

  it('sélectionne la priorité la plus haute', async () => {
    mockFetch({
      '/low.json': { ok: true, body: { priority: 1, meta: { name: 'Low' } } },
      '/high.json': { ok: true, body: { priority: 99, meta: { name: 'High' } } },
    });
    const result = await loadHighestPriorityTheme(['/low.json', '/high.json']);
    expect(result?.schema.meta?.name).toBe('High');
  });

  it('départage une égalité de priorité de façon déterministe par ordre alphabétique d’URL, indépendamment de l’ordre du tableau', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production'; // pour éviter le throw dev et observer le départage
    try {
      mockFetch({
        '/z-theme.json': { ok: true, body: { priority: 5, meta: { name: 'Z' } } },
        '/a-theme.json': { ok: true, body: { priority: 5, meta: { name: 'A' } } },
      });
      const order1 = await loadHighestPriorityTheme(['/z-theme.json', '/a-theme.json']);
      const order2 = await loadHighestPriorityTheme(['/a-theme.json', '/z-theme.json']);
      expect(order1?.url).toBe('/a-theme.json');
      expect(order2?.url).toBe('/a-theme.json');
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it('lève une erreur explicite en développement en cas d’égalité de priorité (configuration ambiguë)', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    try {
      mockFetch({
        '/x.json': { ok: true, body: { priority: 5, meta: { name: 'X' } } },
        '/y.json': { ok: true, body: { priority: 5, meta: { name: 'Y' } } },
      });
      await expect(loadHighestPriorityTheme(['/x.json', '/y.json'])).rejects.toThrow(/Égalité de priorité/);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});

describe('loadHighestPriorityThemeIfChanged — optimisation du polling', () => {
  it('retourne changed:false si le contenu est strictement identique au dernier hash connu', async () => {
    mockFetch({ '/t.json': { ok: true, body: { priority: 1, meta: { name: 'T' } } } });

    const first = await loadHighestPriorityThemeIfChanged(['/t.json'], new Map());
    expect(first.changed).toBe(true);
    if (!first.changed) throw new Error('unreachable');

    const second = await loadHighestPriorityThemeIfChanged(['/t.json'], first.hashes);
    expect(second.changed).toBe(false);
  });

  it('retourne changed:true si le contenu a changé depuis le dernier hash connu', async () => {
    mockFetch({ '/t.json': { ok: true, body: { priority: 1, meta: { name: 'T-v1' } } } });
    const first = await loadHighestPriorityThemeIfChanged(['/t.json'], new Map());
    if (!first.changed) throw new Error('unreachable');

    mockFetch({ '/t.json': { ok: true, body: { priority: 1, meta: { name: 'T-v2' } } } });
    const second = await loadHighestPriorityThemeIfChanged(['/t.json'], first.hashes);
    expect(second.changed).toBe(true);
    if (!second.changed) throw new Error('unreachable');
    expect(second.theme.schema.meta?.name).toBe('T-v2');
  });
});
