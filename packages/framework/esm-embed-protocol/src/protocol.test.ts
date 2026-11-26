import { describe, expect, it } from 'vitest';
import {
  CAPABILITIES,
  REMOVED_CAPABILITIES,
  effectiveGrants,
  estimateSize,
  isInternalPath,
  negotiateCapabilities,
  negotiateProtocol,
  parseConnect,
  parseEnvelope,
  parseHello,
  parsePort,
  parseRpc,
  patternCovers,
  topicAllowed,
  validateCall,
  validateManifest,
} from './index.js';

const NONCE = 'abcdef0123456789';

describe('gardes de poignée de main', () => {
  it('accepte une enveloppe et un hello valides', () => {
    const env = parseEnvelope({ egen: 2, moduleName: '@a/b', message: { kind: 'hello', nonce: NONCE, protocols: [2, 1] } });
    expect(env?.message.kind).toBe('hello');
    expect(parseHello(env!.message)?.protocols).toEqual([2, 1]);
  });
  it('rejette formes invalides', () => {
    expect(parseEnvelope(null)).toBeNull();
    expect(parseEnvelope({ egen: '2', moduleName: 'x', message: { kind: 'hello' } })).toBeNull();
    expect(parseHello({ kind: 'hello', nonce: 'court', protocols: [2] })).toBeNull();
    expect(parseHello({ kind: 'hello', nonce: NONCE, protocols: [] })).toBeNull();
    expect(parseConnect({ kind: 'connect', nonce: NONCE, protocol: 2, requested: [{ id: 'x', version: 0 }] })).toBeNull();
    expect(parsePort({ kind: 'port', nonce: NONCE, protocol: 2, granted: [], denied: [{ id: 'a', reason: 'AUTRE' }] })).toBeNull();
  });
  it('accepte connect et port valides', () => {
    expect(parseConnect({ kind: 'connect', nonce: NONCE, protocol: 2, requested: [{ id: 'locale', version: 1 }] })?.requested).toHaveLength(1);
    expect(parsePort({ kind: 'port', nonce: NONCE, protocol: 2, granted: [{ id: 'locale', version: 1, config: {} }], denied: [] })?.granted).toHaveLength(1);
  });
  it('rejette les objets à prototype exotique', () => {
    class X {
      kind = 'hello';
    }
    expect(parseEnvelope({ egen: 2, moduleName: 'x', message: new X() })).toBeNull();
  });
});

describe('parseRpc', () => {
  it('valide chaque type', () => {
    expect(parseRpc({ t: 'req', id: 1, cap: 'tenant', m: 'get', a: [] })).toBeTruthy();
    expect(parseRpc({ t: 'req', id: -1, cap: 'tenant', m: 'get', a: [] })).toBeNull();
    expect(parseRpc({ t: 'req', id: 1, cap: 'tenant', m: 'get', a: 'x' })).toBeNull();
    expect(parseRpc({ t: 'res', id: 1, ok: false, e: { code: 'DENIED', message: 'x' } })).toBeTruthy();
    expect(parseRpc({ t: 'res', id: 1, ok: false })).toBeNull();
    expect(parseRpc({ t: 'inconnu' })).toBeNull();
    expect(parseRpc('x')).toBeNull();
  });
});

describe('estimateSize', () => {
  it('borne les gros messages, la profondeur et les cycles', () => {
    expect(estimateSize({ a: 'x'.repeat(10) }, 1000)).toBeLessThan(100);
    expect(estimateSize('x'.repeat(5000), 1000)).toBe(1001);
    const cyc: any = {};
    cyc.self = cyc;
    expect(estimateSize(cyc, 1000)).toBe(1001);
  });
});

describe('chemins internes et sujets', () => {
  it('chemins', () => {
    expect(isInternalPath('/a/b?x=1#y')).toBe(true);
    for (const bad of ['//evil.com', 'https://x', 'a/b', '/a b', 'javascript:alert(1)', '/\\evil', '', '/\u0000']) expect(isInternalPath(bad)).toBe(false);
  });
  it('motifs', () => {
    expect(patternCovers('app.x.*', 'app.x.y')).toBe(true);
    expect(patternCovers('app.x.*', 'app.xy.z')).toBe(false);
    expect(patternCovers('app.*', 'app.x.*')).toBe(true);
    expect(patternCovers('*', 'a')).toBe(false);
    expect(topicAllowed(['core.*'], 'core.theme.changed')).toBe(true);
    expect(topicAllowed(undefined, 'core.x')).toBe(false);
  });
});

