import { describe, expect, it } from 'vitest';
import { setBundlerEnv } from './config';

describe('setBundlerEnv', () => {
  it('sets EGEN_PROXY_TARGET when backend is provided', () => {
    setBundlerEnv({ backend: 'https://example.com' });
    expect(process.env.EGEN_PROXY_TARGET).toBe('https://example.com');
  });

  it('sets EGEN_PUBLIC_PATH when spaPath is provided', () => {
    setBundlerEnv({ spaPath: '/egen/spa/' });
    expect(process.env.EGEN_PUBLIC_PATH).toBe('/egen/spa/');
  });

  it('sets EGEN_API_URL when apiUrl is provided', () => {
    setBundlerEnv({ apiUrl: '/egen/' });
    expect(process.env.EGEN_API_URL).toBe('/egen/');
  });

  it('sets EGEN_PAGE_TITLE when pageTitle is provided', () => {
    setBundlerEnv({ pageTitle: 'My App' });
    expect(process.env.EGEN_PAGE_TITLE).toBe('My App');
  });

  it('sets EGEN_ADD_COOKIE when addCookie is provided', () => {
    setBundlerEnv({ addCookie: 'session=abc' });
    expect(process.env.EGEN_ADD_COOKIE).toBe('session=abc');
  });

  it('sets EGEN_OFFLINE to "enable" when supportOffline is true', () => {
    setBundlerEnv({ supportOffline: true });
    expect(process.env.EGEN_OFFLINE).toBe('enable');
  });

  it('sets EGEN_OFFLINE to "disable" when supportOffline is false', () => {
    setBundlerEnv({ supportOffline: false });
    expect(process.env.EGEN_OFFLINE).toBe('disable');
  });

  it('sets EGEN_CONFIG_URLS to semicolon-joined string from configUrls', () => {
    setBundlerEnv({ configUrls: ['https://a.com/config.json', 'https://b.com/config.json'] });
    expect(process.env.EGEN_CONFIG_URLS).toBe('https://a.com/config.json;https://b.com/config.json');
  });

  it('sets both EGEN_ENV and NODE_ENV when env is provided', () => {
    setBundlerEnv({ env: 'production' });
    expect(process.env.EGEN_ENV).toBe('production');
    expect(process.env.NODE_ENV).toBe('production');
  });

  it('sets EGEN_ESM_DEFAULT_LOCALE when defaultLocale is provided', () => {
    setBundlerEnv({ defaultLocale: 'en_GB' });
    expect(process.env.EGEN_ESM_DEFAULT_LOCALE).toBe('en_GB');
  });

  it('sets EGEN_ESM_IMPORTMAP for an inline importmap', () => {
    setBundlerEnv({ importmap: { type: 'inline', value: '{"imports":{}}' } });
    expect(process.env.EGEN_ESM_IMPORTMAP).toBe('{"imports":{}}');
  });

  it('sets EGEN_ESM_IMPORTMAP_URL for a URL importmap', () => {
    setBundlerEnv({ importmap: { type: 'url', value: 'https://example.com/importmap.json' } });
    expect(process.env.EGEN_ESM_IMPORTMAP_URL).toBe('https://example.com/importmap.json');
  });

  it('sets EGEN_ROUTES for inline routes', () => {
    setBundlerEnv({ routes: { type: 'inline', value: '{}' } });
    expect(process.env.EGEN_ROUTES).toBe('{}');
  });

  it('sets EGEN_ROUTES_URL for URL routes', () => {
    setBundlerEnv({ routes: { type: 'url', value: 'https://example.com/routes.json' } });
    expect(process.env.EGEN_ROUTES_URL).toBe('https://example.com/routes.json');
  });

  it('sets EGEN_ESM_CORE_APPS_DIR when coreAppsDir is provided', () => {
    setBundlerEnv({ coreAppsDir: '/apps' });
    expect(process.env.EGEN_ESM_CORE_APPS_DIR).toBe('/apps');
  });

  it('sets EGEN_CLEAN_BEFORE_BUILD when fresh is provided', () => {
    setBundlerEnv({ fresh: true });
    expect(process.env.EGEN_CLEAN_BEFORE_BUILD).toBe('true');
  });

  it('sets EGEN_JS_CSS_ASSETS to semicolon-joined string from assets', () => {
    setBundlerEnv({ assets: ['/path/to/a.css', '/path/to/b.js'] });
    expect(process.env.EGEN_JS_CSS_ASSETS).toBe('/path/to/a.css;/path/to/b.js');
  });

  it('does not set env vars for absent options', () => {
    const envBefore = { ...process.env };
    setBundlerEnv({});
    expect(process.env.EGEN_PROXY_TARGET).toBe(envBefore.EGEN_PROXY_TARGET);
  });
});
