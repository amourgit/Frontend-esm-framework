import { describe, expect, it } from 'vitest';
import {
  IFRAME_ALLOW_TOKENS,
  IFRAME_SANDBOX_TOKENS,
  MAX_CONFIG_BYTES,
  SUPPORTED_PROTOCOLS,
  effectiveGrants,
  effectiveIframe,
  sanitizeIframeRights,
  validateConfig,
  validateIframeRights,
  validateManifest,
} from './index.js';

const REQUESTED = { sandbox: ['allow-downloads', 'allow-modals', 'allow-popups-to-escape-sandbox'], allow: ['clipboard-read', 'clipboard-write', 'fullscreen'] };

const manifest = (over: Record<string, unknown> = {}) => ({
  manifestVersion: 1,
  name: '@acme/esm-studio-app',
  version: '1.0.0',
  title: 'Studio',
  url: 'https://studio.exemple.org',
  route: 'studio',
  technology: 'nextjs',
  navigation: { mode: 'history' },
  capabilities: {},
  ...over,
});

describe('listes blanches des droits d’iframe', () => {
  it('ne contiennent jamais de navigation du parent ni de doublon', () => {
    expect(IFRAME_SANDBOX_TOKENS.some((t) => t.includes('top-navigation'))).toBe(false);
    expect(new Set(IFRAME_SANDBOX_TOKENS).size).toBe(IFRAME_SANDBOX_TOKENS.length);
    expect(new Set(IFRAME_ALLOW_TOKENS).size).toBe(IFRAME_ALLOW_TOKENS.length);
    expect(Object.isFrozen(IFRAME_SANDBOX_TOKENS)).toBe(true);
  });

  it('couvrent les besoins réels : Penpot, tweakcn et Character Factory', () => {
    for (const t of REQUESTED.sandbox) expect(IFRAME_SANDBOX_TOKENS).toContain(t);
    for (const t of REQUESTED.allow) expect(IFRAME_ALLOW_TOKENS).toContain(t);
  });
});

describe('validateIframeRights', () => {
  it('accepte l’absence et une demande valide', () => {
    expect(validateIframeRights(undefined)).toEqual([]);
    expect(validateIframeRights({})).toEqual([]);
    expect(validateIframeRights(REQUESTED)).toEqual([]);
  });

  it('rejette explicitement tout jeton hors liste blanche, en nommant le jeton', () => {
    expect(validateIframeRights({ sandbox: ['allow-top-navigation'] }).join()).toMatch(/allow-top-navigation.*hors liste blanche/);
    expect(validateIframeRights({ allow: ['usb'] }, 'grants.iframe').join()).toMatch(/grants\.iframe\.allow.*usb/);
    expect(validateIframeRights({ sandbox: [42] })).toHaveLength(1);
  });

  it('rejette les formes invalides, les doublons, les clés inconnues et les listes trop longues', () => {
    expect(validateIframeRights('oui')).toHaveLength(1);
    expect(validateIframeRights([])).toHaveLength(1);
    expect(validateIframeRights({ sandbox: 'allow-downloads' })).toHaveLength(1);
    expect(validateIframeRights({ sandbox: ['allow-downloads', 'allow-downloads'] }).join()).toMatch(/en double/);
    expect(validateIframeRights({ autre: [] }).join()).toMatch(/clé inconnue/);
    expect(validateIframeRights({ allow: Array(21).fill('fullscreen') })).toHaveLength(1);
  });
});

describe('effectiveIframe : demande ∩ plafond', () => {
  it('accorde l’intersection', () => {
    expect(effectiveIframe(REQUESTED, { sandbox: ['allow-downloads', 'allow-modals'], allow: ['fullscreen'] })).toEqual({ sandbox: ['allow-downloads', 'allow-modals'], allow: ['fullscreen'] });
  });

  it('n’accorde rien sans demande, sans plafond ou avec un plafond `false`', () => {
    const none = { sandbox: [], allow: [] };
    expect(effectiveIframe(undefined, REQUESTED)).toEqual(none);
    expect(effectiveIframe(REQUESTED, undefined)).toEqual(none);
    expect(effectiveIframe(REQUESTED, false)).toEqual(none);
    expect(effectiveIframe({}, REQUESTED)).toEqual(none);
  });

  it('une app ne peut jamais s’auto-accorder un droit : le plafond seul fait foi', () => {
    expect(effectiveIframe({ sandbox: ['allow-modals'] }, { sandbox: ['allow-downloads'] }).sandbox).toEqual([]);
    expect(effectiveIframe({ allow: ['camera'] }, { allow: ['fullscreen'] }).allow).toEqual([]);
  });

  it('écarte les jetons hors liste blanche, même s’ils figurent des deux côtés', () => {
    const r = effectiveIframe({ sandbox: ['allow-top-navigation', 'allow-downloads'], allow: ['usb'] }, { sandbox: ['allow-top-navigation', 'allow-downloads'], allow: ['usb'] });
    expect(r).toEqual({ sandbox: ['allow-downloads'], allow: [] });
  });

  it('résiste aux entrées mal formées (aucune exception)', () => {
    expect(effectiveIframe({ sandbox: 'x' as unknown as string[] }, { sandbox: null as unknown as string[] })).toEqual({ sandbox: [], allow: [] });
  });

  it('effectiveGrants ignore le bloc iframe du plafond (aucune capacité « iframe »)', () => {
    const grants = effectiveGrants(undefined, { iframe: REQUESTED, notifications: {} } as never);
    expect(Object.keys(grants)).not.toContain('iframe');
    expect(grants.notifications).toBeDefined();
  });
});

describe('sanitizeIframeRights : garde de l’hôte', () => {
  it('ne garde que des jetons valides et uniques', () => {
    expect(sanitizeIframeRights({ sandbox: ['allow-downloads', 'allow-downloads', 'bidon'], allow: ['fullscreen', 'usb'] })).toEqual({ sandbox: ['allow-downloads'], allow: ['fullscreen'] });
    expect(sanitizeIframeRights(undefined)).toEqual({ sandbox: [], allow: [] });
  });
});

describe('déclaration egen-config.json : iframe et config', () => {
  it('valide le bloc iframe et la config publique', () => {
    expect(validateManifest(manifest({ iframe: REQUESTED, config: { api: 'https://api.exemple.org' } })).ok).toBe(true);
  });

  it('rejette un jeton d’iframe hors liste blanche et une config invalide', () => {
    const bad = validateManifest(manifest({ iframe: { sandbox: ['allow-top-navigation'] } }));
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.errors.join()).toMatch(/iframe\.sandbox/);
    expect(validateManifest(manifest({ config: [] })).ok).toBe(false);
    expect(validateManifest(manifest({ config: { gros: 'x'.repeat(MAX_CONFIG_BYTES) } })).ok).toBe(false);
  });

  it('validateConfig : objet ≤ 8 Ko', () => {
    expect(validateConfig({ a: 1 })).toEqual([]);
    expect(validateConfig('x')).toHaveLength(1);
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(validateConfig(cyclic)).toHaveLength(1);
  });
});

describe('protocole : voie unique', () => {
  it('seul le protocole 2 est supporté', () => {
    expect(SUPPORTED_PROTOCOLS).toEqual([2]);
  });
});
