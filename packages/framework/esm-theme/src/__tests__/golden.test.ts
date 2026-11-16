import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as api from '../index.js';
import { compileTheme } from '../tokiforge/compile.js';

// Parité avec le comportement de l'ancien moteur (golden figé en DS-1 sur `main`, jamais régénéré) : mêmes variables,
// mêmes valeurs, seul le nom change (ADR-002 : l'ancien nom `--colors-…` devient `--egen-colors-…`).

const defaultTheme = JSON.parse(readFileSync(join(__dirname, '../themes/theme.default.json'), 'utf8'));
const legacy = JSON.parse(readFileSync(join(__dirname, './golden/default-theme.vars.json'), 'utf8')) as Record<
  'base' | 'light' | 'dark',
  Record<string, string>
>;
// Références vers des variables DU THÈME uniquement : `--font-poppins` (définie hors thème) ne change pas.
const THEME_VAR_REF =
  /var\(--(animation|border-radius|colors|components|effects|icons|layout|panel|shadows|spacing|transitions|typography|z-index)-/g;
// Les références internes du thème (`var(--colors-…)`) suivent le même renommage que les noms.
const renamed = (vars: Record<string, string>) =>
  Object.fromEntries(
    Object.entries(vars).map(([k, v]) => [`--egen-${k.slice(2)}`, v.replace(THEME_VAR_REF, 'var(--egen-$1-')]),
  );

describe('parité avec l’ancien moteur (thème par défaut)', () => {
  const { vars, rejected } = compileTheme(defaultTheme);

  it.each(['base', 'light', 'dark'] as const)('variables %s identiques, au préfixe près', (bucket) => {
    expect(vars[bucket]).toEqual(renamed(legacy[bucket]));
  });

  it('aucune valeur du thème par défaut n’est rejetée', () => {
    expect(rejected).toEqual([]);
  });

  it('toutes les variables portent le préfixe --egen-', () => {
    for (const name of [...Object.keys(vars.base), ...Object.keys(vars.light), ...Object.keys(vars.dark)])
      expect(name).toMatch(/^--egen-/);
  });
});

describe('API publique', () => {
  it('liste des exports (figée — toute évolution est volontaire)', async () => {
    await expect(Object.keys(api).sort().join('\n') + '\n').toMatchFileSnapshot('./golden/public-api.txt');
  });
});
