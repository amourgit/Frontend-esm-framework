import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { t, on } = vi.hoisted(() => ({ t: vi.fn(), on: vi.fn() }));
vi.mock('i18next', () => ({ default: { t, on } }));

import { coreTranslations } from './translations';
import { getCoreTranslation, translateFrom } from './index';

beforeEach(() => {
  t.mockImplementation((key: string, options: { defaultValue?: string }) => options.defaultValue ?? key);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('translateFrom', () => {
  it('délègue à i18next avec l’espace de noms du module, le texte de repli et les options', () => {
    translateFrom('@egen-civitas/esm-x', 'cle', 'Texte', { count: 3 });

    expect(t).toHaveBeenCalledWith('cle', { ns: '@egen-civitas/esm-x', defaultValue: 'Texte', count: 3 });
  });
});

describe('getCoreTranslation', () => {
  it('utilise l’espace de noms `core` et le texte anglais du dictionnaire comme repli', () => {
    expect(getCoreTranslation('save')).toBe('Save');
    expect(t).toHaveBeenCalledWith('save', { ns: 'core', defaultValue: 'Save' });
  });

  it('un texte de repli fourni par l’appelant prime sur celui du dictionnaire', () => {
    expect(getCoreTranslation('save', 'Enregistrer')).toBe('Enregistrer');
  });

  it('transmet les options d’interpolation', () => {
    getCoreTranslation('seeMoreGroups', undefined, { count: 4 });

    expect(t).toHaveBeenCalledWith('seeMoreGroups', { ns: 'core', defaultValue: 'See {{count}} more groups', count: 4 });
  });

  it('clé inconnue : journalise l’erreur et rend la clé elle-même comme texte', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(getCoreTranslation('nExistePas' as never)).toBe('nExistePas');
    expect(error).toHaveBeenCalledTimes(1);
    expect(t).not.toHaveBeenCalled();
  });
});

describe('dictionnaire coreTranslations', () => {
  const english = JSON.parse(
    readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../translations/en.json'), 'utf8'),
  ) as Record<string, string>;

  it('reste identique à translations/en.json (même clés, mêmes textes)', () => {
    expect(english).toEqual(coreTranslations);
  });

  it('ne contient aucun texte vide', () => {
    const empty = Object.entries(coreTranslations).filter(([, value]) => value.trim() === '');
    expect(empty).toEqual([]);
  });
});
