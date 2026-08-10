import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import createFetchMock from 'vitest-fetch-mock';

createFetchMock(vi).enableMocks();

describe('import-maps', () => {
  function setDomImportMaps(maps: Array<{ imports: Record<string, string> }>) {
    document.querySelectorAll('script[type="systemjs-importmap"]').forEach((el) => el.remove());

    for (const map of maps) {
      const script = document.createElement('script');
      script.type = 'systemjs-importmap';
      script.textContent = JSON.stringify(map);
      document.head.appendChild(script);
    }
  }

  beforeEach(() => {
    localStorage.clear();
    fetchMock.resetMocks();
    document.querySelectorAll('script[type="systemjs-importmap"]').forEach((el) => el.remove());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Reset spaEnv so it can be reassigned in next test
    Object.defineProperty(window, 'spaEnv', { value: undefined, writable: true, configurable: true });
  });

  describe('production mode', () => {
    beforeEach(async () => {
      (window as any).spaEnv = 'production';
      vi.resetModules();
    });

    it('getCurrentPageMap returns the base map without overrides', async () => {
      const { setupImportMapOverrides, getCurrentPageMap } = await import('./import-maps');
      setupImportMapOverrides();

      setDomImportMaps([{ imports: { '@egen/esm-foo': '/foo.js' } }, { imports: { '@egen/esm-bar': '/bar.js' } }]);

      localStorage.setItem('import-map-override:@egen/esm-foo', 'http://evil.com/foo.js');

      const map = await getCurrentPageMap();
      expect(map.imports['@egen/esm-foo']).toBe('/foo.js');
      expect(map.imports['@egen/esm-bar']).toBe('/bar.js');
    });

    it('getImportMapOverrideMap returns empty imports', async () => {
      const { setupImportMapOverrides, getImportMapOverrideMap } = await import('./import-maps');
      setupImportMapOverrides();

      localStorage.setItem('import-map-override:@egen/esm-foo', 'http://evil.com/foo.js');
      const map = getImportMapOverrideMap();
      expect(map.imports).toEqual({});
    });

    it('addImportMapOverride is a no-op', async () => {
      const { setupImportMapOverrides, addImportMapOverride } = await import('./import-maps');
      setupImportMapOverrides();

      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      addImportMapOverride('@egen/esm-foo', 'http://evil.com/foo.js');
      expect(localStorage.getItem('import-map-override:@egen/esm-foo')).toBeNull();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('disabled in production'));
    });

    it('removeImportMapOverride is a no-op', async () => {
      const { setupImportMapOverrides, removeImportMapOverride } = await import('./import-maps');
      setupImportMapOverrides();

      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      localStorage.setItem('import-map-override:@egen/esm-foo', '/foo.js');
      removeImportMapOverride('@egen/esm-foo');
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('disabled in production'));
    });

    it('resetImportMapOverrides is a no-op', async () => {
      const { setupImportMapOverrides, resetImportMapOverrides } = await import('./import-maps');
      setupImportMapOverrides();

      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      resetImportMapOverrides();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('disabled in production'));
    });

    it('getImportMapDisabledOverrides returns empty array', async () => {
      const { setupImportMapOverrides, getImportMapDisabledOverrides } = await import('./import-maps');
      setupImportMapOverrides();

      expect(getImportMapDisabledOverrides()).toEqual([]);
    });

    it('isImportMapOverrideDisabled returns false', async () => {
      const { setupImportMapOverrides, isImportMapOverrideDisabled } = await import('./import-maps');
      setupImportMapOverrides();

      expect(isImportMapOverrideDisabled('@egen/esm-foo')).toBe(false);
    });
  });

  describe('development mode', () => {
    beforeEach(async () => {
      (window as any).spaEnv = 'development';
      vi.resetModules();
    });

    it('getCurrentPageMap merges base map with overrides', async () => {
      setDomImportMaps([{ imports: { '@egen/esm-foo': '/foo.js', '@egen/esm-bar': '/bar.js' } }]);
      localStorage.setItem('import-map-override:@egen/esm-foo', 'http://localhost:8081/foo.js');

      const { setupImportMapOverrides, getCurrentPageMap } = await import('./import-maps');
      setupImportMapOverrides();

      const map = await getCurrentPageMap();
      expect(map.imports['@egen/esm-foo']).toBe('http://localhost:8081/foo.js');
      expect(map.imports['@egen/esm-bar']).toBe('/bar.js');
    });

    it('getImportMapDefaultMap returns only the base map', async () => {
      setDomImportMaps([{ imports: { '@egen/esm-foo': '/foo.js' } }]);
      localStorage.setItem('import-map-override:@egen/esm-foo', 'http://localhost:8081/foo.js');

      const { setupImportMapOverrides, getImportMapDefaultMap } = await import('./import-maps');
      setupImportMapOverrides();

      const map = await getImportMapDefaultMap();
      expect(map.imports['@egen/esm-foo']).toBe('/foo.js');
    });

    it('addImportMapOverride stores in localStorage', async () => {
      const { setupImportMapOverrides, addImportMapOverride } = await import('./import-maps');
      setupImportMapOverrides();

      addImportMapOverride('@egen/esm-foo', 'http://localhost:8081/foo.js');
      expect(localStorage.getItem('import-map-override:@egen/esm-foo')).toBe('http://localhost:8081/foo.js');
    });

    it('removeImportMapOverride removes from localStorage', async () => {
      localStorage.setItem('import-map-override:@egen/esm-foo', 'http://localhost:8081/foo.js');

      const { setupImportMapOverrides, removeImportMapOverride } = await import('./import-maps');
      setupImportMapOverrides();

      removeImportMapOverride('@egen/esm-foo');
      expect(localStorage.getItem('import-map-override:@egen/esm-foo')).toBeNull();
    });

    it('resetImportMapOverrides clears all override keys', async () => {
      localStorage.setItem('import-map-override:@egen/esm-foo', '/foo.js');
      localStorage.setItem('import-map-override:@egen/esm-bar', '/bar.js');
      localStorage.setItem('unrelated-key', 'value');

      const { setupImportMapOverrides, resetImportMapOverrides } = await import('./import-maps');
      setupImportMapOverrides();

      resetImportMapOverrides();
      expect(localStorage.getItem('import-map-override:@egen/esm-foo')).toBeNull();
      expect(localStorage.getItem('import-map-override:@egen/esm-bar')).toBeNull();
      expect(localStorage.getItem('unrelated-key')).toBe('value');
    });

    it('addImportMapOverride fires change event', async () => {
      const { setupImportMapOverrides, addImportMapOverride } = await import('./import-maps');
      setupImportMapOverrides();

      const handler = vi.fn();
      window.addEventListener('import-map-overrides:change', handler);

      addImportMapOverride('@egen/esm-foo', '/foo.js');
      expect(handler).toHaveBeenCalledTimes(1);

      window.removeEventListener('import-map-overrides:change', handler);
    });

    it('getImportMapOverrideMap excludes disabled overrides by default', async () => {
      localStorage.setItem('import-map-override:@egen/esm-foo', '/foo.js');
      localStorage.setItem('import-map-override:@egen/esm-bar', '/bar.js');
      localStorage.setItem('import-map-overrides-disabled', JSON.stringify(['@egen/esm-foo']));

      const { setupImportMapOverrides, getImportMapOverrideMap } = await import('./import-maps');
      setupImportMapOverrides();

      const map = getImportMapOverrideMap();
      expect(map.imports['@egen/esm-foo']).toBeUndefined();
      expect(map.imports['@egen/esm-bar']).toBe('/bar.js');
    });

    it('getImportMapOverrideMap includes disabled overrides when requested', async () => {
      localStorage.setItem('import-map-override:@egen/esm-foo', '/foo.js');
      localStorage.setItem('import-map-overrides-disabled', JSON.stringify(['@egen/esm-foo']));

      const { setupImportMapOverrides, getImportMapOverrideMap } = await import('./import-maps');
      setupImportMapOverrides();

      const map = getImportMapOverrideMap(true);
      expect(map.imports['@egen/esm-foo']).toBe('/foo.js');
    });

    it('getImportMapNextPageMap merges base map with current overrides', async () => {
      setDomImportMaps([{ imports: { '@egen/esm-foo': '/foo.js', '@egen/esm-bar': '/bar.js' } }]);
      localStorage.setItem('import-map-override:@egen/esm-foo', 'http://localhost:8081/foo.js');

      const { setupImportMapOverrides, addImportMapOverride, getImportMapNextPageMap } = await import('./import-maps');
      setupImportMapOverrides();

      // Add a new override after setup — should appear in the next-page map but not the current-page snapshot
      addImportMapOverride('@egen/esm-bar', 'http://localhost:8081/bar.js');

      const map = await getImportMapNextPageMap();
      expect(map.imports['@egen/esm-foo']).toBe('http://localhost:8081/foo.js');
      expect(map.imports['@egen/esm-bar']).toBe('http://localhost:8081/bar.js');
    });

    it('isImportMapOverrideDisabled returns true for a disabled override', async () => {
      localStorage.setItem('import-map-override:@egen/esm-foo', '/foo.js');
      localStorage.setItem('import-map-overrides-disabled', JSON.stringify(['@egen/esm-foo']));

      const { setupImportMapOverrides, isImportMapOverrideDisabled } = await import('./import-maps');
      setupImportMapOverrides();

      expect(isImportMapOverrideDisabled('@egen/esm-foo')).toBe(true);
      expect(isImportMapOverrideDisabled('@egen/esm-bar')).toBe(false);
    });

    it('enableImportMapOverride re-enables a disabled override', async () => {
      localStorage.setItem('import-map-override:@egen/esm-foo', '/foo.js');
      localStorage.setItem('import-map-override:@egen/esm-bar', '/bar.js');
      localStorage.setItem('import-map-overrides-disabled', JSON.stringify(['@egen/esm-foo', '@egen/esm-bar']));

      const {
        setupImportMapOverrides,
        enableImportMapOverride,
        getImportMapOverrideMap,
        getImportMapDisabledOverrides,
      } = await import('./import-maps');
      setupImportMapOverrides();

      // Both overrides are disabled — neither appears in the active override map
      expect(getImportMapOverrideMap().imports['@egen/esm-foo']).toBeUndefined();

      enableImportMapOverride('@egen/esm-foo');

      // Now foo is enabled again
      expect(getImportMapOverrideMap().imports['@egen/esm-foo']).toBe('/foo.js');
      // bar is still disabled
      expect(getImportMapDisabledOverrides()).toEqual(['@egen/esm-bar']);
    });

    it('enableImportMapOverride removes the disabled key when the last override is re-enabled', async () => {
      localStorage.setItem('import-map-override:@egen/esm-foo', '/foo.js');
      localStorage.setItem('import-map-overrides-disabled', JSON.stringify(['@egen/esm-foo']));

      const { setupImportMapOverrides, enableImportMapOverride, getImportMapDisabledOverrides } = await import(
        './import-maps'
      );
      setupImportMapOverrides();

      enableImportMapOverride('@egen/esm-foo');

      expect(getImportMapDisabledOverrides()).toEqual([]);
      expect(localStorage.getItem('import-map-overrides-disabled')).toBeNull();
    });

    it('enableImportMapOverride fires a change event', async () => {
      localStorage.setItem('import-map-override:@egen/esm-foo', '/foo.js');
      localStorage.setItem('import-map-overrides-disabled', JSON.stringify(['@egen/esm-foo']));

      const { setupImportMapOverrides, enableImportMapOverride } = await import('./import-maps');
      setupImportMapOverrides();

      const handler = vi.fn();
      window.addEventListener('import-map-overrides:change', handler);

      enableImportMapOverride('@egen/esm-foo');
      expect(handler).toHaveBeenCalledTimes(1);

      window.removeEventListener('import-map-overrides:change', handler);
    });

    it('handles remote import maps via fetch', async () => {
      const script = document.createElement('script');
      script.type = 'systemjs-importmap';
      Object.defineProperty(script, 'src', { value: 'http://localhost/importmap.json', writable: false });
      document.head.appendChild(script);

      fetchMock.mockResponseOnce(JSON.stringify({ imports: { '@egen/esm-remote': '/remote.js' } }));

      const { setupImportMapOverrides, getCurrentPageMap } = await import('./import-maps');
      setupImportMapOverrides();

      const map = await getCurrentPageMap();
      expect(map.imports['@egen/esm-remote']).toBe('/remote.js');
    });

    it('getImportMapNextPageMap does not include overrides added after setup in getCurrentPageMap', async () => {
      setDomImportMaps([{ imports: { '@egen/esm-foo': '/foo.js' } }]);

      const { setupImportMapOverrides, addImportMapOverride, getCurrentPageMap, getImportMapNextPageMap } =
        await import('./import-maps');
      setupImportMapOverrides();

      // Add an override after setup
      addImportMapOverride('@egen/esm-foo', 'http://localhost:8081/foo.js');

      // getCurrentPageMap uses the snapshot from setup time — override not reflected
      const currentMap = await getCurrentPageMap();
      expect(currentMap.imports['@egen/esm-foo']).toBe('/foo.js');

      // getImportMapNextPageMap reads the live overrides — reflects the new one
      const nextMap = await getImportMapNextPageMap();
      expect(nextMap.imports['@egen/esm-foo']).toBe('http://localhost:8081/foo.js');
    });
  });

  describe('merging behavior', () => {
    it('later maps override earlier ones', async () => {
      (window as any).spaEnv = 'production';
      vi.resetModules();

      setDomImportMaps([
        { imports: { '@egen/esm-foo': '/foo-v1.js' } },
        { imports: { '@egen/esm-foo': '/foo-v2.js' } },
      ]);

      const { setupImportMapOverrides, getCurrentPageMap } = await import('./import-maps');
      setupImportMapOverrides();

      const map = await getCurrentPageMap();
      expect(map.imports['@egen/esm-foo']).toBe('/foo-v2.js');
    });
  });

  describe('error handling', () => {
    it('skips malformed inline import map script tags', async () => {
      (window as any).spaEnv = 'production';
      vi.resetModules();

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // One valid map, one with invalid JSON
      const good = document.createElement('script');
      good.type = 'systemjs-importmap';
      good.textContent = JSON.stringify({ imports: { '@egen/esm-foo': '/foo.js' } });
      document.head.appendChild(good);

      const bad = document.createElement('script');
      bad.type = 'systemjs-importmap';
      bad.textContent = '{ not valid json';
      document.head.appendChild(bad);

      const { setupImportMapOverrides, getCurrentPageMap } = await import('./import-maps');
      setupImportMapOverrides();

      const map = await getCurrentPageMap();
      expect(map.imports['@egen/esm-foo']).toBe('/foo.js');
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to parse import map'), expect.anything());
    });
  });
});
