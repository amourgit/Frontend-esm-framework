import { DEFAULT_LIMITS, type Limits } from './constants.js';
import { EmbedError, fromWireError, toWireError } from './errors.js';
import { estimateSize, parseRpc } from './guards.js';
import type { RpcMessage } from './types.js';

export type Handler = (...args: any[]) => unknown | Promise<unknown>;
export type HandlerTable = Record<string, Record<string, Handler>>;
export type Emit = (value?: unknown) => void;
/** Enregistre un abonnement ; retourne la fonction de nettoyage, ou `undefined` pour refuser (DENIED). */
export type SubscribeHandler = (cap: string, ev: string, emit: Emit) => (() => void) | undefined;

export interface RpcOptions {
  port: MessagePort;
  /** Table de dispatch fermée : seules ces capacités et méthodes sont appelables par le pair. */
  handlers?: HandlerTable;
  onSubscribe?: SubscribeHandler;
  /** Validation des arguments avant appel (ex. `validateCall` du catalogue) ; message d'erreur ou `null`. */
  validate?: (cap: string, method: string, args: unknown[]) => string | null;
  limits?: Partial<Limits>;
  onClose?: (reason: string) => void;
}

interface Pending {
  resolve(v: unknown): void;
  reject(e: unknown): void;
  timer: ReturnType<typeof setTimeout>;
}

interface LocalSub {
  cleanup: () => void;
  ready: boolean;
  queue: unknown[];
}

/**
 * Moteur RPC symétrique sur un `MessagePort`.
 *
 * Sécurité : la résolution des appels passe par des `Map` construites à partir des seules propriétés propres de la table ;
 * aucun chemin dynamique (`a.b.c`) n'est jamais résolu, donc ni `constructor` ni `__proto__` ne sont atteignables.
 */
export class RpcEndpoint {
  private readonly port: MessagePort;
  private readonly table = new Map<string, Map<string, Handler>>();
  private readonly limits: Limits;
  private readonly opts: RpcOptions;
  private readonly pending = new Map<number, Pending>();
  private readonly listeners = new Map<number, (v: unknown) => void>();
  private readonly subs = new Map<number, LocalSub>();
  private nextId = 1;
  private nextSid = 1;
  private _closed = false;
  private windowStart = 0;
  private reqCount = 0;
  private evtWindowStart = 0;
  private evtCount = 0;
  private lastInbound = Date.now();
  private heartbeat?: ReturnType<typeof setInterval>;

  constructor(opts: RpcOptions) {
    this.opts = opts;
    this.port = opts.port;
    this.limits = { ...DEFAULT_LIMITS, ...opts.limits };
    for (const cap of Object.keys(opts.handlers ?? {})) {
      const methods = new Map<string, Handler>();
      for (const m of Object.keys(opts.handlers![cap])) methods.set(m, opts.handlers![cap][m]);
      this.table.set(cap, methods);
    }
    this.port.onmessage = (ev: MessageEvent) => this.receive(ev.data);
    this.port.start?.();
    if (this.limits.pingIntervalMs > 0) {
      this.heartbeat = setInterval(() => {
        if (Date.now() - this.lastInbound > this.limits.pingIntervalMs * 2) this.close('HEARTBEAT');
        else this.send({ t: 'ping' });
      }, this.limits.pingIntervalMs);
      (this.heartbeat as any).unref?.();
    }
  }

  get closed(): boolean {
    return this._closed;
  }

