import {
  CAPABILITIES,
  DEFAULT_SESSION_FIELDS,
  EmbedError,
  pathAllowed,
  pickFields,
  topicAllowed,
  type CapabilityGranted,
  type CapabilityId,
  type GrantConfig,
  type HandlerTable,
  type SubscribeHandler,
} from '@egen-civitas/esm-embed-protocol';
import type { Bus } from './bus.js';
import type { ApiRequest, CallerContext, HostProviders } from './providers.js';

/** Actions du Shell pilotées par les capacités `navigation` et `lifecycle`. */
export interface HostControls {
  report?(path: string, opts?: { replace?: boolean; title?: string }): void;
  navigate?(to: string): void;
  setTitle?(title: string): void;
  resize?(height: number): void;
  onReady?(): void;
  /** Événements hôte → app : `goto`, `visibility`, `focus`. */
  channel: Bus;
}

/** Capacités que l'hôte sait servir avec ces fournisseurs. `navigation`, `lifecycle` et `telemetry` sont toujours servies. */
export function availableCapabilities(p: HostProviders): Set<CapabilityId> {
  const s = new Set<CapabilityId>(['navigation', 'lifecycle', 'telemetry']);
  const map: Array<[CapabilityId, unknown]> = [
    ['session', p.session],
    ['tenant', p.tenant],
    ['locale', p.locale],
    ['theme', p.theme],
    ['config', p.config],
    ['flags', p.flags],
    ['permissions', p.permissions],
    ['events', p.events],
    ['notifications', p.notifications],
    ['dialogs', p.dialogs],
    ['api', p.api],
    ['ai-tools', p.aiTools],
  ];
  for (const [id, prov] of map) if (prov) s.add(id);
  return s;
}

const list = (cfg: GrantConfig | undefined, key: string): string[] => (Array.isArray(cfg?.[key]) ? (cfg![key] as string[]) : []);

function normOrigin(u: string): string {
  try {
    return new URL(u).origin;
  } catch {
    return u;
  }
}

export interface TableOptions {
  moduleName: string;
  granted: CapabilityGranted[];
  providers: HostProviders;
  controls: HostControls;
  /** Appel hôte → app (`ai-tools.invoke`). */
  callApp: (cap: string, method: string, args: unknown[]) => Promise<unknown>;
}

/**
 * Construit la table de dispatch FERMÉE d'une connexion : seules les capacités accordées (et servies) y figurent,
 * chaque méthode applique son grant (champs de session, sujets d'événements, hôtes d'API, outils IA, sondes).
 */
