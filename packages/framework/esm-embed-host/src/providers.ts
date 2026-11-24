import { EmbedError } from '@egen-civitas/esm-embed-protocol';

export type Unsub = () => void;

/** Valeur lisible et observable fournie par le Core. */
export interface Watchable<T> {
  get(): T | Promise<T>;
  subscribe?(cb: (value: T) => void): Unsub;
}

export interface CallerContext {
  /** Nom du module de l'app appelante (non falsifiable : porté par la connexion, pas par le message). */
  moduleName: string;
}

export interface ThemeState {
  mode?: string;
  tokens: Record<string, string>;
}

export interface NotificationInput {
  kind: 'info' | 'success' | 'warning' | 'error';
  title: string;
  subtitle?: string;
  timeoutMs?: number;
}

export interface ApiRequest {
  path?: string;
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

export interface AiToolDescriptor {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
}

/**
 * Services du Core mis à disposition des apps embarquées. Toute capacité sans fournisseur est
 * automatiquement refusée à la négociation (`UNAVAILABLE`) : on ne promet que ce qu'on sait servir.
 */
export interface HostProviders {
  session?: Watchable<Record<string, unknown> | undefined>;
  tenant?: Watchable<{ id: string | null }>;
  locale?: Watchable<string>;
  theme?: Watchable<ThemeState>;
  config?: Watchable<Record<string, unknown>>;
  flags?: { isEnabled(name: string): boolean | Promise<boolean>; subscribe?(cb: () => void): Unsub };
  permissions?: { can(permission: string): boolean | Promise<boolean>; subscribe?(cb: () => void): Unsub };
  events?: { publish(topic: string, payload: unknown, ctx: CallerContext): void; subscribe(topic: string, cb: (payload: unknown) => void): Unsub };
  notifications?: { show(n: NotificationInput, ctx: CallerContext): void | Promise<void> };
  dialogs?: { confirm(d: { title: string; message: string; danger?: boolean }, ctx: CallerContext): boolean | Promise<boolean> };
  api?: { fetch(req: ApiRequest, ctx: CallerContext): Promise<ApiResponse> };
  telemetry?: {
    log(level: 'debug' | 'info' | 'warn' | 'error', message: string, ctx: Record<string, unknown> | undefined, from: CallerContext): void;
    metric(name: string, value: number, tags: Record<string, unknown> | undefined, from: CallerContext): void;
  };
  aiTools?: {
    register(moduleName: string, tools: AiToolDescriptor[], invoke: (name: string, args: Record<string, unknown>) => Promise<unknown>): void;
    unregister(moduleName: string, names: string[]): void;
  };
}

export interface FetchProviderOptions {
  /** Base de l'API du Core (ex. `https://api.exemple.org/v1`) : résolution des `path`. */
  baseUrl: string;
  /** En-têtes d'authentification/tenant ajoutés aux appels `path` UNIQUEMENT (jamais aux `url` externes). */
  getHeaders?: () => Record<string, string> | Promise<Record<string, string>>;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  /** Taille maximale du corps de réponse (octets approximatifs). Défaut 200 000. */
  maxResponseBytes?: number;
  /** En-têtes de réponse exposés à l'app. Défaut : content-type, etag, cache-control, content-language. */
  exposeResponseHeaders?: string[];
}

/**
 * Fournisseur `api.fetch` : la requête s'exécute côté Core. Le jeton ne quitte jamais le Core ;
 * `path` → API du Core (cookies + en-têtes d'auth) ; `url` → hôte externe autorisé par le grant, sans cookies ni auth, sans redirection.
 */
export function createFetchApiProvider(o: FetchProviderOptions): NonNullable<HostProviders['api']> {
  const doFetch = o.fetchImpl ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
  const maxBytes = o.maxResponseBytes ?? 200_000;
  const expose = new Set((o.exposeResponseHeaders ?? ['content-type', 'etag', 'cache-control', 'content-language']).map((h) => h.toLowerCase()));
  return {
    async fetch(req) {
      const internal = req.path !== undefined;
      const target = internal ? o.baseUrl.replace(/\/+$/, '') + req.path : (req.url as string);
      const headers: Record<string, string> = { ...(req.headers ?? {}) };
      if (internal && o.getHeaders) Object.assign(headers, await o.getHeaders());
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), o.timeoutMs ?? 10_000);
      try {
        const res = await doFetch(target, {
          method: req.method ?? 'GET',
          headers,
          body: req.body,
          credentials: internal ? 'include' : 'omit',
          redirect: internal ? 'follow' : 'error',
          signal: ctrl.signal,
        });
        const body = await res.text();
        if (body.length > maxBytes) throw new EmbedError('TOO_LARGE', 'Réponse trop volumineuse');
        const outHeaders: Record<string, string> = {};
        res.headers.forEach((v, k) => {
          if (expose.has(k.toLowerCase())) outHeaders[k.toLowerCase()] = v;
        });
        return { status: res.status, headers: outHeaders, body };
      } catch (e) {
        if (e instanceof EmbedError) throw e;
        throw new EmbedError('INTERNAL', ctrl.signal.aborted ? 'Délai dépassé' : 'Requête impossible');
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