  /** Appelle `cap.method(...args)` chez le pair. */
  call<T = unknown>(cap: string, method: string, args: unknown[] = [], timeoutMs: number = this.limits.callTimeoutMs): Promise<T> {
    if (this._closed) return Promise.reject(new EmbedError('CLOSED', 'Connexion fermée'));
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new EmbedError('TIMEOUT', `${cap}.${method} : délai dépassé`));
      }, timeoutMs);
      (timer as any).unref?.();
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject, timer });
      if (!this.send({ t: 'req', id, cap, m: method, a: args })) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(new EmbedError('INTERNAL', 'Message non transmissible'));
      }
    });
  }

  /** S'abonne à `cap/ev` chez le pair ; retourne la fonction de désabonnement. */
  async subscribe(cap: string, ev: string, listener: (v: unknown) => void): Promise<() => void> {
    if (this._closed) throw new EmbedError('CLOSED', 'Connexion fermée');
    const id = this.nextId++;
    const sid = await new Promise<number>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new EmbedError('TIMEOUT', `abonnement ${cap}/${ev} : délai dépassé`));
      }, this.limits.callTimeoutMs);
      (timer as any).unref?.();
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject, timer });
      if (!this.send({ t: 'sub', id, cap, ev })) reject(new EmbedError('INTERNAL', 'Message non transmissible'));
    });
    this.listeners.set(sid, listener);
    return () => {
      if (this.listeners.delete(sid) && !this._closed) this.send({ t: 'unsub', sid });
    };
  }

  close(reason = 'local'): void {
    if (this._closed) return;
    if (reason === 'local') this.send({ t: 'bye' });
    this._closed = true;
    if (this.heartbeat) clearInterval(this.heartbeat);
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(new EmbedError('CLOSED', 'Connexion fermée'));
    }
    this.pending.clear();
    for (const s of this.subs.values()) {
      try {
        s.cleanup();
      } catch {
        /* nettoyage best-effort */
      }
    }
    this.subs.clear();
    this.listeners.clear();
    this.port.onmessage = null;
    try {
      this.port.close();
    } catch {
      /* déjà fermé */
    }
    this.opts.onClose?.(reason);
  }

  /* ───────── interne ───────── */

  private send(msg: RpcMessage): boolean {
    try {
      this.port.postMessage(msg);
      return true;
    } catch {
      return false;
    }
  }

  private allowRequest(): boolean {
    const now = Date.now();
    if (now - this.windowStart >= 1000) {
      this.windowStart = now;
      this.reqCount = 0;
    }
    this.reqCount++;
    if (this.reqCount > this.limits.requestsPerSecond * 2) this.close('RATE_LIMIT');
    return this.reqCount <= this.limits.requestsPerSecond;
  }

  private allowEvent(): boolean {
    const now = Date.now();
    if (now - this.evtWindowStart >= 1000) {
      this.evtWindowStart = now;
      this.evtCount = 0;
    }
    return ++this.evtCount <= this.limits.eventsPerSecond;
  }

  private reply(id: number, ok: true, v?: unknown): void;
  private reply(id: number, ok: false, err: unknown): void;
  private reply(id: number, ok: boolean, payload?: unknown): void {
    if (ok) {
      if (!this.send({ t: 'res', id, ok: true, v: payload })) this.send({ t: 'res', id, ok: false, e: toWireError(new EmbedError('INTERNAL', 'Résultat non transmissible')) });
    } else this.send({ t: 'res', id, ok: false, e: toWireError(payload) });
  }

  private receive(data: unknown): void {
    if (this._closed) return;
    this.lastInbound = Date.now();
    const msg = parseRpc(data);
    if (!msg) return;
    if (estimateSize(data, this.limits.maxMessageBytes) > this.limits.maxMessageBytes) {
      if (msg.t === 'req' || msg.t === 'sub') this.reply(msg.id, false, new EmbedError('TOO_LARGE', 'Message trop volumineux'));
      else if (msg.t === 'res') {
        // Réponse trop volumineuse : l'appelant est averti au lieu d'attendre le délai.
        const p = this.pending.get(msg.id);
        if (p) {
          this.pending.delete(msg.id);
          clearTimeout(p.timer);
          p.reject(new EmbedError('TOO_LARGE', 'Réponse trop volumineuse'));
        }
      }
      return;
    }
    switch (msg.t) {
      case 'req':
        void this.onRequest(msg);
        break;
      case 'res': {
        const p = this.pending.get(msg.id);
        if (!p) break;
        this.pending.delete(msg.id);
        clearTimeout(p.timer);
        if (msg.ok) p.resolve(msg.v);
        else p.reject(fromWireError(msg.e));
        break;
      }
      case 'sub':
        this.onSubscribeRequest(msg.id, msg.cap, msg.ev);
        break;
      case 'unsub': {
        const s = this.subs.get(msg.sid);
        if (s) {
          this.subs.delete(msg.sid);
          try {
            s.cleanup();
          } catch {
            /* best-effort */
          }
        }
        break;
      }
      case 'evt':
        try {
          this.listeners.get(msg.sid)?.(msg.v);
        } catch {
          /* un écouteur fautif ne doit pas casser le canal */
        }
        break;
      case 'ping':
        this.send({ t: 'pong' });
        break;
      case 'bye':
        this.close('remote');
        break;
    }
  }

  private async onRequest(msg: Extract<RpcMessage, { t: 'req' }>): Promise<void> {
    if (!this.allowRequest()) return this.reply(msg.id, false, new EmbedError('RATE_LIMITED', 'Trop de requêtes'));
    const methods = this.table.get(msg.cap);
    if (!methods) return this.reply(msg.id, false, new EmbedError('UNKNOWN_CAPABILITY', `Capacité non disponible : ${msg.cap}`));
    const fn = methods.get(msg.m);
    if (!fn) return this.reply(msg.id, false, new EmbedError('UNKNOWN_METHOD', `Méthode inconnue : ${msg.cap}.${msg.m}`));
    const bad = this.opts.validate?.(msg.cap, msg.m, msg.a);
    if (bad) return this.reply(msg.id, false, new EmbedError('INVALID_ARGS', bad));
    try {
      this.reply(msg.id, true, await fn(...msg.a));
    } catch (e) {
      this.reply(msg.id, false, e);
    }
  }

  private onSubscribeRequest(id: number, cap: string, ev: string): void {
    if (!this.allowRequest()) return this.reply(id, false, new EmbedError('RATE_LIMITED', 'Trop de requêtes'));
    if (this.subs.size >= this.limits.maxSubscriptions) return this.reply(id, false, new EmbedError('RATE_LIMITED', "Trop d'abonnements"));
    if (!this.opts.onSubscribe) return this.reply(id, false, new EmbedError('DENIED', 'Abonnements non pris en charge'));
    const sid = this.nextSid++;
    const sub: LocalSub = { cleanup: () => undefined, ready: false, queue: [] };
    const emit: Emit = (v) => {
      if (this._closed || !this.subs.has(sid)) return;
      if (!sub.ready) return void sub.queue.push(v);
      if (this.allowEvent()) this.send({ t: 'evt', sid, v });
    };
    let cleanup: (() => void) | undefined;
    this.subs.set(sid, sub);
    try {
      cleanup = this.opts.onSubscribe(cap, ev, emit);
    } catch (e) {
      this.subs.delete(sid);
      return this.reply(id, false, e);
    }
    if (!cleanup) {
      this.subs.delete(sid);
      return this.reply(id, false, new EmbedError('DENIED', `Abonnement refusé : ${cap}/${ev}`));
    }
    sub.cleanup = cleanup;
    this.reply(id, true, sid);
    sub.ready = true;
    for (const v of sub.queue.splice(0)) emit(v);
  }
}
