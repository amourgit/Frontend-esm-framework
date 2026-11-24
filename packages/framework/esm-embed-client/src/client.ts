import { EmbedError, type CapabilityDenied, type CapabilityGranted, type CapabilityId, type RpcEndpoint } from '@egen-civitas/esm-embed-protocol';

export type Unsubscribe = () => void;
export type JsonObject = Record<string, unknown>;

export interface ThemeState {
  mode?: 'light' | 'dark' | string;
  /** Variables CSS du Core : `{ '--color-primary': '#…' }`. */
  tokens: Record<string, string>;
}

export interface NotificationInput {
  kind: 'info' | 'success' | 'warning' | 'error';
  title: string;
  subtitle?: string;
  timeoutMs?: number;
}

export interface ApiRequest {
  /** Chemin relatif à l'API du Core (`/x`) — exclusif avec `url`. */
  path?: string;
  /** URL https absolue d'un hôte autorisé par le grant — exclusif avec `path`. */
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
}

export interface ApiResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export interface AiToolDefinition {
  name: string;
  description: string;
  inputSchema?: JsonObject;
  /** Exécutée dans l'app quand le backend IA appelle l'outil (l'autorité et la validation restent au backend). */
  handler: (args: JsonObject) => unknown | Promise<unknown>;
}

export interface ClientInit {
  connected: boolean;
  moduleName: string;
  granted: CapabilityGranted[];
  denied: CapabilityDenied[];
  rpc: RpcEndpoint | undefined;
  protocol?: number;
}

const THEME_KEY_RE = /^--[a-z0-9-]{1,100}$/i;
const THEME_VALUE_RE = /^[^;{}<>\\]{0,300}$/;

/**
 * Client d'une application embarquée. Chaque capacité est une façade typée ;
 * un appel sur une capacité non accordée est rejeté localement (`DENIED`), sans aller-retour.
 */
export class EgenClient {
  readonly connected: boolean;
  readonly moduleName: string;
  readonly protocol: number | undefined;
  readonly denied: CapabilityDenied[];
  private readonly granted: Map<string, CapabilityGranted>;
  private readonly rpc: RpcEndpoint | undefined;
  private readonly tools = new Map<string, AiToolDefinition['handler']>();
  private beforeLeave: (() => boolean | Promise<boolean>) | undefined;

  constructor(init: ClientInit) {
    this.connected = init.connected;
    this.moduleName = init.moduleName;
    this.protocol = init.protocol;
    this.denied = init.denied;
    this.rpc = init.rpc;
    this.granted = new Map(init.granted.map((g) => [g.id, g]));
  }

  /** @internal Rappel hôte → app (`ai-tools.invoke`). */
  async _invokeTool(name: string, args: JsonObject): Promise<unknown> {
    const h = this.tools.get(name);
    if (!h) throw new EmbedError('UNKNOWN_METHOD', `Outil inconnu : ${name}`);
    return h(args);
  }

  /** @internal Rappel hôte → app (`lifecycle.canLeave`). */
  async _canLeave(): Promise<boolean> {
    return this.beforeLeave ? !!(await this.beforeLeave()) : true;
  }

  /** La capacité est-elle accordée par l'hôte ? */
  has(id: CapabilityId): boolean {
    return this.granted.has(id);
  }

  /** Capacités accordées avec leur configuration (ex. champs de session). */
  get capabilities(): CapabilityGranted[] {
    return [...this.granted.values()];
  }

  close(): void {
    this.rpc?.close();
  }

  get closed(): boolean {
    return !this.rpc || this.rpc.closed;
  }

  private call<T>(cap: CapabilityId, method: string, args: unknown[] = []): Promise<T> {
    if (!this.rpc || this.rpc.closed) return Promise.reject(new EmbedError('DENIED', this.connected ? 'Connexion fermée' : 'Application non connectée au Shell EGEN'));
    if (!this.granted.has(cap)) return Promise.reject(new EmbedError('DENIED', `Capacité non accordée : ${cap}`));
    return this.rpc.call<T>(cap, method, args);
  }

  private async on(cap: CapabilityId, ev: string, cb: (v: any) => void): Promise<Unsubscribe> {
    if (!this.rpc || this.rpc.closed) throw new EmbedError('DENIED', 'Application non connectée au Shell EGEN');
    if (!this.granted.has(cap)) throw new EmbedError('DENIED', `Capacité non accordée : ${cap}`);
    return this.rpc.subscribe(cap, ev, cb);
  }

