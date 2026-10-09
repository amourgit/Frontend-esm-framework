// =============================================================================
//  @egen-civitas/esm-ai-channel — Canal applicatif
//
//  Poignée de main (hello/welcome), envoi typé, abonnements par type de message,
//  requêtes corrélées, flux (réponses multi-messages), file d'envoi fiable
//  pendant les coupures, et système de MODULES (provisionnement des tools,
//  appels de tools, contexte, conversation) branchés sur le cycle de vie.
// =============================================================================

import {
  PROTOCOL_SUBPROTOCOL,
  PROTOCOL_VERSION,
  createEnvelope,
  newMessageId,
  parseEnvelope,
  type ClientMessageType,
  type ClientPayloadMap,
  type Envelope,
  type ServerMessageType,
  type ServerPayloadMap,
} from './protocol.js';
import {
  ChannelTransport,
  defaultWebSocketFactory,
  type TransportCloseInfo,
  type WebSocketFactory,
} from './transport.js';
import { createChannelStore, type ChannelState, type ChannelStatus } from './state.js';

// ─── Erreurs ─────────────────────────────────────────────────────────────────

export class ChannelNotReadyError extends Error {
  constructor(message = "L'assistant est hors ligne (canal temps réel non connecté).") {
    super(message);
    this.name = 'ChannelNotReadyError';
  }
}

export class ChannelClosedError extends Error {
  constructor(message = 'Le canal a été interrompu avant la fin de la réponse.') {
    super(message);
    this.name = 'ChannelClosedError';
  }
}

export class ChannelTimeoutError extends Error {
  constructor(type: string, ms: number) {
    super(`Aucune réponse du backend IA à « ${type} » après ${ms} ms.`);
    this.name = 'ChannelTimeoutError';
  }
}

export class ChannelRemoteError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ChannelRemoteError';
  }
}

// ─── Options ─────────────────────────────────────────────────────────────────

export interface AIChannelOptions {
  /** URL (ou fournisseur d'URL) du canal — déjà résolue en ws(s):// */
  url: string | (() => string | Promise<string>);
  heartbeatMs: number;
  reconnectMinMs: number;
  reconnectMaxMs: number;
  requestTimeoutMs: number;
  clientId?: string;
  locale?: string;
  capabilities?: string[];
  webSocketFactory?: WebSocketFactory;
  random?: () => number;
  /** Délai max pour recevoir `session.welcome` après l'ouverture (ms) */
  welcomeTimeoutMs?: number;
  /** Nombre max de messages fiables conservés pendant une coupure */
  outboxLimit?: number;
  /** Durée de vie d'un message fiable en file (ms) */
  outboxTtlMs?: number;
}

export interface SendOptions {
  /** Mis en file si le canal n'est pas prêt (sinon ChannelNotReadyError) */
  reliable?: boolean;
  replyTo?: string;
  id?: string;
}

export interface RequestOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface StreamOptions<TMsg = Envelope> {
  /** Types de messages qui terminent le flux avec succès */
  terminal: string[];
  /** Types de messages qui terminent le flux en erreur */
  errorTypes?: string[];
  onMessage: (env: TMsg) => void;
  /** Timeout d'INACTIVITÉ (ms) — remis à zéro à chaque message reçu */
  idleTimeoutMs?: number;
  signal?: AbortSignal;
}

/** Module branché sur le canal (provisionnement, dispatch, contexte, conversation…). */
export interface ChannelModule {
  readonly name: string;
  /** Appelé au démarrage ; retourne la fonction de détachement. */
  attach(channel: AIChannel): () => void;
}

type Handler<K extends ServerMessageType> = (payload: ServerPayloadMap[K], env: Envelope<K, ServerPayloadMap[K]>) => void;

interface PendingRequest {
  resolve: (env: Envelope) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
  cleanup: () => void;
}

interface ActiveStream {
  opts: StreamOptions;
  resolve: () => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout> | null;
  /** Remet à zéro le timeout d'inactivité */
  rearm: () => void;
  cleanup: () => void;
}

// ─── Canal ───────────────────────────────────────────────────────────────────

export class AIChannel {
  readonly state = createChannelStore();