export function createCapabilityTable(o: TableOptions): { table: HandlerTable; subscribe: SubscribeHandler; cleanup: () => void } {
  const { providers: p, controls: c } = o;
  const ctx: CallerContext = { moduleName: o.moduleName };
  const cfgOf = new Map(o.granted.map((g) => [g.id, g.config]));
  const table: HandlerTable = {};
  const registeredTools = new Set<string>();

  const sessionFields = () => {
    const f = list(cfgOf.get('session'), 'fields');
    return f.length ? f : [...DEFAULT_SESSION_FIELDS];
  };
  const pick = (s: unknown) => pickFields(s, sessionFields());
  const denied = (msg: string) => new EmbedError('DENIED', msg);

  if (cfgOf.has('session') && p.session) table.session = { get: async () => pick(await p.session!.get()) };
  if (cfgOf.has('tenant') && p.tenant) table.tenant = { get: async () => p.tenant!.get() };
  if (cfgOf.has('locale') && p.locale) table.locale = { get: async () => p.locale!.get() };
  if (cfgOf.has('theme') && p.theme) table.theme = { get: async () => p.theme!.get() };
  if (cfgOf.has('config') && p.config) table.config = { get: async () => p.config!.get() };

  if (cfgOf.has('permissions') && p.permissions) {
    const probe = list(cfgOf.get('permissions'), 'probe');
    table.permissions = {
      can: async (perm: string) => {
        if (!probe.includes(perm)) throw denied(`Permission non sondable : ${perm}`);
        return !!(await p.permissions!.can(perm));
      },
    };
  }
  if (cfgOf.has('flags') && p.flags) {
    const names = list(cfgOf.get('flags'), 'names');
    table.flags = {
      isEnabled: async (name: string) => {
        if (!names.includes(name)) throw denied(`Drapeau non accessible : ${name}`);
        return !!(await p.flags!.isEnabled(name));
      },
    };
  }
  if (cfgOf.has('events') && p.events) {
    const pub = list(cfgOf.get('events'), 'publish');
    table.events = {
      publish: (topic: string, payload?: unknown) => {
        if (!topicAllowed(pub, topic)) throw denied(`Publication non autorisée sur : ${topic}`);
        p.events!.publish(topic, payload, ctx);
      },
    };
  }
  if (cfgOf.has('notifications') && p.notifications) table.notifications = { show: async (n: any) => void (await p.notifications!.show(n, ctx)) };
  if (cfgOf.has('dialogs') && p.dialogs) table.dialogs = { confirm: async (d: any) => !!(await p.dialogs!.confirm(d, ctx)) };
  if (cfgOf.has('api') && p.api) {
    const cfg = cfgOf.get('api');
    const hosts = list(cfg, 'hosts').map(normOrigin);
    const headers = list(cfg, 'headers').map((h) => h.toLowerCase());
    const paths = list(cfg, 'paths');
    table.api = {
      fetch: async (req: ApiRequest) => {
        if (req.url !== undefined && !hosts.includes(normOrigin(req.url))) throw denied("Hôte non autorisé par le grant de l'app");
        // Sans liste de chemins (deny-by-default) une app ne peut PAS appeler l'API du Core avec la session de l'utilisateur.
        if (req.path !== undefined && !pathAllowed(paths, req.path)) throw denied(`Chemin d'API non autorisé par le grant de l'app : ${req.path}`);
        for (const h of Object.keys(req.headers ?? {})) if (!headers.includes(h.toLowerCase())) throw denied(`En-tête non autorisé : ${h}`);
        return p.api!.fetch(req, ctx);
      },
    };
  }
  if (cfgOf.has('ai-tools') && p.aiTools) {
    const allowed = list(cfgOf.get('ai-tools'), 'tools');
    table['ai-tools'] = {
      register: (tools: Array<{ name: string; description: string; inputSchema?: Record<string, unknown> }>) => {
        for (const t of tools) if (!topicAllowed(allowed, t.name)) throw denied(`Outil non autorisé : ${t.name}`);
        p.aiTools!.register(o.moduleName, tools, (name, args) => o.callApp('ai-tools', 'invoke', [name, args]));
        for (const t of tools) registeredTools.add(t.name);
      },
      unregister: (names: string[]) => {
        p.aiTools!.unregister(o.moduleName, names);
        for (const n of names) registeredTools.delete(n);
      },
    };
  }
  if (cfgOf.has('telemetry')) {
    table.telemetry = {
      log: (level: any, message: string, extra?: Record<string, unknown>) => void p.telemetry?.log(level, message, extra, ctx),
      metric: (name: string, value: number, tags?: Record<string, unknown>) => void p.telemetry?.metric(name, value, tags, ctx),
    };
  }
  if (cfgOf.has('navigation')) {
    table.navigation = {
      report: (path: string, opts?: { replace?: boolean; title?: string }) => c.report?.(path, opts),
      navigate: (to: string) => c.navigate?.(to),
      setTitle: (t: string) => c.setTitle?.(t),
      resize: (h: number) => c.resize?.(h),
    };
  }
  if (cfgOf.has('lifecycle')) table.lifecycle = { ready: () => c.onReady?.() };

  const subscribe: SubscribeHandler = (cap, ev, emit) => {
    const cfg = cfgOf.get(cap as CapabilityId);
    const desc = CAPABILITIES[cap as CapabilityId];
    if (!cfg || !desc || !table[cap]) return undefined;
    if (cap === 'events') return topicAllowed(list(cfg, 'subscribe'), ev) ? p.events!.subscribe(ev, emit) : undefined;
    if (!desc.events.includes(ev)) return undefined;
    switch (cap) {
      case 'session':
        return p.session!.subscribe?.((v) => emit(pick(v)));
      case 'tenant':
        return p.tenant!.subscribe?.(emit);
      case 'locale':
        return p.locale!.subscribe?.(emit);
      case 'theme':
        return p.theme!.subscribe?.(emit);
      case 'config':
        return p.config!.subscribe?.(emit);
      case 'flags':
        return p.flags!.subscribe?.(() => emit());
      case 'permissions':
        return p.permissions!.subscribe?.(() => emit());
      case 'navigation':
      case 'lifecycle':
        return c.channel.on(ev, emit);
      default:
        return undefined;
    }
  };

  return {
    table,
    subscribe,
    cleanup: () => {
      if (registeredTools.size && p.aiTools) p.aiTools.unregister(o.moduleName, [...registeredTools]);
      registeredTools.clear();
    },
  };
}
