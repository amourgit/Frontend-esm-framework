import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as api from '../index.js';

// DS-1 — filet de sécurité : fige le comportement du moteur actuel avant la migration vers TokiForge.
// Ces fichiers de référence servent de preuve de parité (aux noms près : préfixe `--egen-`, ADR-002).
// Régénérer uniquement avec `vitest run -u` et une justification dans la PR.

const defaultTheme = JSON.parse(readFileSync(join(__dirname, '../themes/theme.default.json'), 'utf8'));

describe('golden — thème par défaut', () => {
  it('variables CSS générées (base / light / dark)', async () => {
    const { base, light, dark } = api.flattenToCssVars(defaultTheme);
    const sorted = (o: Record<string, string>) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
    await expect(JSON.stringify({ base: sorted(base), light: sorted(light), dark: sorted(dark) }, null, 2) + '\n').toMatchFileSnapshot('./golden/default-theme.vars.json');
  });

  it('couvre bien toutes les familles du thème', () => {
    const { base, light, dark } = api.flattenToCssVars(defaultTheme);
    const families = new Set([...Object.keys(base), ...Object.keys(light), ...Object.keys(dark)].map((k) => k.replace(/^--/, '').split('-')[0]));
    expect([...families].sort()).toMatchInlineSnapshot(`
      [
        "animation",
        "border",
        "colors",
        "effects",
        "icons",
        "layout",
        "panel",
        "shadows",
        "transitions",
        "typography",
        "z",
      ]
    `);
  });
});

describe('golden — API publique', () => {
  it('liste des exports', async () => {
    await expect(Object.keys(api).sort().join('\n') + '\n').toMatchFileSnapshot('./golden/public-api.txt');
  });
});
