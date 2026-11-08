import { afterEach, describe, expect, it } from 'vitest';
import { hasCapability, setCapabilityResolver } from '@egen-civitas/esm-globals';
import { PlatformError } from './errors';
import { registerPlatformCapabilities } from './platform';

describe('registerPlatformCapabilities (F2)', () => {
  afterEach(() => {
    setCapabilityResolver(null);
    delete (window as { egenTarget?: unknown }).egenTarget;
    delete (window as { egenHostBridge?: unknown }).egenHostBridge;
  });

  it('web : expose les capacités du navigateur au reste du framework et se résout', async () => {
    await expect(registerPlatformCapabilities()).resolves.toBeUndefined();

    expect(hasCapability('openExternal')).toBe(true);
    expect(hasCapability('secureStorage')).toBe(false); // jamais simulé en Web
    expect(hasCapability('biometric')).toBe(false);
  });

  it("natif sans Host : rejette INCOMPATIBLE mais n'expose AUCUNE capacité", async () => {
    window.egenTarget = 'android';

    const error = await registerPlatformCapabilities().then(
      () => null,
      (e) => e,
    );

    expect(error).toBeInstanceOf(PlatformError);
    expect((error as PlatformError).code).toBe('INCOMPATIBLE');
    expect(hasCapability('openExternal')).toBe(false);
    expect(hasCapability('session')).toBe(false);
  });
});
