// =============================================================================
//  @egen-civitas/esm-ai-channel — Transport WebSocket
//
//  Couche la plus basse : ouverture du socket, reconnexion exponentielle avec
//  jitter, détection des coupures silencieuses (heartbeat). Ne connaît RIEN du
//  protocole applicatif — il transporte des chaînes.
// =============================================================================

export const WS_OPEN = 1;

export interface WebSocketLike {
  readonly readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  onopen: ((ev: unknown) => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  onclose: ((ev: { code: number; reason?: string }) => void) | null;
  onerror: ((ev: unknown) => void) | null;
}

export type WebSocketFactory = (url: string, protocols: string[]) => WebSocketLike;

export const defaultWebSocketFactory: WebSocketFactory = (url, protocols) =>
  new WebSocket(url, protocols) as unknown as WebSocketLike;

/** Codes de fermeture après lesquels on NE retente PAS (non autorisé / interdit). */
export const FATAL_CLOSE_CODES = new Set([4401, 4403]);

export interface TransportCloseInfo {
  code: number;
  reason: string;
  /** Une reconnexion est planifiée */
  willRetry: boolean;
  /** Délai avant la prochaine tentative (ms), si willRetry */
  retryInMs?: number;
}

export interface TransportOptions {
  resolveUrl: () => string | Promise<string>;
  protocols: string[];
  factory: WebSocketFactory;
  reconnectMinMs: number;
  reconnectMaxMs: number;
  heartbeatMs: number;
  /** Construit la trame de ping envoyée à chaque battement */
  buildPing: () => string;
  random?: () => number;
  onOpen: () => void;
  onMessage: (raw: unknown) => void;
  onClose: (info: TransportCloseInfo) => void;
  onError?: (error: unknown) => void;
  /** Appelé quand une tentative de connexion démarre (attempt = 0 pour la première) */
  onConnecting?: (attempt: number) => void;
}

export class ChannelTransport {
  private ws: WebSocketLike | null = null;
  private attempt = 0;
  private stopped = true;
  private generation = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private lastRx = 0;
  private heartbeatMs: number;

  constructor(private readonly opts: TransportOptions) {
    this.heartbeatMs = opts.heartbeatMs;
  }

  get isOpen(): boolean {
    return this.ws?.readyState === WS_OPEN;
  }

  get currentAttempt(): number {
    return this.attempt;
  }

  start(): void {
    if (!this.stopped) return;
    this.stopped = false;
    this.attempt = 0;
    void this.connect();
  }

  stop(code = 1000, reason = 'client stop'): void {
    this.stopped = true;
    this.generation++;
    this.clearTimers();
    const ws = this.ws;
    this.ws = null;
    if (ws) {
      detach(ws);
      try {
        ws.close(code, reason);
      } catch {
        // déjà fermé
      }
      this.opts.onClose({ code, reason, willRetry: false });
    }
  }

  send(data: string): boolean {
    if (!this.ws || this.ws.readyState !== WS_OPEN) return false;
    try {
      this.ws.send(data);
      return true;
    } catch (err) {
      this.opts.onError?.(err);
      return false;
    }
  }

  /** Remet le compteur de tentatives à zéro (appelé quand la session est établie). */
  resetBackoff(): void {
    this.attempt = 0;
  }

  setHeartbeat(ms: number): void {
    if (ms >= 1000 && ms !== this.heartbeatMs) {
      this.heartbeatMs = ms;
      if (this.heartbeatTimer) this.startHeartbeat();
    }
  }

  /** Ferme le socket courant et laisse la logique de reconnexion reprendre. */
  forceReconnect(reason: string): void {
    const ws = this.ws;
    if (!ws) return;
    try {
      ws.close(4000, reason);
    } catch {
      // déjà fermé
    }
  }

  // ─── Interne ───────────────────────────────────────────────────────────────

  private async connect(): Promise<void> {
    const gen = ++this.generation;
    this.opts.onConnecting?.(this.attempt);

    let url: string;
    try {
      url = await this.opts.resolveUrl();
    } catch (err) {
      if (gen !== this.generation || this.stopped) return;
      this.opts.onError?.(err);
      this.scheduleRetry(1011, 'url resolution failed');
      return;
    }
    if (gen !== this.generation || this.stopped) return;

    let ws: WebSocketLike;
    try {
      ws = this.opts.factory(url, this.opts.protocols);
    } catch (err) {
      this.opts.onError?.(err);
      this.scheduleRetry(1011, 'socket creation failed');
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      if (gen !== this.generation) return;
      this.lastRx = Date.now();
      this.startHeartbeat();
      this.opts.onOpen();
    };
    ws.onmessage = (ev) => {
      if (gen !== this.generation) return;
      this.lastRx = Date.now();
      this.opts.onMessage(ev.data);
    };
    ws.onerror = (ev) => {
      if (gen !== this.generation) return;
      this.opts.onError?.(ev);
    };
    ws.onclose = (ev) => {
      if (gen !== this.generation) return;
      this.ws = null;
      this.clearTimers();
      if (this.stopped) return;
      if (FATAL_CLOSE_CODES.has(ev.code)) {
        this.stopped = true;
        this.opts.onClose({ code: ev.code, reason: ev.reason ?? '', willRetry: false });
        return;
      }
      this.scheduleRetry(ev.code, ev.reason ?? '');
    };
  }

  private scheduleRetry(code: number, reason: string): void {
    const { reconnectMinMs, reconnectMaxMs } = this.opts;
    const random = this.opts.random ?? Math.random;
    const exp = Math.min(reconnectMaxMs, reconnectMinMs * 2 ** this.attempt);
    const delay = Math.round(exp * (0.5 + random() * 0.5));
    this.attempt++;
    this.opts.onClose({ code, reason, willRetry: true, retryInMs: delay });
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      if (!this.stopped) void this.connect();
    }, delay);
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      if (!this.isOpen) return;
      if (Date.now() - this.lastRx > this.heartbeatMs * 2.5) {
        this.forceReconnect('heartbeat timeout');
        return;
      }
      this.send(this.opts.buildPing());
    }, this.heartbeatMs);
  }

  private clearTimers(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.retryTimer = null;
    this.heartbeatTimer = null;
  }
}

function detach(ws: WebSocketLike): void {
  ws.onopen = null;
  ws.onmessage = null;
  ws.onclose = null;
  ws.onerror = null;
}