  private readonly transport: ChannelTransport;
  private readonly handlers = new Map<string, Set<(payload: any, env: Envelope) => void>>();
  private readonly anyHandlers = new Set<(env: Envelope) => void>();
  private readonly readyListeners = new Set<() => void>();
  private readonly closeListeners = new Set<() => void>();
  private readonly pending = new Map<string, PendingRequest>();
  private readonly streams = new Map<string, ActiveStream>();
  private readonly modules = new Map<string, () => void>();
  private outbox: Array<{ data: string; expiresAt: number }> = [];
  private welcomeTimer: ReturnType<typeof setTimeout> | null = null;
  private started = false;
  readonly clientId: string;

  constructor(private readonly opts: AIChannelOptions) {
    this.clientId = opts.clientId ?? newMessageId('client');
    const urlProvider = typeof opts.url === 'function' ? opts.url : () => opts.url as string;
    this.transport = new ChannelTransport({
      resolveUrl: urlProvider,
      protocols: [PROTOCOL_SUBPROTOCOL],
      factory: opts.webSocketFactory ?? defaultWebSocketFactory,
      reconnectMinMs: opts.reconnectMinMs,
      reconnectMaxMs: opts.reconnectMaxMs,
      heartbeatMs: opts.heartbeatMs,
      random: opts.random,
      buildPing: () => JSON.stringify(createEnvelope('ping', { t: Date.now() })),
      onConnecting: (attempt) => this.setState({ status: attempt === 0 ? 'connecting' : 'reconnecting', attempt }),
      onOpen: () => this.handleOpen(),
      onMessage: (raw) => this.handleRaw(raw),
      onClose: (info) => this.handleClose(info),
      onError: (err) => this.setState({ lastError: err instanceof Error ? err.message : 'Erreur du canal' }),
    });
  }

  // ─── Cycle de vie ──────────────────────────────────────────────────────────

  start(): void {
    if (this.started) return;
    this.started = true;
    this.transport.start();
  }

  stop(): void {
    if (!this.started) return;
    this.started = false;
    for (const detach of this.modules.values()) detach();
    this.modules.clear();
    this.transport.stop();
    this.clearWelcomeTimer();
    this.rejectAll(new ChannelClosedError('Le canal a été arrêté.'));
    this.outbox = [];
    this.setState({ status: 'closed', sessionId: null });
  }

  get isReady(): boolean {
    return this.state.getState().status === 'ready';
  }

  /** Branche un module ; il est détaché automatiquement à l'arrêt du canal. */
  use(module: ChannelModule): () => void {
    if (this.modules.has(module.name)) {
      throw new Error(`[EGEN AI Channel] Module « ${module.name} » déjà branché.`);
    }
    const detach = module.attach(this);
    this.modules.set(module.name, detach);
    return () => {
      const d = this.modules.get(module.name);
      if (!d) return;
      this.modules.delete(module.name);
      d();
    };
  }

  /** Appelé à CHAQUE (re)connexion une fois la session établie. Appelé tout de suite si déjà prêt. */
  onReady(listener: () => void): () => void {
    this.readyListeners.add(listener);
    if (this.isReady) safeCall(listener);
    return () => this.readyListeners.delete(listener);
  }

  /** Appelé à chaque perte de la session. */
  onDisconnect(listener: () => void): () => void {
    this.closeListeners.add(listener);
    return () => this.closeListeners.delete(listener);
  }

  // ─── Envoi ─────────────────────────────────────────────────────────────────

  send<K extends ClientMessageType>(type: K, payload: ClientPayloadMap[K], options: SendOptions = {}): string {
    const env = createEnvelope(type, payload, { id: options.id, replyTo: options.replyTo });
    const data = JSON.stringify(env);
    if (this.isReady && this.transport.send(data)) return env.id;
    if (!options.reliable) throw new ChannelNotReadyError();
    this.enqueue(data);
    return env.id;
  }