  readonly session = {
    get: () => this.call<JsonObject>('session', 'get'),
    onChange: (cb: (s: JsonObject) => void) => this.on('session', 'change', cb),
  };
  readonly tenant = {
    get: () => this.call<{ id: string | null }>('tenant', 'get'),
    onChange: (cb: (t: { id: string | null }) => void) => this.on('tenant', 'change', cb),
  };
  readonly locale = {
    get: () => this.call<string>('locale', 'get'),
    onChange: (cb: (l: string) => void) => this.on('locale', 'change', cb),
  };
  readonly theme = {
    get: () => this.call<ThemeState>('theme', 'get'),
    onChange: (cb: (t: ThemeState) => void) => this.on('theme', 'change', cb),
    /**
     * Applique le thème du Core au document de l'app (variables CSS sur `:root` + classe `dark` selon le mode) et le maintient à jour.
     * Les clés doivent être des variables CSS (`--nom`) et les valeurs sans `;{}<>` (pas d'injection CSS).
     */
    sync: async (root: { style: { setProperty(k: string, v: string): void }; classList?: { toggle(name: string, force?: boolean): boolean } } = (globalThis as any).document?.documentElement): Promise<Unsubscribe> => {
      if (!root) return () => undefined;
      const apply = (t: ThemeState) => {
        for (const [k, v] of Object.entries(t.tokens ?? {})) if (THEME_KEY_RE.test(k) && typeof v === 'string' && THEME_VALUE_RE.test(v)) root.style.setProperty(k, v);
        if (t.mode && root.classList) root.classList.toggle('dark', t.mode === 'dark');
      };
      apply(await this.theme.get());
      return this.theme.onChange(apply);
    },
  };
  readonly permissions = {
    can: (permission: string) => this.call<boolean>('permissions', 'can', [permission]),
    onChange: (cb: () => void) => this.on('permissions', 'change', cb),
  };
  readonly navigation = {
    report: (path: string, opts?: { replace?: boolean; title?: string }) => this.call<void>('navigation', 'report', opts ? [path, opts] : [path]),
    navigate: (to: string) => this.call<void>('navigation', 'navigate', [to]),
    setTitle: (title: string) => this.call<void>('navigation', 'setTitle', [title]),
    resize: (height: number) => this.call<void>('navigation', 'resize', [height]),
    /** L'hôte demande d'aller à `path` (retour/avance du navigateur, lien du Core). */
    onGoto: (cb: (msg: { path: string; seq: number }) => void) => this.on('navigation', 'goto', cb),
  };
  readonly events = {
    publish: (topic: string, payload?: unknown) => this.call<void>('events', 'publish', payload === undefined ? [topic] : [topic, payload]),
    subscribe: (topic: string, cb: (payload: unknown) => void) => this.on('events', topic, cb),
  };
  readonly notifications = {
    show: (n: NotificationInput) => this.call<void>('notifications', 'show', [n]),
  };
  readonly dialogs = {
    confirm: (d: { title: string; message: string; danger?: boolean }) => this.call<boolean>('dialogs', 'confirm', [d]),
  };
  readonly api = {
    fetch: (req: ApiRequest) => this.call<ApiResponse>('api', 'fetch', [req]),
  };
  readonly flags = {
    isEnabled: (name: string) => this.call<boolean>('flags', 'isEnabled', [name]),
    onChange: (cb: () => void) => this.on('flags', 'change', cb),
  };
  readonly config = {
    get: () => this.call<JsonObject>('config', 'get'),
    onChange: (cb: (c: JsonObject) => void) => this.on('config', 'change', cb),
  };
  readonly telemetry = {
    log: (level: 'debug' | 'info' | 'warn' | 'error', message: string, ctx?: JsonObject) => this.call<void>('telemetry', 'log', ctx ? [level, message, ctx] : [level, message]),
    metric: (name: string, value: number, tags?: JsonObject) => this.call<void>('telemetry', 'metric', tags ? [name, value, tags] : [name, value]),
  };
  readonly aiTools = {
    /** Déclare des outils exécutables par l'agent IA (le backend appelle, valide et garde l'autorité). */
    register: async (tools: AiToolDefinition[]) => {
      await this.call<void>('ai-tools', 'register', [tools.map(({ name, description, inputSchema }) => ({ name, description, ...(inputSchema ? { inputSchema } : {}) }))]);
      for (const t of tools) this.tools.set(t.name, t.handler);
    },
    unregister: async (names: string[]) => {
      await this.call<void>('ai-tools', 'unregister', [names]);
      for (const n of names) this.tools.delete(n);
    },
  };
  readonly lifecycle = {
    /** À appeler quand l'app est prête (l'hôte peut alors masquer son indicateur de chargement). */
    ready: () => this.call<void>('lifecycle', 'ready'),
    onVisibility: (cb: (visible: boolean) => void) => this.on('lifecycle', 'visibility', cb),
    onFocus: (cb: (focused: boolean) => void) => this.on('lifecycle', 'focus', cb),
    /** L'hôte demande l'autorisation de quitter l'app (modifications non enregistrées). `true` = on peut quitter. */
    setBeforeLeave: (fn: (() => boolean | Promise<boolean>) | undefined) => {
      this.beforeLeave = fn;
    },
  };
}
