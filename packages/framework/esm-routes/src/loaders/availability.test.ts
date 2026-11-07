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
});
