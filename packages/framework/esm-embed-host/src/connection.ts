import {
  EGEN_EMBED_PROTOCOL,
  RpcEndpoint,
  createNonce,
  negotiateCapabilities,
  negotiateProtocol,
  parseConnect,
  parseEnvelope,
  validateCall,
  wrapHandshake,
  type CapabilityDenied,
  type CapabilityGranted,
  type EffectiveGrants,
  type Limits,
} from '@egen-civitas/esm-embed-protocol';
import type { HostProviders } from './providers.js';
import { availableCapabilities, createCapabilityTable, type HostControls } from './table.js';

export type ConnectionState = 'idle' | 'hello' | 'connected' | 'closed';

export interface ConnectionOptions {
  moduleName: string;
  grants: EffectiveGrants;
  providers: HostProviders;
  controls: HostControls;
  /** Envoi vers l'iframe (l'origine cible explicite est fixée par l'appelant). */
  post(message: unknown, transfer?: Transferable[]): void;
  limits?: Partial<Limits>;
  hostVersion?: string;
  onConnect?(granted: CapabilityGranted[], denied: CapabilityDenied[]): void;
  onClose?(reason: string): void;
}

/**
 * Connexion hôte ↔ une app embarquée, indépendante du DOM : l'appelant filtre déjà la source et l'origine
 * (`event.source === iframe.contentWindow`, `event.origin === origine autorisée`) et lui remet `event.data`.
 */
export class HostConnection {
  state: ConnectionState = 'idle';
  private nonce?: string;
  private rpc?: RpcEndpoint;
  private cleanup?: () => void;

  constructor(private readonly o: ConnectionOptions) {}

  /** Nouvelle poignée de main (à chaque chargement de l'iframe) : ferme toute connexion précédente. */
  hello(): void {
    this.reset();
    this.nonce = createNonce();
    this.state = 'hello';
    this.o.post(wrapHandshake(this.o.moduleName, { kind: 'hello', nonce: this.nonce, protocols: [EGEN_EMBED_PROTOCOL, 1], hostVersion: this.o.hostVersion }));
  }

  /** Traite un message de poignée de main v2 ; `true` si le message est de la famille v2 (consommé). */
  handle(data: unknown): boolean {
    const env = parseEnvelope(data);
    if (!env || env.egen !== EGEN_EMBED_PROTOCOL || env.moduleName !== this.o.moduleName) return false;
    const m = env.message;
    if (m.kind === 'probe') {
      if (this.state === 'idle') this.hello();
      else if (this.state === 'hello' && this.nonce) this.o.post(wrapHandshake(this.o.moduleName, { kind: 'hello', nonce: this.nonce, protocols: [EGEN_EMBED_PROTOCOL, 1], hostVersion: this.o.hostVersion }));
    } else if (m.kind === 'connect' && this.state === 'hello') {
      const c = parseConnect(m);
      if (!c || c.nonce !== this.nonce || negotiateProtocol(c.protocol, [EGEN_EMBED_PROTOCOL]) === null) return true;
      this.open(c.requested);
    }
    return true;
  }

  private open(requested: Parameters<typeof negotiateCapabilities>[0]): void {
    const avail = availableCapabilities(this.o.providers);
    const { granted: g0, denied: d0 } = negotiateCapabilities(requested, this.o.grants);
    const denied: CapabilityDenied[] = [...d0];
    const granted: CapabilityGranted[] = [];
    for (const g of g0) {
      if (avail.has(g.id)) granted.push(g);
      else denied.push({ id: g.id, reason: 'UNAVAILABLE' });
    }
    const { table, subscribe, cleanup } = createCapabilityTable({
      moduleName: this.o.moduleName,
      granted,
      providers: this.o.providers,
      controls: this.o.controls,
      callApp: (cap, method, args) => {
        if (!this.rpc) return Promise.reject(new Error('non connecté'));
        return this.rpc.call(cap, method, args);
      },
    });
    const { port1, port2 } = new MessageChannel();
    this.cleanup = cleanup;
    this.rpc = new RpcEndpoint({
      port: port1,
      handlers: table,
      onSubscribe: subscribe,
      validate: (cap, method, args) => validateCall(cap, method, args, 'app-to-host'),
      limits: this.o.limits,
      onClose: (reason) => {
        this.cleanup?.();
        this.cleanup = undefined;
        if (this.state !== 'closed') this.state = 'idle';
        this.o.onClose?.(reason);
      },
    });
    this.state = 'connected';
    this.o.post(wrapHandshake(this.o.moduleName, { kind: 'port', nonce: this.nonce!, protocol: EGEN_EMBED_PROTOCOL, granted, denied, hostVersion: this.o.hostVersion }), [port2]);
    this.o.onConnect?.(granted, denied);
  }

  /** Appel hôte → app (ex. `lifecycle.canLeave`) ; `undefined` si l'app n'est pas connectée en v2. */
  async callApp<T = unknown>(cap: string, method: string, args: unknown[] = []): Promise<T | undefined> {
    return this.rpc && !this.rpc.closed ? this.rpc.call<T>(cap, method, args) : undefined;
  }

  get connected(): boolean {
    return this.state === 'connected' && !!this.rpc && !this.rpc.closed;
  }

  /** Ferme la connexion courante (rechargement de l'iframe) sans détruire l'objet. */
  reset(): void {
    this.rpc?.close();
    this.rpc = undefined;
    this.cleanup?.();
    this.cleanup = undefined;
    this.nonce = undefined;
    if (this.state !== 'closed') this.state = 'idle';
  }

  destroy(): void {
    this.reset();
    this.state = 'closed';
  }
}