  /** Requête corrélée : résout avec la première réponse dont `replyTo` = id de la requête. */
  request<K extends ClientMessageType, R = unknown>(
    type: K,
    payload: ClientPayloadMap[K],
    options: RequestOptions = {},
  ): Promise<Envelope<string, R>> {
    return new Promise((resolve, reject) => {
      const timeoutMs = options.timeoutMs ?? this.opts.requestTimeoutMs;
      let id: string;
      try {
        id = this.send(type, payload);
      } catch (err) {
        reject(err);
        return;
      }
      const onAbort = () => finish(new DOMException('Requête annulée', 'AbortError'));
      const finish = (err?: Error, env?: Envelope) => {
        const p = this.pending.get(id);
        if (!p) return;
        clearTimeout(p.timer);
        p.cleanup();
        this.pending.delete(id);
        if (err) reject(err);
        else resolve(env as Envelope<string, R>);
      };
      options.signal?.addEventListener('abort', onAbort, { once: true });
      this.pending.set(id, {
        resolve: (env) => finish(undefined, env),
        reject: (err) => finish(err),
        timer: setTimeout(() => finish(new ChannelTimeoutError(type, timeoutMs)), timeoutMs),
        cleanup: () => options.signal?.removeEventListener('abort', onAbort),
      });
    });
  }

  /**
   * Ouvre un flux : envoie `type` puis relaie chaque message dont `replyTo` = id
   * jusqu'à un message terminal. Retourne l'id du flux (pour l'annuler) ET une promesse de fin.
   */
  openStream<K extends ClientMessageType>(
    type: K,
    payload: ClientPayloadMap[K],
    opts: StreamOptions,
  ): { id: string; done: Promise<void> } {
    let id = '';
    const done = new Promise<void>((resolve, reject) => {
      try {
        id = this.send(type, payload);
      } catch (err) {
        reject(err);
        return;
      }
      const idleMs = opts.idleTimeoutMs ?? this.opts.requestTimeoutMs;
      const finish = (err?: Error) => {
        const s = this.streams.get(id);
        if (!s) return;
        if (s.timer) clearTimeout(s.timer);
        s.cleanup();
        this.streams.delete(id);
        if (err) reject(err);
        else resolve();
      };
      const armTimer = (): ReturnType<typeof setTimeout> =>
        setTimeout(() => finish(new ChannelTimeoutError(type, idleMs)), idleMs);
      const onAbort = () => {
        try {
          this.send('conversation.cancel', { streamId: id });
        } catch {
          // canal coupé : rien à annuler côté serveur
        }
        finish(new DOMException('Flux annulé', 'AbortError'));
      };
      opts.signal?.addEventListener('abort', onAbort, { once: true });
      const stream: ActiveStream = {
        opts,
        resolve: () => finish(),
        reject: (err) => finish(err),
        timer: armTimer(),
        rearm: () => {
          if (stream.timer) clearTimeout(stream.timer);
          stream.timer = armTimer();
        },
        cleanup: () => opts.signal?.removeEventListener('abort', onAbort),
      };
      this.streams.set(id, stream);
    });
    return { id, done };
  }

  // ─── Réception ─────────────────────────────────────────────────────────────

  on<K extends ServerMessageType>(type: K, handler: Handler<K>): () => void {
    let set = this.handlers.get(type);
    if (!set) this.handlers.set(type, (set = new Set()));
    set.add(handler as (payload: any, env: Envelope) => void);
    return () => set!.delete(handler as (payload: any, env: Envelope) => void);
  }

  onAny(handler: (env: Envelope) => void): () => void {
    this.anyHandlers.add(handler);
    return () => this.anyHandlers.delete(handler);
  }

  // ─── Interne ───────────────────────────────────────────────────────────────

  private setState(patch: Partial<ChannelState>): void {
    this.state.setState((s) => ({ ...s, ...patch }));
  }

  private handleOpen(): void {
    this.setState({ status: 'handshaking' });
    this.transport.send(
      JSON.stringify(
        createEnvelope('session.hello', {
          clientId: this.clientId,
          protocol: PROTOCOL_VERSION,
          locale: this.opts.locale,
          capabilities: this.opts.capabilities ?? [],
          ...(this.state.getState().sessionId ? { resumeSessionId: this.state.getState().sessionId! } : {}),
        }),
      ),
    );
    this.clearWelcomeTimer();
    this.welcomeTimer = setTimeout(() => {
      this.setState({ lastError: 'Le backend IA n’a pas répondu à la poignée de main.' });
      this.transport.forceReconnect('welcome timeout');
    }, this.opts.welcomeTimeoutMs ?? 10_000);
  }

