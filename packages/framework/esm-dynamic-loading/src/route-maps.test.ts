import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import createFetchMock from 'vitest-fetch-mock';

createFetchMock(vi).enableMocks();

describe('route-maps', () => {
  function setDomRouteMaps(maps: Array<Record<string, unknown>>) {
    document.querySelectorAll("script[type='egen-routes']").forEach((el) => el.remove());

    for (const map of maps) {
      const script = document.createElement('script');
      script.type = 'egen-routes';
      script.textContent = JSON.stringify(map);
      document.head.appendChild(script);
    }
  }

  beforeEach(() => {
    localStorage.clear();
    fetchMock.resetMocks();
    document.querySelectorAll("script[type='egen-routes']").forEach((el) => el.remove());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, 'spaEnv', { value: undefined, writable: true, configurable: true });
  });

  describe('production mode', () => {
    beforeEach(async () => {
      (window as any).spaEnv = 'production';
      vi.resetModules();
    });

    it('getCurrentRouteMap returns base map without overrides', async () => {
      const { setupRouteMapOverrides, getCurrentRouteMap } = await import('./route-maps');
      await setupRouteMapOverrides();

      setDomRouteMaps([{ '@egen/esm-foo': { pages: [] }, '@egen/esm-bar': { extensions: [] } }]);
      localStorage.setItem('egen-routes:@egen/esm-foo', JSON.stringify({ pages: [{ component: 'evil', route: '/' }] }));

      const map = await getCurrentRouteMap();
      expect(map['@egen/esm-foo']).toEqual({ pages: [] });
      expect(map['@egen/esm-bar']).toEqual({ extensions: [] });
    });

    it('getRouteMapNextPageMap returns base map only', async () => {
      const { setupRouteMapOverrides, getRouteMapNextPageMap } = await import('./route-maps');
      await setupRouteMapOverrides();

      setDomRouteMaps([{ '@egen/esm-foo': { pages: [] } }]);
      localStorage.setItem('egen-routes:@egen/esm-foo', JSON.stringify({ pages: [{ component: 'evil', route: '/' }] }));

      const map = await getRouteMapNextPageMap();
      expect(map['@egen/esm-foo']).toEqual({ pages: [] });
    });

    it('getRouteMapOverrideMap returns empty object', async () => {
      const { setupRouteMapOverrides, getRouteMapOverrideMap } = await import('./route-maps');
      await setupRouteMapOverrides();

      localStorage.setItem('egen-routes:@egen/esm-foo', JSON.stringify({ pages: [] }));
      expect(getRouteMapOverrideMap()).toEqual({});
    });

    it('addRouteMapOverride is a no-op', async () => {
      const { setupRouteMapOverrides, addRouteMapOverride } = await import('./route-maps');
      await setupRouteMapOverrides();

      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      addRouteMapOverride('@egen/esm-foo', { pages: [] });
      expect(localStorage.getItem('egen-routes:@egen/esm-foo')).toBeNull();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('disabled outside development'));
    });

    it('removeRouteMapOverride is a no-op', async () => {
      const { setupRouteMapOverrides, removeRouteMapOverride } = await import('./route-maps');
      await setupRouteMapOverrides();

      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      removeRouteMapOverride('@egen/esm-foo');
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('disabled outside development'));
    });

    it('resetRouteMapOverrides is a no-op', async () => {
      const { setupRouteMapOverrides, resetRouteMapOverrides } = await import('./route-maps');
      await setupRouteMapOverrides();

      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      resetRouteMapOverrides();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('disabled outside development'));
    });
  });

  describe('development mode', () => {
    beforeEach(async () => {
      (window as any).spaEnv = 'development';
      vi.resetModules();
    });

    it('getCurrentRouteMap merges base map with JSON object overrides', async () => {
      setDomRouteMaps([{ '@egen/esm-foo': { pages: [] }, '@egen/esm-bar': { extensions: [] } }]);
      localStorage.setItem('egen-routes:@egen/esm-foo', JSON.stringify({ pages: [{ component: 'root', route: '/' }] }));

      const { setupRouteMapOverrides, getCurrentRouteMap } = await import('./route-maps');
      await setupRouteMapOverrides();

      const map = await getCurrentRouteMap();
      expect(map['@egen/esm-foo']).toEqual({ pages: [{ component: 'root', route: '/' }] });
      expect(map['@egen/esm-bar']).toEqual({ extensions: [] });
    });

    it('getCurrentRouteMap merges base map with URL-fetched overrides', async () => {
      setDomRouteMaps([{ '@egen/esm-foo': { pages: [] } }]);
      localStorage.setItem('egen-routes:@egen/esm-foo', JSON.stringify('http://localhost:8081/routes.json'));
      fetchMock.mockResponseOnce(JSON.stringify({ pages: [{ component: 'root', route: '/fetched' }] }));

      const { setupRouteMapOverrides, getCurrentRouteMap } = await import('./route-maps');
      await setupRouteMapOverrides();

      const map = await getCurrentRouteMap();
      expect(map['@egen/esm-foo']).toEqual({ pages: [{ component: 'root', route: '/fetched' }] });
    });

    it('getRouteMapDefaultMap returns only the base map', async () => {
      setDomRouteMaps([{ '@egen/esm-foo': { pages: [] } }]);
      localStorage.setItem('egen-routes:@egen/esm-foo', JSON.stringify({ pages: [{ component: 'x', route: '/' }] }));

      const { setupRouteMapOverrides, getRouteMapDefaultMap } = await import('./route-maps');
      await setupRouteMapOverrides();

      const map = await getRouteMapDefaultMap();
      expect(map['@egen/esm-foo']).toEqual({ pages: [] });
    });

    it('addRouteMapOverride stores an object in localStorage', async () => {
      const { setupRouteMapOverrides, addRouteMapOverride } = await import('./route-maps');
      await setupRouteMapOverrides();

      addRouteMapOverride('@egen/esm-foo', { pages: [{ component: 'root', route: '/' }] });
      expect(localStorage.getItem('egen-routes:@egen/esm-foo')).toBe('{"pages":[{"component":"root","route":"/"}]}');
    });

    it('addRouteMapOverride stores a JSON string in localStorage', async () => {
      const { setupRouteMapOverrides, addRouteMapOverride } = await import('./route-maps');
      await setupRouteMapOverrides();

      addRouteMapOverride('@egen/esm-foo', JSON.stringify({ pages: [{ component: 'root', route: '/' }] }));
      expect(localStorage.getItem('egen-routes:@egen/esm-foo')).toBe('{"pages":[{"component":"root","route":"/"}]}');
    });

    it('addRouteMapOverride stores an HTTP URL string in localStorage', async () => {
      const { setupRouteMapOverrides, addRouteMapOverride } = await import('./route-maps');
      await setupRouteMapOverrides();

      addRouteMapOverride('@egen/esm-foo', 'http://localhost/my-route-override.json');
      expect(localStorage.getItem('egen-routes:@egen/esm-foo')).toBe('"http://localhost/my-route-override.json"');
    });

    it('addRouteMapOverride stores a URL object in localStorage', async () => {
      const { setupRouteMapOverrides, addRouteMapOverride } = await import('./route-maps');
      await setupRouteMapOverrides();

      addRouteMapOverride('@egen/esm-foo', new URL('http://localhost/my-route-override.json'));
      expect(localStorage.getItem('egen-routes:@egen/esm-foo')).toBe('"http://localhost/my-route-override.json"');
    });

    it('removeRouteMapOverride removes from localStorage', async () => {
      localStorage.setItem('egen-routes:@egen/esm-foo', JSON.stringify({ pages: [] }));

      const { setupRouteMapOverrides, removeRouteMapOverride } = await import('./route-maps');
      await setupRouteMapOverrides();

      removeRouteMapOverride('@egen/esm-foo');
      expect(localStorage.getItem('egen-routes:@egen/esm-foo')).toBeNull();
    });

    it('resetRouteMapOverrides clears all override keys', async () => {
      localStorage.setItem('egen-routes:@egen/esm-foo', JSON.stringify({ pages: [] }));
      localStorage.setItem('egen-routes:@egen/esm-bar', JSON.stringify({ extensions: [] }));
      localStorage.setItem('unrelated-key', 'value');

      const { setupRouteMapOverrides, resetRouteMapOverrides } = await import('./route-maps');
      await setupRouteMapOverrides();

      resetRouteMapOverrides();
      expect(localStorage.getItem('egen-routes:@egen/esm-foo')).toBeNull();
      expect(localStorage.getItem('egen-routes:@egen/esm-bar')).toBeNull();
      expect(localStorage.getItem('unrelated-key')).toBe('value');
    });

    it('addRouteMapOverride fires change event', async () => {
      const { setupRouteMapOverrides, addRouteMapOverride } = await import('./route-maps');
      await setupRouteMapOverrides();

      const handler = vi.fn();
      window.addEventListener('egen-routes:change', handler);

      addRouteMapOverride('@egen/esm-foo', { pages: [] });
      expect(handler).toHaveBeenCalledTimes(1);

      window.removeEventListener('egen-routes:change', handler);
    });

    it('getRouteMapOverrideMap returns raw localStorage entries in dev mode', async () => {
      localStorage.setItem('egen-routes:@egen/esm-foo', JSON.stringify({ pages: [] }));
      localStorage.setItem('egen-routes:@egen/esm-bar', JSON.stringify('http://localhost/bar-routes.json'));
      localStorage.setItem('unrelated-key', 'value');

      const { setupRouteMapOverrides, getRouteMapOverrideMap } = await import('./route-maps');
      await setupRouteMapOverrides();

      const overrides = getRouteMapOverrideMap();
      expect(Object.keys(overrides)).toHaveLength(2);
      expect(overrides['@egen/esm-foo']).toBe(JSON.stringify({ pages: [] }));
      expect(overrides['@egen/esm-bar']).toBe(JSON.stringify('http://localhost/bar-routes.json'));
    });

    it('addRouteMapOverride rejects an invalid JSON string', async () => {
      const { setupRouteMapOverrides, addRouteMapOverride } = await import('./route-maps');
      await setupRouteMapOverrides();

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      addRouteMapOverride('@egen/esm-foo', JSON.stringify({ pages: 'not an array' }));
      expect(localStorage.getItem('egen-routes:@egen/esm-foo')).toBeNull();
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('not a valid EgenAppRoutes'), expect.anything());
    });

    it('getRouteMapNextPageMap reflects overrides added after setup', async () => {
      setDomRouteMaps([{ '@egen/esm-foo': { pages: [] } }]);

      const { setupRouteMapOverrides, addRouteMapOverride, getCurrentRouteMap, getRouteMapNextPageMap } = await import(
        './route-maps'
      );
      await setupRouteMapOverrides();

      addRouteMapOverride('@egen/esm-foo', { pages: [{ component: 'new', route: '/new' }] });

      // getCurrentRouteMap uses the snapshot — doesn't reflect post-setup changes
      const currentMap = await getCurrentRouteMap();
      expect(currentMap['@egen/esm-foo']).toEqual({ pages: [] });

      // getRouteMapNextPageMap reads live overrides
      const nextMap = await getRouteMapNextPageMap();
      expect(nextMap['@egen/esm-foo']).toEqual({ pages: [{ component: 'new', route: '/new' }] });
    });
  });

  describe('merging behavior', () => {
    it('later route maps override earlier ones', async () => {
      (window as any).spaEnv = 'production';
      vi.resetModules();

      setDomRouteMaps([
        { '@egen/esm-foo': { pages: [{ component: 'v1', route: '/' }] } },
        { '@egen/esm-foo': { pages: [{ component: 'v2', route: '/' }] } },
      ]);

      const { setupRouteMapOverrides, getCurrentRouteMap } = await import('./route-maps');
      await setupRouteMapOverrides();

      const map = await getCurrentRouteMap();
      expect(map['@egen/esm-foo']).toEqual({ pages: [{ component: 'v2', route: '/' }] });
    });
  });

  describe('error handling', () => {
    it('reads route maps from remote script src attributes', async () => {
      (window as any).spaEnv = 'production';
      vi.resetModules();

      const script = document.createElement('script');
      script.type = 'egen-routes';
      Object.defineProperty(script, 'src', { value: 'http://localhost/routes.json', writable: false });
      document.head.appendChild(script);

      fetchMock.mockResponseOnce(
        JSON.stringify({ '@egen/esm-remote': { pages: [{ component: 'root', route: '/remote' }] } }),
      );

      const { setupRouteMapOverrides, getCurrentRouteMap } = await import('./route-maps');
      await setupRouteMapOverrides();

      const map = await getCurrentRouteMap();
      expect(map['@egen/esm-remote']).toEqual({ pages: [{ component: 'root', route: '/remote' }] });
      expect(fetchMock).toHaveBeenCalledWith('http://localhost/routes.json');
    });

    it('merges remote and inline route maps', async () => {
      (window as any).spaEnv = 'production';
      vi.resetModules();

      const inline = document.createElement('script');
      inline.type = 'egen-routes';
      inline.textContent = JSON.stringify({ '@egen/esm-inline': { extensions: [] } });
      document.head.appendChild(inline);

      const remote = document.createElement('script');
      remote.type = 'egen-routes';
      Object.defineProperty(remote, 'src', { value: 'http://localhost/routes.json', writable: false });
      document.head.appendChild(remote);

      fetchMock.mockResponseOnce(JSON.stringify({ '@egen/esm-remote': { pages: [] } }));

      const { setupRouteMapOverrides, getCurrentRouteMap } = await import('./route-maps');
      await setupRouteMapOverrides();

      const map = await getCurrentRouteMap();
      expect(map['@egen/esm-inline']).toEqual({ extensions: [] });
      expect(map['@egen/esm-remote']).toEqual({ pages: [] });
    });

    it('skips remote route maps that fail to fetch', async () => {
      (window as any).spaEnv = 'production';
      vi.resetModules();

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const good = document.createElement('script');
      good.type = 'egen-routes';
      good.textContent = JSON.stringify({ '@egen/esm-foo': { pages: [] } });
      document.head.appendChild(good);

      const bad = document.createElement('script');
      bad.type = 'egen-routes';
      Object.defineProperty(bad, 'src', { value: 'http://localhost/broken.json', writable: false });
      document.head.appendChild(bad);

      fetchMock.mockRejectOnce(new Error('Network error'));

      const { setupRouteMapOverrides, getCurrentRouteMap } = await import('./route-maps');
      await setupRouteMapOverrides();

      const map = await getCurrentRouteMap();
      expect(map['@egen/esm-foo']).toEqual({ pages: [] });
      expect(map['@egen/esm-broken']).toBeUndefined();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to parse routes'), expect.anything());
    });

    it('skips remote route maps that return invalid JSON', async () => {
      (window as any).spaEnv = 'production';
      vi.resetModules();

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const script = document.createElement('script');
      script.type = 'egen-routes';
      Object.defineProperty(script, 'src', { value: 'http://localhost/bad.json', writable: false });
      document.head.appendChild(script);

      fetchMock.mockResponseOnce('not json', { status: 200 });

      const { setupRouteMapOverrides, getCurrentRouteMap } = await import('./route-maps');
      await setupRouteMapOverrides();

      const map = await getCurrentRouteMap();
      expect(Object.keys(map)).toHaveLength(0);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to parse routes'), expect.anything());
    });

    it('skips remote route maps that return non-EgenRoutes data', async () => {
      (window as any).spaEnv = 'production';
      vi.resetModules();

      const script = document.createElement('script');
      script.type = 'egen-routes';
      Object.defineProperty(script, 'src', { value: 'http://localhost/notroutes.json', writable: false });
      document.head.appendChild(script);

      fetchMock.mockResponseOnce(JSON.stringify({ something: 'unexpected' }));

      const { setupRouteMapOverrides, getCurrentRouteMap } = await import('./route-maps');
      await setupRouteMapOverrides();

      const map = await getCurrentRouteMap();
      expect(Object.keys(map)).toHaveLength(0);
    });

    it('skips malformed inline route map script tags', async () => {
      (window as any).spaEnv = 'production';
      vi.resetModules();

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const good = document.createElement('script');
      good.type = 'egen-routes';
      good.textContent = JSON.stringify({ '@egen/esm-foo': { pages: [] } });
      document.head.appendChild(good);

      const bad = document.createElement('script');
      bad.type = 'egen-routes';
      bad.textContent = '{ not valid json';
      document.head.appendChild(bad);

      const { setupRouteMapOverrides, getCurrentRouteMap } = await import('./route-maps');
      await setupRouteMapOverrides();

      const map = await getCurrentRouteMap();
      expect(map['@egen/esm-foo']).toEqual({ pages: [] });
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to parse routes'), expect.anything());
    });

    it('skips failed URL override fetches gracefully', async () => {
      (window as any).spaEnv = 'development';
      vi.resetModules();

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      localStorage.setItem('egen-routes:@egen/esm-foo', JSON.stringify('http://localhost:9999/bad.json'));
      fetchMock.mockRejectOnce(new Error('Network error'));

      const { setupRouteMapOverrides, getCurrentRouteMap } = await import('./route-maps');
      await setupRouteMapOverrides();

      const map = await getCurrentRouteMap();
      expect(map['@egen/esm-foo']).toBeUndefined();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to load route override'), expect.anything());
    });

    it('skips URL overrides that return non-EgenAppRoutes data', async () => {
      (window as any).spaEnv = 'development';
      vi.resetModules();

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      localStorage.setItem('egen-routes:@egen/esm-foo', JSON.stringify('http://localhost/bad-routes.json'));
      fetchMock.mockResponseOnce(JSON.stringify({ pages: 'not an array' }));

      const { setupRouteMapOverrides, getCurrentRouteMap } = await import('./route-maps');
      await setupRouteMapOverrides();

      const map = await getCurrentRouteMap();
      expect(map['@egen/esm-foo']).toBeUndefined();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to load route override'), expect.anything());
    });

    it('skips overrides that are neither objects nor URL strings', async () => {
      (window as any).spaEnv = 'development';
      vi.resetModules();

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      localStorage.setItem('egen-routes:@egen/esm-foo', JSON.stringify(42));

      const { setupRouteMapOverrides, getCurrentRouteMap } = await import('./route-maps');
      await setupRouteMapOverrides();

      const map = await getCurrentRouteMap();
      expect(map['@egen/esm-foo']).toBeUndefined();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to load route override'), expect.anything());
    });

    it('handles invalid JSON in localStorage overrides', async () => {
      (window as any).spaEnv = 'development';
      vi.resetModules();

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      localStorage.setItem('egen-routes:@egen/esm-foo', 'not json at all');

      const { setupRouteMapOverrides, getCurrentRouteMap } = await import('./route-maps');
      await setupRouteMapOverrides();

      const map = await getCurrentRouteMap();
      expect(map['@egen/esm-foo']).toBeUndefined();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to load route override'), expect.anything());
    });
  });
});
