import {
  CAPABILITIES,
  CAPABILITY_IDS,
  DEFAULT_LIMITS,
  EGEN_EMBED_PROTOCOL,
  RpcEndpoint,
  parseEnvelope,
  parseHello,
  parsePort,
  wrapHandshake,
  type CapabilityDenied,
  type CapabilityGranted,
  type CapabilityId,
  type CapabilityRequest,
  type HandlerTable,
  type Limits,
} from '@egen-civitas/esm-embed-protocol';
import { EgenClient } from './client.js';

export const SDK_VERSION = '0.0.0';

/** Ce dont le client a besoin d'une fenêtre : écouter les messages. */
export interface WindowLike {
  addEventListener(type: 'message', listener: (event: any) => void): void;
  removeEventListener(type: 'message', listener: (event: any) => void): void;
}

/** Fenêtre de l'hôte (`window.parent`). */
export interface HostWindowLike {
  postMessage(message: unknown, targetOrigin: string, transfer?: Transferable[]): void;
}

export interface ConnectOptions {
  /** Nom du module tel que déclaré dans le manifeste (`name`). */
  moduleName: string;
  /** Origines autorisées du Shell (ex. `['https://egen.exemple.org']`). Jamais `*`. */
  hostOrigins: string[];
  /** Capacités demandées. Défaut : les capacités « par défaut » du catalogue. Les refus sont visibles dans `client.denied`. */
  capabilities?: Array<CapabilityId | CapabilityRequest>;
  /** Délai avant repli en mode autonome (ms). Défaut : 5000. */
  timeoutMs?: number;
  limits?: Partial<Limits>;
  /** Injectables pour les tests. */
  window?: WindowLike;
  host?: HostWindowLike;
}

function normalizeRequests(caps: ConnectOptions['capabilities']): CapabilityRequest[] {
  const list = caps ?? CAPABILITY_IDS.filter((id) => CAPABILITIES[id].defaultGrant);
  return list.map((c) => (typeof c === 'string' ? { id: c, version: CAPABILITIES[c]?.version ?? 1 } : c));
}

function checkOrigins(origins: string[]): string[] {
  if (!Array.isArray(origins) || origins.length === 0) throw new Error('[egen-embed] hostOrigins est obligatoire (origines explicites du Shell).');
  for (const o of origins) {
    let u: URL | undefined;
    try {
      u = new URL(o);
    } catch {
      /* invalide */
    }
    if (o === '*' || !u || u.origin !== o || o === 'null') throw new Error(`[egen-embed] origine invalide : ${o} (attendu : https://hôte[:port], sans chemin, jamais *).`);
  }
  return origins;
}

/**
 * Connecte l'application embarquée au Shell EGEN (protocole v2).
 *
 * - Sans hôte v2 (page ouverte hors du Core, hôte plus ancien, délai dépassé) : retourne un client **autonome**
 *   (`client.connected === false`) ; aucun appel ne lève de façon synchrone, les appels sont rejetés (`DENIED`).
 * - Le client ne parle qu'à `window.parent`, depuis une origine de `hostOrigins`, avec le nonce du `hello`.
 */
export function connectToEgen(options: ConnectOptions): Promise<EgenClient> {
  const origins = checkOrigins(options.hostOrigins);
  const win: WindowLike | undefined = options.window ?? (typeof window !== 'undefined' ? (window as unknown as WindowLike) : undefined);
  const host: HostWindowLike | undefined = options.host ?? (typeof window !== 'undefined' && window.parent !== window ? (window.parent as HostWindowLike) : undefined);
  const requested = normalizeRequests(options.capabilities);
  const limits = { ...DEFAULT_LIMITS, ...options.limits };
  const timeoutMs = options.timeoutMs ?? limits.handshakeTimeoutMs;

  const hostWin = host;
  if (!win || !hostWin) return Promise.resolve(new EgenClient({ connected: false, moduleName: options.moduleName, granted: [], denied: [], rpc: undefined }));

  const hw: HostWindowLike = hostWin;
  const w: WindowLike = win;
  return new Promise<EgenClient>((resolve) => {
    let nonce: string | undefined;
    let hostOrigin: string | undefined;
    let done = false;
    const ref: { client?: EgenClient } = {};
    // Table de rappels hôte → app, fermée et prête AVANT l'ouverture du port.
    const handlers: HandlerTable = {
      'ai-tools': { invoke: (name: string, args: Record<string, unknown>) => ref.client!._invokeTool(name, args) },
      lifecycle: { canLeave: () => ref.client!._canLeave() },
    };
    const client = (rpc: RpcEndpoint | undefined, granted: CapabilityGranted[], denied: CapabilityDenied[], protocol?: number) =>
      (ref.client = new EgenClient({ connected: !!rpc, moduleName: options.moduleName, granted, denied, rpc, protocol }));

    const finish = (c: EgenClient) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      w.removeEventListener('message', onMessage);
      resolve(c);
    };

    const timer = setTimeout(() => finish(client(undefined, [], [])), timeoutMs);
    (timer as any).unref?.();

    function onMessage(event: any) {
      if (done || event.source !== hw || !origins.includes(event.origin)) return;
      const env = parseEnvelope(event.data);
      if (!env || env.egen !== EGEN_EMBED_PROTOCOL || env.moduleName !== options.moduleName) return;
      const m = env.message;
      if (m.kind === 'hello' && !nonce) {
        const hello = parseHello(m);
        if (!hello || !hello.protocols.includes(EGEN_EMBED_PROTOCOL)) return;
        nonce = hello.nonce;
        hostOrigin = event.origin;
        hw.postMessage(wrapHandshake(options.moduleName, { kind: 'connect', nonce, protocol: EGEN_EMBED_PROTOCOL, sdk: SDK_VERSION, requested }), event.origin);
      } else if (m.kind === 'port' && nonce && event.origin === hostOrigin) {
        const port = parsePort(m);
        const p = event.ports?.[0] as MessagePort | undefined;
        if (!port || port.nonce !== nonce || port.protocol !== EGEN_EMBED_PROTOCOL || !p) return;
        const rpc = new RpcEndpoint({ port: p, handlers, limits: options.limits });
        finish(client(rpc, port.granted, port.denied, port.protocol));
      }
    }

    w.addEventListener('message', onMessage);
    // Sonde : l'hôte renverra `hello` (l'app peut charger après l'événement `load` de l'iframe).
    for (const o of origins) {
      try {
        hw.postMessage(wrapHandshake(options.moduleName, { kind: 'probe' }), o);
      } catch {
        /* origine non joignable */
      }
    }
  });
}

