import { describe, expect, it } from 'vitest';
import { buildCoreUrl, buildEmbedSrc, normalizeAppPath, stripSensitive, toAppPath, toCorePath, MAX_APP_PATH_LENGTH } from './navigation.js';

function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PARTS = ['/', '//', '\\', '..', '/..', '%2e%2e', '%2F', 'https://evil.example', 'javascript:', '?token=abc', '&access_token=x', '?code=1&state=2', '#', '#/a?session=1', '\u0000', '\n', ' ', 'a', 'dashboard', '/x/y', '@', ':', '%00', '\u202e', 'é'.repeat(50)];
const randomPath = (r: () => number) => Array.from({ length: 1 + Math.floor(r() * 8) }, () => PARTS[Math.floor(r() * PARTS.length)]).join('');
/** Un chemin réel n'a qu'un seul `#` (le hash) : on retire ceux du bruit avant d'ajouter le nôtre. */
const noHash = (path: string) => path.replace(/#/g, '');

const ROUNDS = 5000;

describe('fuzz : navigation partagée', () => {
  it('normalizeAppPath : soit null, soit un chemin interne sûr (jamais absolu, protocole-relatif, antislash, contrôle)', () => {
    const r = rng(11);
    for (let i = 0; i < ROUNDS; i++) {
      const out = normalizeAppPath(randomPath(r));
      if (out === null) continue;
      expect(out.startsWith('/')).toBe(true);
      expect(out.startsWith('//')).toBe(false);
      expect(out).not.toContain('\\');
      // eslint-disable-next-line no-control-regex
      expect(/[\u0000-\u001f]/.test(out)).toBe(false);
      expect(out.length).toBeLessThanOrEqual(MAX_APP_PATH_LENGTH);
    }
  });

  it('normalizeAppPath : entrées non textuelles → null', () => {
    for (const v of [undefined, null, 1, {}, [], true]) expect(normalizeAppPath(v)).toBeNull();
  });

  it('stripSensitive : aucun paramètre sensible ne survit, dans la requête comme dans le hash', () => {
    const r = rng(12);
    const sensitive = ['token', 'access_token', 'code', 'state', 'password', 'session', 'key'];
    for (let i = 0; i < ROUNDS; i++) {
      const p = normalizeAppPath(`${noHash(randomPath(r))}?${sensitive[Math.floor(r() * sensitive.length)]}=secret&a=1#/h?${sensitive[Math.floor(r() * sensitive.length)].toUpperCase()}=secret2`);
      if (!p) continue;
      const out = stripSensitive(p);
      expect(out).not.toMatch(/secret/);
    }
  });

  it('buildCoreUrl / buildEmbedSrc : l’origine n’est jamais modifiée par un chemin d’app', () => {
    const r = rng(13);
    for (let i = 0; i < ROUNDS; i++) {
      const p = normalizeAppPath(randomPath(r));
      if (!p) continue;
      const core = buildCoreUrl('/spa/', 'studio', p);
      expect(core.startsWith('/spa/studio')).toBe(true);
      for (const mode of ['history', 'hash', 'none'] as const) {
        const src = buildEmbedSrc('https://studio.exemple.org', p, mode);
        expect(new URL(src).origin).toBe('https://studio.exemple.org');
      }
    }
  });

  it('toCorePath / toAppPath : jamais d’exception, résultat interne ou null', () => {
    const r = rng(14);
    for (let i = 0; i < ROUNDS; i++) {
      const raw = randomPath(r);
      for (const out of [toCorePath(raw, {}), toAppPath(raw, {})]) {
        if (out !== null) {
          expect(out.startsWith('/')).toBe(true);
          expect(out.startsWith('//')).toBe(false);
        }
      }
    }
  });
});