describe('validation des appels', () => {
  it('catalogue', () => {
    expect(validateCall('tenant', 'get', [])).toBeNull();
    expect(validateCall('tenant', 'get', [1])).toBeTruthy();
    expect(validateCall('nope', 'x', [])).toMatch(/inconnue/);
    expect(validateCall('tenant', 'constructor', [])).toMatch(/inconnue/);
    expect(validateCall('ai-tools', 'invoke', ['t', {}])).toMatch(/sens/);
    expect(validateCall('ai-tools', 'invoke', ['t', {}], 'host-to-app')).toBeNull();
    expect(validateCall('navigation', 'report', ['//evil'])).toBeTruthy();
    expect(validateCall('notifications', 'show', [{ kind: 'info', title: 'ok' }])).toBeNull();
    expect(validateCall('notifications', 'show', [{ kind: 'x', title: 'ok' }])).toBeTruthy();
    expect(validateCall('events', 'publish', ['App.X'])).toBeTruthy();
  });
  it('capacités retirées du SDK : session, permissions, thème, api, auth ne sont plus appelables', () => {
    for (const id of ['session', 'permissions', 'theme', 'api', 'auth']) {
      expect(validateCall(id, 'get', [])).toMatch(/inconnue/);
      expect(Object.keys(CAPABILITIES)).not.toContain(id);
      expect(REMOVED_CAPABILITIES[id]).toBeTruthy();
    }
  });
});

const manifest = {
  manifestVersion: 1,
  name: '@civitas/esm-studio-app',
  version: '1.2.0',
  title: 'Studio',
  url: 'https://studio.exemple.org',
  route: 'studio',
  technology: 'nextjs',
  navigation: { mode: 'history', basePath: '/' },
  capabilities: { locale: {}, events: { publish: ['app.studio.*'], subscribe: ['core.theme.*', 'core.x'] }, notifications: {} },
};

describe('manifeste', () => {
  it('valide le cas nominal', () => {
    expect(validateManifest(manifest).ok).toBe(true);
  });
  it('liste les erreurs', () => {
    const r = validateManifest({ ...manifest, url: 'http://x.org', route: 'A B', technology: 'cobol', capabilities: { zzz: {} } });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.length).toBeGreaterThanOrEqual(4);
  });
  it('http localhost seulement si autorisé', () => {
    expect(validateManifest({ ...manifest, url: 'http://localhost:3000' }).ok).toBe(false);
    expect(validateManifest({ ...manifest, url: 'http://localhost:3000' }, { allowInsecureLocalhost: true }).ok).toBe(true);
    expect(validateManifest({ ...manifest, url: 'https://u:p@x.org' }).ok).toBe(false);
  });
  it('capacité retirée du SDK : message explicite avec la voie à suivre', () => {
    for (const id of ['session', 'theme', 'permissions', 'api', 'auth']) {
      const r = validateManifest({ ...manifest, capabilities: { [id]: {} } });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errors.join()).toMatch(/absente du SDK/);
    }
  });
});

describe('grants effectifs (demandé ∩ approuvé)', () => {
  const caps = manifest.capabilities as any;
  it('refus par défaut des capacités non par défaut', () => {
    const g = effectiveGrants(caps, {});
    expect(g.events).toBeUndefined();
    expect(g.notifications).toBeUndefined();
    expect(g.locale).toBeDefined(); // par défaut
    expect(g.tenant).toBeDefined();
    expect(g.navigation).toBeDefined();
  });
  it('plafond opérateur : intersection des listes', () => {
    const g = effectiveGrants(caps, { events: { publish: ['app.*'], subscribe: ['core.theme.*'] }, notifications: {} });
    expect(g.events).toEqual({ publish: ['app.studio.*'], subscribe: ['core.theme.*'] });
    expect(g.notifications).toEqual({});
  });
  it('une capacité approuvée mais non demandée reste fermée', () => {
    expect(effectiveGrants({ locale: {} } as any, { notifications: {} }).notifications).toBeUndefined();
  });
  it('false interdit même une capacité par défaut', () => {
    expect(effectiveGrants(caps, { locale: false }).locale).toBeUndefined();
  });
  it('sans manifeste, l’opérateur définit seul', () => {
    expect(effectiveGrants(undefined, { flags: { names: ['beta'] } }).flags).toEqual({ names: ['beta'] });
  });
});

