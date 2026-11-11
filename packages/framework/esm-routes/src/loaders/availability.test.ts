import { afterEach, describe, expect, it } from 'vitest';
import { setCapabilityResolver } from '@egen-civitas/esm-globals';
import { getAppUnavailability } from './availability';

describe('getAppUnavailability', () => {
  afterEach(() => {
    setCapabilityResolver(null);
    delete (window as { egenTarget?: unknown }).egenTarget;
  });

  it('app sans champs : toujours disponible (comportement historique)', () => {
    expect(getAppUnavailability({})).toBeNull();
    window.egenTarget = 'ios';
    expect(getAppUnavailability({})).toBeNull();
  });

  it('platforms vide ou invalide = pas de restriction', () => {
    expect(getAppUnavailability({ platforms: [] })).toBeNull();
    expect(getAppUnavailability({ platforms: 'ios' as never })).toBeNull();
  });

  it('écarte une app dont la plateforme ne correspond pas', () => {
    expect(getAppUnavailability({ platforms: ['ios'] })).toEqual({
      reason: 'platform',
      target: 'web',
      platforms: ['ios'],
    });
  });

  it('accepte une app dont la plateforme correspond', () => {
    expect(getAppUnavailability({ platforms: ['web', 'android'] })).toBeNull();
    window.egenTarget = 'android';
    expect(getAppUnavailability({ platforms: ['android'] })).toBeNull();
  });

  it("écarte une app dont une capacité requise manque (aucune capacité n'est supposée)", () => {
    expect(getAppUnavailability({ requiredCapabilities: ['camera'] })).toEqual({
      reason: 'capability',
      missing: ['camera'],
    });
  });

  it('liste uniquement les capacités manquantes', () => {
    setCapabilityResolver((c) => c === 'files');
    expect(getAppUnavailability({ requiredCapabilities: ['files', 'camera', 'push'] })).toEqual({
      reason: 'capability',
      missing: ['camera', 'push'],
    });
  });

  it('accepte une app dont toutes les capacités sont disponibles', () => {
    setCapabilityResolver(() => true);
    expect(getAppUnavailability({ requiredCapabilities: ['camera', 'files'] })).toBeNull();
  });

  it('la plateforme est vérifiée avant les capacités', () => {
    expect(getAppUnavailability({ platforms: ['ios'], requiredCapabilities: ['camera'] })?.reason).toBe('platform');
  });

  describe('compatibilité avec le framework (F4)', () => {
    it('plage satisfaite : app disponible', () => {
      expect(getAppUnavailability({ frameworkRange: '>=3.0.0' }, '4.0.0')).toBeNull();
      expect(getAppUnavailability({ frameworkRange: '^4.0.0' }, '4.2.1')).toBeNull();
    });

    it('plage non satisfaite : app écartée avec la plage exigée et la version courante', () => {
      expect(getAppUnavailability({ frameworkRange: '^5.0.0' }, '4.0.0')).toEqual({
        reason: 'framework',
        required: '^5.0.0',
        current: '4.0.0',
      });
    });

    it('une préversion du framework satisfait une plage compatible', () => {
      expect(getAppUnavailability({ frameworkRange: '>=3.0.0' }, '4.0.0-next.3')).toBeNull();
    });

    it('plage absente (ancien format) : toléré', () => {
      expect(getAppUnavailability({}, '4.0.0')).toBeNull();
      expect(getAppUnavailability({ frameworkRange: '' }, '4.0.0')).toBeNull();
    });

    it('version du framework indisponible (hors bundle) : non vérifiable, donc non bloquant', () => {
      expect(getAppUnavailability({ frameworkRange: '^99.0.0' }, undefined)).toBeNull();
    });

    it('plage illisible : app écartée (échec fermé)', () => {
      expect(getAppUnavailability({ frameworkRange: 'pas une plage' }, '4.0.0')?.reason).toBe('framework');
    });

    it('ordre : plateforme, puis framework, puis capacités', () => {
      expect(
        getAppUnavailability(
          { platforms: ['ios'], frameworkRange: '^9.0.0', requiredCapabilities: ['camera'] },
          '4.0.0',
        )?.reason,
      ).toBe('platform');
      expect(
        getAppUnavailability({ frameworkRange: '^9.0.0', requiredCapabilities: ['camera'] }, '4.0.0')?.reason,
      ).toBe('framework');
    });
  });
});
