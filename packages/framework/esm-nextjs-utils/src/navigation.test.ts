import { describe, expect, it } from 'vitest';
import {
  buildCoreUrl,
  buildEmbedSrc,
  coreSubpath,
  createRateLimiter,
  normalizeAppPath,
  stripSensitive,
  toAppPath,
  toCorePath,
} from './navigation.js';

describe('navigation partagée : fonctions pures', () => {
  it('normalizeAppPath : chemins internes sûrs uniquement', () => {
    for (const ok of ['/', '/a/b?x=1#h', '/dashboard/recent?team-id=1']) expect(normalizeAppPath(ok)).toBe(ok);
    for (const ko of ['//evil.com', 'https://x.org', 'javascript:1', 'a', '/a b', '/a\\b', '/a\u0000', 7, undefined, '/' + 'x'.repeat(2001)]) {
      expect(normalizeAppPath(ko)).toBeNull();
    }
  });

  it('stripSensitive : requête et fragment, insensible à la casse, ajouts configurables', () => {
    expect(stripSensitive('/a?x=1&token=S&Code=C&y=2')).toBe('/a?x=1&y=2');
    expect(stripSensitive('/a?token=S')).toBe('/a');
    expect(stripSensitive('/#/invite?TOKEN=S&team=1')).toBe('/#/invite?team=1');
    expect(stripSensitive('/a?invite=Z&x=1', ['invite'])).toBe('/a?x=1');
    expect(stripSensitive('/a?%74oken=S&x=1')).toBe('/a?x=1');
    expect(stripSensitive('/a?tokenize=1')).toBe('/a?tokenize=1');
  });

  it('coreSubpath / buildCoreUrl : aller-retour sur la route de la page', () => {
    expect(coreSubpath('/egen/spa/penpot', '/egen/spa/', 'penpot')).toBe('/');
    expect(coreSubpath('/egen/spa/penpot/', '/egen/spa/', 'penpot')).toBe('/');
    expect(coreSubpath('/egen/spa/penpot/dash/x', '/egen/spa/', 'penpot')).toBe('/dash/x');
    expect(coreSubpath('/egen/spa/penpotx', '/egen/spa/', 'penpot')).toBeNull();
    expect(coreSubpath('/egen/spa/home', '/egen/spa/', 'penpot')).toBeNull();
    expect(coreSubpath('/penpot/a', '/', 'penpot')).toBe('/a');
    expect(buildCoreUrl('/egen/spa/', 'penpot', '/dash/x?q=1')).toBe('/egen/spa/penpot/dash/x?q=1');
    expect(buildCoreUrl('/egen/spa/', 'penpot', '/')).toBe('/egen/spa/penpot');
    expect(buildCoreUrl('/', 'penpot', '/a')).toBe('/penpot/a');
  });

  it('buildEmbedSrc : history, hash, none, racine, préfixe de base', () => {
    expect(buildEmbedSrc('https://a.org', '/', 'history')).toBe('https://a.org');
    expect(buildEmbedSrc('https://a.org/', '/x/y?q=1#h', 'history')).toBe('https://a.org/x/y?q=1#h');
    expect(buildEmbedSrc('https://a.org/studio/', '/x?q=1', 'history')).toBe('https://a.org/studio/x?q=1');
    expect(buildEmbedSrc('https://a.org/', '/dash/recent?t=1', 'hash')).toBe('https://a.org/#/dash/recent?t=1');
    expect(buildEmbedSrc('https://a.org/', '/x', 'none')).toBe('https://a.org/');
  });

  it('toCorePath / toAppPath : filtrage, pathMap, rejet des chemins dangereux', () => {
    expect(toCorePath('/a?token=S&x=1', {})).toBe('/a?x=1');
    expect(toCorePath('//evil', {})).toBeNull();
    const pathMap = { toCore: (p: string) => p.replace(/^\/w/, '/workspace'), toApp: (p: string) => p.replace(/^\/workspace/, '/w') };
    expect(toCorePath('/w/1', { pathMap })).toBe('/workspace/1');
    expect(toAppPath('/workspace/1', { pathMap })).toBe('/w/1');
    expect(toCorePath('/a', { pathMap: { toCore: () => 'https://evil.org' } })).toBeNull();
  });

  it('createRateLimiter : plafonne les rafales puis reprend', () => {
    let t = 0;
    const allow = createRateLimiter(3, 1000, () => t);
    expect([allow(), allow(), allow(), allow()]).toEqual([true, true, true, false]);
    t = 1500;
    expect(allow()).toBe(true);
  });
});
