import { describe, expect, it } from 'vitest';
import { PlatformError, isPlatformError, unavailable } from './errors';

describe('PlatformError', () => {
  it('porte code, retryable et contexte', () => {
    const e = new PlatformError('TIMEOUT', 'trop long', { retryable: true, capability: 'files', method: 'select' });
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('PlatformError');
    expect(e.code).toBe('TIMEOUT');
    expect(e.retryable).toBe(true);
    expect(e.capability).toBe('files');
    expect(e.method).toBe('select');
  });

  it('retryable vaut false par défaut', () => {
    expect(new PlatformError('DENIED', 'non').retryable).toBe(false);
  });

  it('unavailable() construit une erreur UNAVAILABLE non rejouable', () => {
    const e = unavailable('secureStorage', 'get');
    expect(e.code).toBe('UNAVAILABLE');
    expect(e.retryable).toBe(false);
    expect(e.capability).toBe('secureStorage');
  });

  it('isPlatformError distingue les erreurs de plateforme', () => {
    expect(isPlatformError(unavailable('x'))).toBe(true);
    expect(isPlatformError(new Error('x'))).toBe(false);
    expect(isPlatformError(null)).toBe(false);
  });
});
