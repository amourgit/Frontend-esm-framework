import { afterEach, describe, expect, it } from 'vitest';
import { getPlatformEnvironment, isNativePlatform } from './detect';

describe('détection de plateforme', () => {
  afterEach(() => {
    delete (window as { egenTarget?: unknown }).egenTarget;
  });

  it('web par défaut', () => {
    expect(getPlatformEnvironment()).toBe('web');
    expect(isNativePlatform()).toBe(false);
  });

  it('lit window.egenTarget (posé au build)', () => {
    window.egenTarget = 'ios';
    expect(getPlatformEnvironment()).toBe('ios');
    expect(isNativePlatform()).toBe(true);
  });

  it("n'utilise jamais le User-Agent", () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
      configurable: true,
    });
    expect(getPlatformEnvironment()).toBe('web');
  });
});
