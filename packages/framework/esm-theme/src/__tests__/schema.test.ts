import { describe, expect, it } from 'vitest';
import { validateThemeSchema } from '../schema';

describe('validateThemeSchema — validation structurelle (zod)', () => {
  it('accepte un thème minimal valide', () => {
    const result = validateThemeSchema({ priority: 1, colors: { primary: { '500': '#6366f1' } } });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejette un fichier sans "priority"', () => {
    const result = validateThemeSchema({ colors: { primary: { '500': '#6366f1' } } });
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toContain('priority');
  });

  it('rejette "priority" non numérique', () => {
    const result = validateThemeSchema({ priority: 'haute' });
    expect(result.valid).toBe(false);
  });

  it('rejette une valeur non-JSON-plate (ex: undefined imbriqué via fonction sérialisée incorrecte)', () => {
    const result = validateThemeSchema({ priority: 1, colors: { primary: { '500': () => 'x' } } });
    expect(result.valid).toBe(false);
  });

  it("accepte n'importe quelle clé inconnue/extension (schéma ouvert)", () => {
    const result = validateThemeSchema({
      priority: 1,
      monPluginCustom: { profond: { encore: { x: 'valeur' } } },
    });
    expect(result.valid).toBe(true);
  });

  it('rejette une chaîne de feuille excessivement longue', () => {
    const result = validateThemeSchema({ priority: 1, colors: { primary: { '500': 'x'.repeat(5000) } } });
    expect(result.valid).toBe(false);
  });

  it('rejette un objet avec un nombre de clés excessif à un même niveau (anti bombe JSON)', () => {
    const huge: Record<string, string> = {};
    for (let i = 0; i < 600; i++) huge[`k${i}`] = 'v';
    const result = validateThemeSchema({ priority: 1, colors: huge });
    expect(result.valid).toBe(false);
  });

  it("n'est jamais lui-même responsable de l'échappement CSS (responsabilité de flatten.ts)", () => {
    // Une chaîne avec des caractères CSS dangereux est structurellement valide
    // (c'est une string) — elle sera rejetée plus tard par flatten.ts, pas ici.
    const result = validateThemeSchema({ priority: 1, colors: { primary: { '500': 'red; } body {}' } } });
    expect(result.valid).toBe(true);
  });
});
