import type { ConnectMessage, Envelope, HelloMessage, PortMessage, RpcMessage, CapabilityDenied, CapabilityGranted, CapabilityRequest } from './types.js';

export function isPlainObject(v: unknown): v is Record<string, unknown> {
  if (v === null || typeof v !== 'object') return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

/**
 * Estimation bornée de la taille d'une valeur clonable (octets approximatifs).
 * Retourne `limit + 1` dès que la limite, la profondeur (20) ou le nombre de nœuds (100 000) est dépassé :
 * protège contre les messages volumineux, profonds ou cycliques (le clonage structuré accepte les cycles).
 */
export function estimateSize(value: unknown, limit: number): number {
  let size = 0;
  let nodes = 0;
  const stack: Array<[unknown, number]> = [[value, 0]];
  while (stack.length) {
    const [v, depth] = stack.pop()!;
    if (++nodes > 100_000 || depth > 20) return limit + 1;
    switch (typeof v) {
      case 'string':
        size += v.length;
        break;
      case 'number':
      case 'bigint':
        size += 8;
        break;
      case 'boolean':
        size += 4;
        break;
      case 'object':
        if (v === null) break;
        if (ArrayBuffer.isView(v)) size += v.byteLength;
        else if (v instanceof ArrayBuffer) size += v.byteLength;
        else if (Array.isArray(v)) for (const item of v) stack.push([item, depth + 1]);
        else
          for (const k of Object.keys(v)) {
            size += k.length;
            stack.push([(v as Record<string, unknown>)[k], depth + 1]);
          }
        break;
      default:
        size += 8;
    }
    if (size > limit) return limit + 1;
  }
  return size;
}

const NONCE_RE = /^[A-Za-z0-9_-]{8,128}$/;
export function isNonce(v: unknown): v is string {
  return typeof v === 'string' && NONCE_RE.test(v);
}

/** Génère un nonce aléatoire (crypto si disponible). */
export function createNonce(): string {
  const c: Crypto | undefined = (globalThis as any).crypto;
  if (c?.getRandomValues) {
    const b = new Uint8Array(16);
    c.getRandomValues(b);
    return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  }
  throw new Error('[egen-embed] Aucune source aléatoire sécurisée disponible (crypto.getRandomValues).');
}

/** Enveloppe de poignée de main : `{ egen: number, moduleName: string, message: { kind: string } }`. */
export function parseEnvelope(data: unknown): Envelope<{ kind: string } & Record<string, unknown>> | null {
  if (!isPlainObject(data)) return null;
  if (typeof data.egen !== 'number' || typeof data.moduleName !== 'string' || data.moduleName.length > 214) return null;
  const m = data.message;
  if (!isPlainObject(m) || typeof m.kind !== 'string') return null;
  return data as unknown as Envelope<{ kind: string } & Record<string, unknown>>;
}

function protocolList(v: unknown): number[] | null {
  if (!Array.isArray(v) || v.length === 0 || v.length > 10) return null;
  return v.every((n) => Number.isInteger(n) && n > 0 && n < 1000) ? (v as number[]) : null;
}

export function parseHello(m: Record<string, unknown>): HelloMessage | null {
  if (m.kind !== 'hello' || !isNonce(m.nonce)) return null;
  const protocols = protocolList(m.protocols);
  if (!protocols) return null;
  if (m.hostVersion !== undefined && (typeof m.hostVersion !== 'string' || m.hostVersion.length > 50)) return null;
  return { kind: 'hello', nonce: m.nonce, protocols, hostVersion: m.hostVersion as string | undefined };
}

function capRequests(v: unknown): CapabilityRequest[] | null {
  if (!Array.isArray(v) || v.length > 50) return null;
  const out: CapabilityRequest[] = [];
  for (const r of v) {
    if (!isPlainObject(r) || typeof r.id !== 'string' || r.id.length > 64 || !Number.isInteger(r.version) || (r.version as number) < 1) return null;
    out.push({ id: r.id, version: r.version as number });
  }
  return out;
}

export function parseConnect(m: Record<string, unknown>): ConnectMessage | null {
  if (m.kind !== 'connect' || !isNonce(m.nonce) || !Number.isInteger(m.protocol)) return null;
  const requested = capRequests(m.requested);
  if (!requested) return null;
  if (m.sdk !== undefined && (typeof m.sdk !== 'string' || m.sdk.length > 50)) return null;
  return { kind: 'connect', nonce: m.nonce, protocol: m.protocol as number, sdk: m.sdk as string | undefined, requested };
}

export function parsePort(m: Record<string, unknown>): PortMessage | null {
  if (m.kind !== 'port' || !isNonce(m.nonce) || !Number.isInteger(m.protocol)) return null;
  if (!Array.isArray(m.granted) || !Array.isArray(m.denied) || m.granted.length > 50 || m.denied.length > 50) return null;
  const granted: CapabilityGranted[] = [];
  for (const g of m.granted) {
    if (!isPlainObject(g) || typeof g.id !== 'string' || !Number.isInteger(g.version) || !isPlainObject(g.config)) return null;
    granted.push({ id: g.id as CapabilityGranted['id'], version: g.version as number, config: g.config });
  }
  const denied: CapabilityDenied[] = [];
  for (const d of m.denied) {
    if (!isPlainObject(d) || typeof d.id !== 'string' || !['UNKNOWN', 'VERSION', 'NOT_APPROVED'].includes(d.reason as string)) return null;
    denied.push({ id: d.id, reason: d.reason as CapabilityDenied['reason'] });
  }
  return { kind: 'port', nonce: m.nonce, protocol: m.protocol as number, granted, denied, hostVersion: typeof m.hostVersion === 'string' ? m.hostVersion : undefined };
}

const uint = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= Number.MAX_SAFE_INTEGER;
const short = (s: unknown, max: number): s is string => typeof s === 'string' && s.length > 0 && s.length <= max;

/** Valide un message RPC reçu sur le port ; `null` = à ignorer. */
export function parseRpc(data: unknown): RpcMessage | null {
  if (!isPlainObject(data) || typeof data.t !== 'string') return null;
  switch (data.t) {
    case 'req':
      return uint(data.id) && short(data.cap, 64) && short(data.m, 64) && Array.isArray(data.a) && data.a.length <= 16
        ? { t: 'req', id: data.id, cap: data.cap, m: data.m, a: data.a }
        : null;
    case 'res':
      if (!uint(data.id) || typeof data.ok !== 'boolean') return null;
      if (data.ok) return { t: 'res', id: data.id, ok: true, v: data.v };
      return isPlainObject(data.e) && typeof data.e.code === 'string' && typeof data.e.message === 'string'
        ? { t: 'res', id: data.id, ok: false, e: { code: data.e.code as any, message: data.e.message } }
        : null;
    case 'sub':
      return uint(data.id) && short(data.cap, 64) && short(data.ev, 128) ? { t: 'sub', id: data.id, cap: data.cap, ev: data.ev } : null;
    case 'unsub':
      return uint(data.sid) ? { t: 'unsub', sid: data.sid } : null;
    case 'evt':
      return uint(data.sid) ? { t: 'evt', sid: data.sid, v: data.v } : null;
    case 'ping':
    case 'pong':
    case 'bye':
      return { t: data.t } as RpcMessage;
    default:
      return null;
  }
}