describe('négociation', () => {
  it('protocole', () => {
    expect(negotiateProtocol(2)).toBe(2);
    expect(negotiateProtocol(1)).toBe(1);
    expect(negotiateProtocol(3)).toBeNull();
  });
  it('capacités', () => {
    const eff = effectiveGrants(undefined, { notifications: {} });
    const r = negotiateCapabilities(
      [
        { id: 'locale', version: 1 },
        { id: 'notifications', version: 1 },
        { id: 'events', version: 1 },
        { id: 'locale', version: 9 },
        { id: 'zzz', version: 1 },
        { id: 'session', version: 1 },
        { id: 'tenant', version: CAPABILITIES.tenant.version + 1 },
      ],
      eff,
    );
    expect(r.granted.map((g) => g.id)).toEqual(['locale', 'notifications']);
    expect(r.denied).toEqual([
      { id: 'events', reason: 'NOT_APPROVED' },
      { id: 'zzz', reason: 'UNKNOWN' },
      { id: 'session', reason: 'UNKNOWN' },
      { id: 'tenant', reason: 'VERSION' },
    ]);
  });
});

import { allowedContributions, slotAllowed, slotCovers, validateExtensionDecls } from './index.js';

describe('slots d’extension', () => {
  it('motifs : exact ou préfixe avec * final ; * seul refusé', () => {
    expect(slotCovers('topbar-nav-slot', 'topbar-nav-slot')).toBe(true);
    expect(slotCovers('annuaire-*', 'annuaire-detail-slot')).toBe(true);
    expect(slotCovers('annuaire-*', 'sites-detail-slot')).toBe(false);
    expect(slotCovers('annuaire-*', 'annuaire')).toBe(false);
    expect(slotCovers('*', 'anything')).toBe(false);
    expect(slotAllowed(['a-*', 'b'], 'b')).toBe(true);
    expect(slotAllowed(undefined, 'b')).toBe(false);
  });
  it('catalogue : extensions.list valide un nom de slot', () => {
    expect(validateCall('extensions', 'list', ['topbar-nav-slot'])).toBeNull();
    expect(validateCall('extensions', 'list', ['Slot Invalide'])).toBeTruthy();
    expect(validateCall('extensions', 'list', [])).toBeTruthy();
  });
  it('grants : discover et contribute = demandé ∩ approuvé', () => {
    const g = effectiveGrants({ extensions: { discover: ['topbar-nav-slot', 'secret-slot'] } } as any, { extensions: { discover: ['topbar-nav-slot', 'annuaire-*'], contribute: ['topbar-nav-slot'] } });
    expect(g.extensions).toEqual({ discover: ['topbar-nav-slot'], contribute: ['topbar-nav-slot'] });
    expect(effectiveGrants({ extensions: {} } as any, {}).extensions).toBeUndefined();
  });
});

