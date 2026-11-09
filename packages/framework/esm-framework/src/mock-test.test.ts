/**
 * A test that validates that `@egen-civitas/esm-framework/mock` has
 * the same API as `@egen-civitas/esm-framework`.
 *
 * Disabled because the mock is nowhere close to having the same
 * API. You can change `xit` to `it` to run the test and see a
 * comparison of the exports of the two modules.
 */
import { describe, expect, it } from 'vitest';
import * as real from './index';
import * as mock from '../mock';

describe('@egen-civitas/esm-framework/mock', () => {
  it.skip('should have the same exports as @egen-civitas/esm-framework', () => {
    expect(new Set(Object.keys(real))).toEqual(new Set(Object.keys(mock)));
  });

  it('should have a working goBackInHistory function', () => {
    mock.navigate({ to: '/test' });
    const history = mock.getHistory();
    mock.goBackInHistory({ toUrl: history[0] });
    expect(mock.getHistory()).toEqual([history[0]]);
    expect(mock.navigate).toHaveBeenCalled();
  });

  it('getPlatform() du mock : Platform de test sans Host, mêmes rejets que la production', async () => {
    const platform = mock.getPlatform();
    expect(platform.environment).toBe('web');
    expect(platform.has('secureStorage')).toBe(false);
    await expect(platform.secureStorage.get('k')).rejects.toBeInstanceOf(mock.PlatformError);
    await expect(platform.secureStorage.get('k')).rejects.toMatchObject({ code: 'UNAVAILABLE' });
  });

  it('createMockPlatform() permet de simuler une capacité', async () => {
    const platform = mock.createMockPlatform({ capabilities: { openExternal: { open: async () => {} } } });
    expect(platform.has('openExternal')).toBe(true);
    await expect(platform.openExternal.open('https://exemple.ga')).resolves.toBeUndefined();
  });

  it('createMockHost() simule le Host : handshake et appels de capacités', async () => {
    const host = mock.createMockHost({
      capabilities: { secureStorage: { v: 1 } },
      handlers: { 'secureStorage.get': () => 'v' },
    });
    const client = mock.createBridgeClient({ bridge: host.bridge, environment: 'android' });
    await client.hello();
    await expect(client.call('secureStorage', 'get', { key: 'k' })).resolves.toBe('v');
    expect(mock.getHostInfo()).toBeNull();
  });
});
