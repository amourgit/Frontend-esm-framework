import { afterEach, describe, expect, it, vi } from 'vitest';
import { isDevAuthBypassEnabled } from './dev-auth-bypass';

describe('isDevAuthBypassEnabled — cibles natives (G2)', () => {
  afterEach(() => {
    delete (window as { egenTarget?: unknown }).egenTarget;
    delete (window as { egenDevNoAuth?: unknown }).egenDevNoAuth;
    vi.unstubAllEnvs();
  });

  it('web : canal runtime window.egenDevNoAuth toujours honoré (non-régression)', () => {
    window.egenDevNoAuth = true;
    expect(isDevAuthBypassEnabled()).toBe(true);
  });

  it('web : canal build EGEN_DEV_NO_AUTH toujours honoré (non-régression)', () => {
    vi.stubEnv('EGEN_DEV_NO_AUTH', 'true');
    expect(isDevAuthBypassEnabled()).toBe(true);
  });

  it.each(['android', 'ios'] as const)('%s : inerte même si window.egenDevNoAuth est vrai', (target) => {
    window.egenTarget = target;
    window.egenDevNoAuth = true;
    expect(isDevAuthBypassEnabled()).toBe(false);
  });

  it.each(['android', 'ios'] as const)('%s : inerte même si EGEN_DEV_NO_AUTH=true', (target) => {
    window.egenTarget = target;
    vi.stubEnv('EGEN_DEV_NO_AUTH', 'true');
    expect(isDevAuthBypassEnabled()).toBe(false);
  });
});