describe('contributions déclarées dans le manifeste', () => {
  const ext = (over: Record<string, unknown> = {}) => ({ name: 'nav-studio', slot: 'topbar-nav-slot', meta: { label: 'Studio' }, ...over });
  it('valides', () => {
    expect(validateExtensionDecls([ext(), ext({ name: 'chip', slot: 'shell-rail-left-slot', view: '/_egen/chip', order: 5, height: 48, privileges: ['Voir Studio'], featureFlag: 'studio' })])).toEqual([]);
  });
  it('erreurs : nom, doublon, slot, vue, ordre, hauteur, privilèges, meta', () => {
    const e = validateExtensionDecls([ext({ name: 'A B' }), ext(), ext(), ext({ slot: 'Slot X' }), ext({ name: 'v', view: '//evil' }), ext({ name: 'o', order: 'x' }), ext({ name: 'h', height: 99999 }), ext({ name: 'p', privileges: [1] }), ext({ name: 'm', meta: 'x' })]);
    expect(e.length).toBeGreaterThanOrEqual(8);
    expect(validateExtensionDecls('x')).toEqual(['extensions : tableau attendu']);
    expect(validateExtensionDecls(Array.from({ length: 21 }, (_, i) => ext({ name: `n${i}` })))[0]).toMatch(/20/);
  });
  it('meta : 4 Ko max, iconUrl https de la même origine que l’app', () => {
    expect(validateExtensionDecls([ext({ meta: { x: 'a'.repeat(5000) } })]).join()).toMatch(/4 Ko/);
    expect(validateExtensionDecls([ext({ meta: { iconUrl: 'https://studio.exemple.org/i.svg' } })], 'https://studio.exemple.org')).toEqual([]);
    expect(validateExtensionDecls([ext({ meta: { iconUrl: 'https://tracker.exemple.net/i.svg' } })], 'https://studio.exemple.org').join()).toMatch(/même origine/);
    expect(validateExtensionDecls([ext({ meta: { iconUrl: 'data:image/svg+xml,<svg/>' } })], 'https://studio.exemple.org').join()).toMatch(/même origine/);
    expect(validateExtensionDecls([ext({ meta: { iconUrl: 'http://studio.exemple.org/i.svg' } })], 'https://studio.exemple.org').join()).toMatch(/même origine/);
  });
  it('manifeste : les contributions sont validées avec l’URL de l’app', () => {
    expect(validateManifest({ ...manifest, extensions: [ext()] }).ok).toBe(true);
    expect(validateManifest({ ...manifest, extensions: [ext({ slot: 'X Y' })] }).ok).toBe(false);
  });
  it('seules les contributions dont le slot est approuvé sont retenues', () => {
    const decls = [ext(), ext({ name: 'rail', slot: 'shell-rail-left-slot' }), ext({ name: 'a', slot: 'annuaire-detail-slot' })] as any;
    expect(allowedContributions(decls, {}).length).toBe(0);
    expect(allowedContributions(decls, { extensions: { contribute: ['topbar-nav-slot', 'annuaire-*'] } }).map((d) => d.name)).toEqual(['nav-studio', 'a']);
    expect(allowedContributions(undefined, { extensions: { contribute: ['x'] } })).toEqual([]);
    expect(allowedContributions(decls, { extensions: false })).toEqual([]);
  });
});

import { NOTIFICATION_DEFAULTS, createSlidingLimiter, notificationPolicy, validateNotificationConfig } from './index.js';

describe('politique des notifications (toasts)', () => {
  it('défauts : le Core affiche seul, 10 toasts par 10 s', () => {
    expect(notificationPolicy(undefined)).toEqual({ exclusive: true, rate: { max: 10, perSeconds: 10 } });
    expect(notificationPolicy({})).toEqual(NOTIFICATION_DEFAULTS);
  });
  it('valeurs de l’opérateur ; toute valeur invalide retombe sur le défaut (jamais plus permissif)', () => {
    expect(notificationPolicy({ exclusive: false, rate: { max: 3, perSeconds: 60 } })).toEqual({ exclusive: false, rate: { max: 3, perSeconds: 60 } });
    expect(notificationPolicy({ exclusive: 'non', rate: { max: 9999, perSeconds: -1 } })).toEqual(NOTIFICATION_DEFAULTS);
    expect(notificationPolicy('x')).toEqual(NOTIFICATION_DEFAULTS);
  });
  it('validation de la config (outils)', () => {
    expect(validateNotificationConfig({})).toEqual([]);
    expect(validateNotificationConfig({ exclusive: true, rate: { max: 5, perSeconds: 10 } })).toEqual([]);
    expect(validateNotificationConfig({ exclusive: 1 }).length).toBe(1);
    expect(validateNotificationConfig({ rate: { max: 0, perSeconds: 5000 } }).length).toBe(2);
    expect(validateNotificationConfig([]).length).toBe(1);
  });
  it('fenêtre glissante', () => {
    let t = 0;
    const ok = createSlidingLimiter(2, 10, () => t);
    expect([ok(), ok(), ok()]).toEqual([true, true, false]);
    t = 9_999;
    expect(ok()).toBe(false);
    t = 10_001;
    expect(ok()).toBe(true);
  });
  it('toast : id optionnel validé, sous-titre ≤ 500', () => {
    expect(validateCall('notifications', 'show', [{ kind: 'info', title: 'a', id: 'theme.saved:42' }])).toBeNull();
    expect(validateCall('notifications', 'show', [{ kind: 'info', title: 'a', id: 'a b' }])).toBeTruthy();
    expect(validateCall('notifications', 'show', [{ kind: 'info', title: 'a', subtitle: 'x'.repeat(501) }])).toBeTruthy();
  });
});
