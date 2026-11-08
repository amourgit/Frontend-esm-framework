import { afterEach, describe, expect, it } from 'vitest';
import { hasCapability, setCapabilityResolver } from './capabilities';

describe('hasCapability', () => {
  afterEach(() => setCapabilityResolver(null));

  it("ne suppose aucune capacité tant qu'aucun résolveur n'est posé", () => {
    expect(hasCapability('camera')).toBe(false);
  });

  it('délègue au résolveur', () => {
    setCapabilityResolver((c) => c === 'camera');
    expect(hasCapability('camera')).toBe(true);
    expect(hasCapability('push')).toBe(false);
  });

  it('retire le résolveur avec null', () => {
    setCapabilityResolver(() => true);
    setCapabilityResolver(null);
    expect(hasCapability('camera')).toBe(false);
  });
});
