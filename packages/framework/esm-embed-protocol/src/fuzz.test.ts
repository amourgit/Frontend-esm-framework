import { describe, expect, it } from 'vitest';
import {
  IFRAME_ALLOW_TOKENS,
  IFRAME_SANDBOX_TOKENS,
  allowedContributions,
  effectiveGrants,
  effectiveIframe,
  negotiateProtocol,
  parseConnect,
  parseEnvelope,
  parseHello,
  parsePort,
  parseRpc,
  sanitizeIframeRights,
  validateConfig,
  validateIframeRights,
  validateManifest,
} from './index.js';

/** PRNG déterministe (mulberry32) : un échec se rejoue avec la même graine. */
function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STRINGS = ['', ' ', '*', '..', '/', '//', '\\', '__proto__', 'constructor', 'prototype', 'allow-top-navigation', 'allow-scripts', 'fullscreen', 'camera', '\u0000', 'é'.repeat(300), 'javascript:alert(1)', 'https://evil.example', '<script>', 'allow-downloads', 'allow-downloads'];

function junk(r: () => number, depth = 0): unknown {
  const pick = Math.floor(r() * (depth > 2 ? 7 : 10));
  switch (pick) {
    case 0: return undefined;
    case 1: return null;
    case 2: return Math.floor(r() * 1e6) - 5e5;
    case 3: return r() < 0.5;
    case 4: return STRINGS[Math.floor(r() * STRINGS.length)];
    case 5: return Number.NaN;
    case 6: return Symbol.iterator.toString();
    case 7: return Array.from({ length: Math.floor(r() * 25) }, () => junk(r, depth + 1));
    case 8: {
      const o: Record<string, unknown> = {};
      for (let i = 0; i < Math.floor(r() * 6); i++) o[STRINGS[Math.floor(r() * STRINGS.length)] || 'k'] = junk(r, depth + 1);
      return o;
    }
    default: return JSON.parse('{"__proto__":{"polluted":true},"sandbox":["allow-scripts"],"allow":["camera"]}');
  }
}

const ROUNDS = 3000;

describe('fuzz : les gardes ne lèvent jamais et ne s’auto-accordent rien', () => {
  it('parseurs de messages : toute entrée mal formée → null, jamais d’exception', () => {
    const r = rng(1);
    for (let i = 0; i < ROUNDS; i++) {
      const v = junk(r);
      const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
      expect(() => {
        parseEnvelope(v);
        parseHello(o);
        parseConnect(o);
        parsePort(o);
        parseRpc(v);
      }).not.toThrow();
    }
  });

  it('validateManifest / validateConfig / validateIframeRights : jamais d’exception, résultat cohérent', () => {
    const r = rng(2);
    for (let i = 0; i < ROUNDS; i++) {
      const v = junk(r);
      const res = validateManifest(v);
      expect(typeof res.ok).toBe('boolean');
      if (!res.ok) expect(res.errors.length).toBeGreaterThan(0);
      expect(Array.isArray(validateConfig(v))).toBe(true);
      expect(Array.isArray(validateIframeRights(v))).toBe(true);
    }
  });

  it('effectiveIframe : sortie ⊆ liste blanche ∩ plafond ∩ demande, quelle que soit l’entrée', () => {
    const r = rng(3);
    for (let i = 0; i < ROUNDS; i++) {
      const requested = junk(r) as { sandbox?: string[]; allow?: string[] } | undefined;
      const approved = junk(r) as { sandbox?: string[]; allow?: string[] } | undefined;
      const out = effectiveIframe(requested, approved);
      for (const t of out.sandbox) {
        expect(IFRAME_SANDBOX_TOKENS).toContain(t);
        expect(t).not.toMatch(/top-navigation/);
        expect(approved?.sandbox).toContain(t);
        expect(requested?.sandbox).toContain(t);
      }
      for (const t of out.allow) {
        expect(IFRAME_ALLOW_TOKENS).toContain(t);
        expect(approved?.allow).toContain(t);
        expect(requested?.allow).toContain(t);
      }
      expect(new Set(out.sandbox).size).toBe(out.sandbox.length);
      expect(new Set(out.allow).size).toBe(out.allow.length);
    }
  });

  it('sanitizeIframeRights : toujours des jetons valides et uniques', () => {
    const r = rng(4);
    for (let i = 0; i < ROUNDS; i++) {
      const out = sanitizeIframeRights(junk(r) as never);
      for (const t of out.sandbox) expect(IFRAME_SANDBOX_TOKENS).toContain(t);
      for (const t of out.allow) expect(IFRAME_ALLOW_TOKENS).toContain(t);
    }
  });

  it('pollution de prototype : aucune entrée ne modifie Object.prototype', () => {
    const r = rng(5);
    for (let i = 0; i < ROUNDS; i++) {
      const v = junk(r) as never;
      effectiveIframe(v, v);
      sanitizeIframeRights(v);
      validateManifest(v);
      effectiveGrants(v, v);
    }
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('effectiveGrants / allowedContributions : plafond ou demande qui n’est pas un objet → rien (régression : TypeError)', () => {
    for (const bad of [undefined, null, 0, 'x', true, [], Symbol.iterator.toString()]) {
      expect(() => effectiveGrants(bad as never, bad as never)).not.toThrow();
      expect(() => allowedContributions(bad as never, bad as never)).not.toThrow();
      expect(allowedContributions([{ name: 'n', slot: 'topbar-nav-slot' }], bad as never)).toEqual([]);
    }
    expect(Object.keys(effectiveGrants({ events: { publish: ['app.x.*'] } }, null as never)).sort()).toEqual(
      Object.keys(effectiveGrants(undefined, {})).sort()
    );
  });

  it('effectiveGrants : jamais de capacité accordée sans plafond', () => {
    const r = rng(6);
    for (let i = 0; i < 1000; i++) {
      const granted = effectiveGrants(junk(r) as never, {});
      expect(Object.keys(granted).every((k) => ['tenant', 'locale', 'navigation', 'flags', 'config', 'telemetry', 'lifecycle', 'dialogs', 'extensions', 'events', 'notifications'].includes(k))).toBe(true);
    }
  });

  it('négociation de protocole : seul le protocole 2 est accepté', () => {
    const r = rng(7);
    for (let i = 0; i < 500; i++) {
      const n = negotiateProtocol(junk(r) as never);
      expect(n === null || n === 2).toBe(true);
    }
  });
});
