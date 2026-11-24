import { describe, expect, it } from 'vitest';
import {
  CAPABILITIES,
  DEFAULT_SESSION_FIELDS,
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
    expect(parseConnect({ kind: 'connect', nonce: NONCE, protocol: 2, requested: [{ id: 'theme', version: 1 }] })?.requested).toHaveLength(1);
    expect(parsePort({ kind: 'port', nonce: NONCE, protocol: 2, granted: [{ id: 'theme', version: 1, config: {} }], denied: [] })?.granted).toHaveLength(1);
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
    expect(parseRpc({ t: 'req', id: 1, cap: 'session', m: 'get', a: [] })).toBeTruthy();
    expect(parseRpc({ t: 'req', id: -1, cap: 'session', m: 'get', a: [] })).toBeNull();
    expect(parseRpc({ t: 'req', id: 1, cap: 'session', m: 'get', a: 'x' })).toBeNull();
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
    expect(validateCall('session', 'get', [])).toBeNull();
    expect(validateCall('session', 'get', [1])).toBeTruthy();
    expect(validateCall('nope', 'x', [])).toMatch(/inconnue/);
    expect(validateCall('session', 'constructor', [])).toMatch(/inconnue/);
    expect(validateCall('ai-tools', 'invoke', ['t', {}])).toMatch(/sens/);
    expect(validateCall('ai-tools', 'invoke', ['t', {}], 'host-to-app')).toBeNull();
    expect(validateCall('navigation', 'report', ['//evil'])).toBeTruthy();
    expect(validateCall('api', 'fetch', [{ path: '/x', url: 'https://a' }])).toBeTruthy();
    expect(validateCall('api', 'fetch', [{ url: 'http://a' }])).toBeTruthy();
    expect(validateCall('api', 'fetch', [{ path: '/x', method: 'POST', headers: { accept: 'a' } }])).toBeNull();
    expect(validateCall('notifications', 'show', [{ kind: 'info', title: 'ok' }])).toBeNull();
    expect(validateCall('notifications', 'show', [{ kind: 'x', title: 'ok' }])).toBeTruthy();
    expect(validateCall('events', 'publish', ['App.X'])).toBeTruthy();
  });
});

const manifest = {
  manifestVersion: 1,
  name: '@civitas/esm-tweakcn-app',
  version: '1.2.0',
  title: 'Theme Studio',
  url: 'https://studio.exemple.org',
  route: 'theme-studio',
  technology: 'nextjs',
  navigation: { mode: 'history', basePath: '/' },
  capabilities: { theme: {}, events: { publish: ['app.theme-studio.*'], subscribe: ['core.theme.*', 'core.x'] }, notifications: {} },
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
});

describe('grants effectifs (demandé ∩ approuvé)', () => {
  const caps = manifest.capabilities as any;
  it('refus par défaut des capacités non par défaut', () => {
    const g = effectiveGrants(caps, {});
    expect(g.events).toBeUndefined();
    expect(g.notifications).toBeUndefined();
    expect(g.api).toBeUndefined();
    expect(g.theme).toBeDefined(); // par défaut
    expect(g.session).toEqual({ fields: [...DEFAULT_SESSION_FIELDS] });
  });
  it('plafond opérateur : intersection des listes', () => {
    const g = effectiveGrants(caps, { events: { publish: ['app.*'], subscribe: ['core.theme.*'] }, notifications: {} });
    expect(g.events).toEqual({ publish: ['app.theme-studio.*'], subscribe: ['core.theme.*'] });
    expect(g.notifications).toEqual({});
  });
  it('une capacité approuvée mais non demandée reste fermée', () => {
    expect(effectiveGrants({ theme: {} } as any, { notifications: {} }).notifications).toBeUndefined();
  });
  it('false interdit même une capacité par défaut', () => {
    expect(effectiveGrants(caps, { theme: false }).theme).toBeUndefined();
  });
  it('sessionId et jetons ne passent jamais', () => {
    const g = effectiveGrants({ session: { fields: ['sessionId', 'token', 'user.display'] } }, { session: { fields: ['sessionId', 'token', 'user.display'] } });
    expect(g.session).toEqual({ fields: ['user.display'] });
  });
  it('sans manifeste, l’opérateur définit seul', () => {
    expect(effectiveGrants(undefined, { api: { hosts: ['https://api.x.org'] } }).api).toEqual({ hosts: ['https://api.x.org'], headers: ['accept', 'content-type'], paths: [] });
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
        { id: 'theme', version: 1 },
        { id: 'notifications', version: 1 },
        { id: 'api', version: 1 },
        { id: 'theme', version: 9 },
        { id: 'zzz', version: 1 },
        { id: 'session', version: CAPABILITIES.session.version + 1 },
      ],
      eff,
    );
    expect(r.granted.map((g) => g.id)).toEqual(['theme', 'notifications']);
    expect(r.denied).toEqual([
      { id: 'api', reason: 'NOT_APPROVED' },
      { id: 'zzz', reason: 'UNKNOWN' },
      { id: 'session', reason: 'VERSION' },
    ]);
  });
});

import { pickFields } from './index.js';
describe('pickFields', () => {
  const src = { authenticated: true, sessionId: 'S', user: { uuid: 'u', display: 'Sam', secret: 'x' }, tokens: { a: 1 } };
  it('ne copie que les chemins listés', () => {
    expect(pickFields(src, ['authenticated', 'user.uuid', 'user.display', 'absent.x'])).toEqual({ authenticated: true, user: { uuid: 'u', display: 'Sam' } });
  });
  it('ignore les clés dangereuses et les propriétés héritées', () => {
    const r = pickFields(JSON.parse('{"__proto__":{"x":1},"user":{"a":1}}'), ['__proto__.x', 'constructor.name', 'user.toString']);
    expect(r).toEqual({});
    expect(({} as any).x).toBeUndefined();
  });
  it('ignore les valeurs non clonables', () => {
    expect(pickFields({ f: () => 1, ok: 1 }, ['f', 'ok'])).toEqual({ ok: 1 });
  });
});

import { normalizeApiPath, pathAllowed } from './index.js';
describe('chemins d’API (deny-by-default)', () => {
  it('exact, préfixe, requête ignorée', () => {
    expect(pathAllowed(['/v1/themes', '/v1/users/*'], '/v1/themes?x=1')).toBe(true);
    expect(pathAllowed(['/v1/users/*'], '/v1/users/42/roles')).toBe(true);
    expect(pathAllowed(['/v1/users/*'], '/v1/users')).toBe(false);
    expect(pathAllowed(['/v1/themes'], '/v1/themes/1')).toBe(false);
    expect(pathAllowed([], '/v1/themes')).toBe(false);
    expect(pathAllowed(undefined, '/v1/themes')).toBe(false);
  });
  it('contournements de filtrage refusés', () => {
    for (const bad of ['/v1/users/../admin', '/v1/users/%2e%2e/admin', '/v1/users/%2E%2E/admin', '/v1/users/..%2fadmin', '/v1//admin', '/v1\\admin', '/v1/users/./x', 'v1/users', '/v1/users/\u0000']) {
      expect(normalizeApiPath(bad)).toBeNull();
      expect(pathAllowed(['/v1/*'], bad)).toBe(false);
    }
  });
  it('grants : intersection des chemins demandés et plafonnés', () => {
    const g = effectiveGrants({ api: { paths: ['/v1/themes/*', '/v1/admin/*'] } } as any, { api: { paths: ['/v1/themes/*', '/v1/users'] } });
    expect(g.api).toMatchObject({ paths: ['/v1/themes/*'] });
  });
});
