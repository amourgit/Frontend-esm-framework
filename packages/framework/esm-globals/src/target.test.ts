// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { getEgenTarget, isNativeTarget } from './target';

describe('getEgenTarget', () => {
  afterEach(() => {
    delete (window as { egenTarget?: unknown }).egenTarget;
  });

  it('retourne "web" quand rien n\'est posé (HTML web historique)', () => {
    expect(getEgenTarget()).toBe('web');
    expect(isNativeTarget()).toBe(false);
  });

  it.each(['android', 'ios'] as const)('reconnaît %s', (target) => {
    window.egenTarget = target;
    expect(getEgenTarget()).toBe(target);
    expect(isNativeTarget()).toBe(true);
  });

  it('valeur invalide ⇒ "web" (aucun repli vers le natif)', () => {
    (window as { egenTarget?: unknown }).egenTarget = 'windows';
    expect(getEgenTarget()).toBe('web');
    expect(isNativeTarget()).toBe(false);
  });
});

describe('getEgenTarget sans DOM', () => {
  it('retourne "web" quand window est indéfini (SSR / node)', async () => {
    const { vi } = await import('vitest');
    vi.stubGlobal('window', undefined);
    try {
      expect(getEgenTarget()).toBe('web');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
