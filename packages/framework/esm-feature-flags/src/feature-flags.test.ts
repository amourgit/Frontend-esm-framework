import { beforeEach, describe, expect, it, vi } from 'vitest';

/** Le module lit `localStorage` à l'import : chaque test repart d'un module et d'un stockage neufs. */
async function load() {
  vi.resetModules();
  return import('./feature-flags');
}

beforeEach(() => {
  localStorage.clear();
});

describe('registerFeatureFlag / getFeatureFlag', () => {
  it('enregistre un drapeau désactivé par défaut et le persiste (valeur + métadonnées)', async () => {
    const flags = await load();

    flags.registerFeatureFlag('nouveau', 'Nouveau', 'Une description');

    expect(flags.getFeatureFlag('nouveau')).toBe(false);
    expect(localStorage.getItem('egen:feature-flag:nouveau')).toBe('false');
    expect(JSON.parse(localStorage.getItem('egen:feature-flag-meta:nouveau')!)).toEqual({
      label: 'Nouveau',
      description: 'Une description',
    });
  });

  it('réenregistrer conserve la valeur activée et met à jour libellé et description', async () => {
    const flags = await load();
    flags.registerFeatureFlag('f', 'Ancien', 'a');
    flags.setFeatureFlag('f', true);

    flags.registerFeatureFlag('f', 'Nouveau libellé', 'b');

    expect(flags.getFeatureFlag('f')).toBe(true);
    expect(flags.featureFlagsStore.getState().flags.f).toEqual({ enabled: true, label: 'Nouveau libellé', description: 'b' });
  });
});

describe('setFeatureFlag / subscribeToFeatureFlag', () => {
  it('active un drapeau, le persiste et prévient les abonnés', async () => {
    const flags = await load();
    flags.registerFeatureFlag('f', 'F', 'd');
    const callback = vi.fn();
    flags.subscribeToFeatureFlag('f', callback);

    flags.setFeatureFlag('f', true);

    expect(flags.getFeatureFlag('f')).toBe(true);
    expect(localStorage.getItem('egen:feature-flag:f')).toBe('true');
    expect(callback).toHaveBeenLastCalledWith(true);
  });
});

describe('restauration depuis le stockage', () => {
  it('relit l’état et les métadonnées des drapeaux déjà persistés au chargement du module', async () => {
    localStorage.setItem('egen:feature-flag:persiste', 'true');
    localStorage.setItem('egen:feature-flag-meta:persiste', JSON.stringify({ label: 'L', description: 'D' }));
    localStorage.setItem('egen:feature-flag:sans-meta', 'false');
    localStorage.setItem('autre-cle', 'true');

    const flags = await load();

    expect(flags.featureFlagsStore.getState().flags).toEqual({
      persiste: { enabled: true, label: 'L', description: 'D' },
      'sans-meta': { enabled: false },
    });
  });
});

describe('cleanupObsoleteFeatureFlags', () => {
  it('supprime du stockage les drapeaux non enregistrés, et seulement eux', async () => {
    localStorage.setItem('egen:feature-flag:obsolete', 'true');
    localStorage.setItem('egen:feature-flag-meta:obsolete', '{}');
    const flags = await load();
    // Le module vient de restaurer « obsolete » : on le retire du store pour simuler un drapeau plus enregistré.
    flags.featureFlagsStore.setState({ flags: {} }, true);
    flags.registerFeatureFlag('actif', 'A', 'a');
    localStorage.setItem('egen:feature-flag:obsolete', 'true');
    localStorage.setItem('egen:feature-flag-meta:obsolete', '{}');

    flags.cleanupObsoleteFeatureFlags();

    expect(localStorage.getItem('egen:feature-flag:obsolete')).toBeNull();
    expect(localStorage.getItem('egen:feature-flag-meta:obsolete')).toBeNull();
    expect(localStorage.getItem('egen:feature-flag:actif')).toBe('false');
  });
});
