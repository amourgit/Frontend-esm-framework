import { afterEach, describe, expect, it } from 'vitest';
import { RpcEndpoint, effectiveGrants, negotiateCapabilities, parseConnect, parseEnvelope, parseHello, parsePort, parseRpc, pickFields, validateCall, validateManifest } from './index.js';

/** PRNG déterministe (mulberry32) : le test est reproductible. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const NASTY_KEYS = ['__proto__', 'constructor', 'prototype', 'toString', 'hasOwnProperty', 't', 'id', 'cap', 'm', 'a', 'kind', 'nonce', 'egen', 'moduleName', 'message', 'protocol', 'requested', 'granted', 'denied', 'e', 'v', 'sid', 'ev'];
const NASTY_STRINGS = ['', '__proto__', 'constructor', 'session', 'get', 'req', 'res', 'hello', 'connect', 'port', '../../x', 'a'.repeat(300), '\u0000', '<script>', 'app.x.*', '*'];

function gen(r: () => number, depth = 0): unknown {
  const k = Math.floor(r() * 10);
  if (depth > 4 || k < 3) return [0, 1, -1, 1.5, NaN, Infinity, 2 ** 53, true, false, null, undefined][Math.floor(r() * 11)];
  if (k < 5) return NASTY_STRINGS[Math.floor(r() * NASTY_STRINGS.length)];
  if (k < 7) return Array.from({ length: Math.floor(r() * 5) }, () => gen(r, depth + 1));
  const o: Record<string, unknown> = {};
  for (let i = 0; i < Math.floor(r() * 7); i++) Object.defineProperty(o, NASTY_KEYS[Math.floor(r() * NASTY_KEYS.length)], { value: gen(r, depth + 1), enumerable: true, configurable: true, writable: true });
  return o;
}

describe('fuzz déterministe : aucune entrée hostile ne lève ni ne pollue', () => {
  it('gardes, validateurs, manifeste, grants, négociation, pickFields', () => {
    const r = rng(1234);
    for (let i = 0; i < 3000; i++) {
      const v = gen(r);
      const m = (v && typeof v === 'object' && !Array.isArray(v) ? v : {}) as Record<string, unknown>;
      const str = (x: unknown, d: string) => (typeof x === 'string' ? x : d);
      expect(() => {
        parseEnvelope(v);
        parseHello(m);
        parseConnect(m);
        parsePort(m);
        parseRpc(v);
        validateCall(str(m.cap, 'session'), str(m.m, 'get'), Array.isArray(m.a) ? m.a : [v]);
        validateManifest(v);
        effectiveGrants(m as any, m as any);
        negotiateCapabilities(Array.isArray(m.requested) ? (m.requested as any) : [], effectiveGrants(undefined, {}));
        pickFields(v, [str(m.cap, 'c'), 'a.b', '__proto__.x', 'constructor.name']);
      }).not.toThrow();
    }
    expect(({} as any).x).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, 'polluted')).toBe(false);
  });
});

describe('fuzz du moteur RPC sur un vrai MessagePort', () => {
  const open: RpcEndpoint[] = [];
  afterEach(() => void open.splice(0).forEach((e) => e.close('test')));

  it('des milliers de messages hostiles : aucun handler appelé hors contrat, le canal reste sain', async () => {
    const { port1, port2 } = new MessageChannel();
    let calls = 0;
    const host = new RpcEndpoint({ port: port1, handlers: { session: { get: () => (calls++, { ok: true }) } }, validate: validateCall, limits: { pingIntervalMs: 0, requestsPerSecond: 1_000_000 } });
    const app = new RpcEndpoint({ port: port2, limits: { pingIntervalMs: 0, callTimeoutMs: 1000 } });
    open.push(host, app);
    const r = rng(99);
    let sentValid = 0;
    for (let i = 0; i < 3000; i++) {
      const v = gen(r);
      // un message structurellement valide sur `session.get` sans argument est légitime ; on le compte
      if (v && typeof v === 'object' && (v as any).t === 'req' && (v as any).cap === 'session' && (v as any).m === 'get' && Array.isArray((v as any).a) && (v as any).a.length === 0 && Number.isInteger((v as any).id) && (v as any).id >= 0) sentValid++;
      try {
        port2.postMessage(v);
      } catch {
        /* valeur non clonable (ex. undefined/fonction) : ignorée */
      }
    }
    await new Promise((res) => setTimeout(res, 100));
    expect(calls).toBe(sentValid);
    expect(host.closed).toBe(false);
    await expect(app.call('session', 'get')).resolves.toEqual({ ok: true });
  });
});