  private handleRaw(raw: unknown): void {
    const env = parseEnvelope(raw);
    if (!env) return;

    if (env.type === 'session.welcome') {
      this.handleWelcome(env as Envelope<'session.welcome', ServerPayloadMap['session.welcome']>);
      return;
    }
    if (env.type === 'pong') return;

    if (env.replyTo) this.routeReply(env);

    for (const h of this.handlers.get(env.type) ?? []) safeCall(() => h(env.payload, env));
    for (const h of this.anyHandlers) safeCall(() => h(env));
  }

  private handleWelcome(env: Envelope<'session.welcome', ServerPayloadMap['session.welcome']>): void {
    this.clearWelcomeTimer();
    if (env.payload.protocol !== PROTOCOL_VERSION) {
      this.setState({
        status: 'incompatible',
        lastError: `Protocole incompatible (backend v${env.payload.protocol}, frontend v${PROTOCOL_VERSION}).`,
      });
      this.transport.stop(4002, 'protocol mismatch');
      return;
    }
    if (env.payload.heartbeatMs) this.transport.setHeartbeat(env.payload.heartbeatMs);
    this.transport.resetBackoff();
    this.setState({
      status: 'ready',
      sessionId: env.payload.sessionId,
      attempt: 0,
      lastError: null,
      lastReadyAt: Date.now(),
    });
    this.flushOutbox();
    for (const l of this.readyListeners) safeCall(l);
  }

  private routeReply(env: Envelope): void {
    const replyTo = env.replyTo!;
    const req = this.pending.get(replyTo);
    if (req) {
      if (env.type === 'error' || env.type === 'conversation.error') {
        const p = env.payload as { message?: string; code?: string };
        req.reject(new ChannelRemoteError(p.message ?? 'Erreur du backend IA', p.code));
      } else {
        req.resolve(env);
      }
      return;
    }
    const stream = this.streams.get(replyTo);
    if (stream) {
      stream.rearm();
      safeCall(() => stream.opts.onMessage(env));
      if (stream.opts.errorTypes?.includes(env.type) || env.type === 'error') {
        const p = env.payload as { message?: string; code?: string };
        stream.reject(new ChannelRemoteError(p.message ?? 'Erreur du backend IA', p.code));
      } else if (stream.opts.terminal.includes(env.type)) {
        stream.resolve();
      }
    }
  }

  private handleClose(info: TransportCloseInfo): void {
    this.clearWelcomeTimer();
    this.rejectAll(new ChannelClosedError());
    const wasReady = this.state.getState().status === 'ready';
    if (info.willRetry) {
      this.setState({ status: 'reconnecting', attempt: this.transport.currentAttempt });
    } else {
      const unauthorized = info.code === 4401 || info.code === 4403;
      if (this.state.getState().status !== 'incompatible') {
        this.setState({
          status: unauthorized ? 'unauthorized' : 'closed',
          lastError: unauthorized ? 'Accès à l’assistant refusé par le backend.' : this.state.getState().lastError,
        });
      }
    }
    if (wasReady || info.willRetry) for (const l of this.closeListeners) safeCall(l);
  }

  private rejectAll(err: Error): void {
    for (const p of [...this.pending.values()]) p.reject(err);
    for (const s of [...this.streams.values()]) s.reject(err);
  }

  private enqueue(data: string): void {
    const limit = this.opts.outboxLimit ?? 100;
    const ttl = this.opts.outboxTtlMs ?? 60_000;
    this.outbox.push({ data, expiresAt: Date.now() + ttl });
    if (this.outbox.length > limit) this.outbox.splice(0, this.outbox.length - limit);
  }

  private flushOutbox(): void {
    const now = Date.now();
    const queue = this.outbox;
    this.outbox = [];
    for (const item of queue) {
      if (item.expiresAt >= now) this.transport.send(item.data);
    }
  }

  private clearWelcomeTimer(): void {
    if (this.welcomeTimer) clearTimeout(this.welcomeTimer);
    this.welcomeTimer = null;
  }
}

function safeCall(fn: () => void): void {
  try {
    fn();
  } catch (err) {
    console.error('[EGEN AI Channel] Erreur dans un gestionnaire :', err);
  }
}

export type { ChannelState, ChannelStatus };
