import { EGEN_EMBED_PROTOCOL, RpcEndpoint, validateCall, wrapHandshake, type CapabilityGranted, type HandlerTable } from '@egen-civitas/esm-embed-protocol';

/** Shell factice pour les tests : fenêtre de l'app + fenêtre parente, avec transfert de vrai MessagePort. */
export class FakeShell {
  readonly appWindow = new EventTarget();
  readonly hostWindow = { posted: [] as Array<{ message: any; targetOrigin: string }>, postMessage: (message: any, targetOrigin: string) => void this.onAppMessage(message, targetOrigin) };
  rpc?: RpcEndpoint;
  connectMsg?: any;
  constructor(
    readonly moduleName = '@acme/esm-demo-app',
    readonly origin = 'https://shell.exemple.org',
  ) {}

  /** Livre un message à l'app comme le ferait le navigateur. */
  deliver(data: unknown, opts: { origin?: string; source?: unknown; ports?: MessagePort[] } = {}) {
    const ev: any = new Event('message');
    ev.data = data;
    ev.origin = opts.origin ?? this.origin;
    ev.source = 'source' in opts ? opts.source : this.hostWindow;
    ev.ports = opts.ports ?? [];
    this.appWindow.dispatchEvent(ev);
  }

  hello(nonce = 'nonce-0123456789', opts: Parameters<FakeShell['deliver']>[1] = {}) {
    this.deliver(wrapHandshake(this.moduleName, { kind: 'hello', nonce, protocols: [EGEN_EMBED_PROTOCOL] }), opts);
  }

  /** Accepte la connexion : ouvre un vrai canal et envoie `port`. */
  accept(granted: CapabilityGranted[], handlers: HandlerTable, nonce = 'nonce-0123456789', opts: { subscribe?: ConstructorParameters<typeof RpcEndpoint>[0]['onSubscribe'] } = {}) {
    const { port1, port2 } = new MessageChannel();
    this.rpc = new RpcEndpoint({ port: port1, handlers, validate: validateCall, onSubscribe: opts.subscribe, limits: { pingIntervalMs: 0 } });
    this.deliver(wrapHandshake(this.moduleName, { kind: 'port', nonce, protocol: EGEN_EMBED_PROTOCOL, granted, denied: [] }), { ports: [port2 as any] });
  }

  private onAppMessage(message: any, targetOrigin: string) {
    this.hostWindow.posted.push({ message, targetOrigin });
    if (message?.message?.kind === 'connect') this.connectMsg = message.message;
  }
}

export const grant = (id: any, config: Record<string, unknown> = {}): CapabilityGranted => ({ id, version: 1, config });
