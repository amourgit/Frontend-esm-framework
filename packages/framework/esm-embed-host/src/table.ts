import {
  CAPABILITIES,
  createSlidingLimiter,
  notificationPolicy,
  EmbedError,
  slotAllowed,
  topicAllowed,
  type CapabilityGranted,
  type CapabilityId,
  type GrantConfig,
  type HandlerTable,
  type SubscribeHandler,
} from '@egen-civitas/esm-embed-protocol';
import type { Bus } from './bus.js';
import type { CallerContext, HostProviders } from './providers.js';

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
    ['tenant', p.tenant],
    ['locale', p.locale],
    ['config', p.config],
    ['flags', p.flags],
    ['events', p.events],
    ['notifications', p.notifications],
    ['dialogs', p.dialogs],
    ['extensions', p.extensions],
    ['ai-tools', p.aiTools],
  ];
  for (const [id, prov] of map) if (prov) s.add(id);
  return s;
}

const list = (cfg: GrantConfig | undefined, key: string): string[] => (Array.isArray(cfg?.[key]) ? (cfg![key] as string[]) : []);

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
 * chaque méthode applique son grant (sujets d'événements, slots découvrables, drapeaux, outils IA).
 */
export function createCapabilityTable(o: TableOptions): { table: HandlerTable; subscribe: SubscribeHandler; cleanup: () => void } {
  const { providers: p, controls: c } = o;
  const ctx: CallerContext = { moduleName: o.moduleName };
  const cfgOf = new Map(o.granted.map((g) => [g.id, g.config]));
  const table: HandlerTable = {};
  const registeredTools = new Set<string>();

  const denied = (msg: string) => new EmbedError('DENIED', msg);

  if (cfgOf.has('tenant') && p.tenant) table.tenant = { get: async () => p.tenant!.get() };
  if (cfgOf.has('locale') && p.locale) table.locale = { get: async () => p.locale!.get() };
  if (cfgOf.has('config') && p.config) table.config = { get: async () => p.config!.get() };

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
  if (cfgOf.has('notifications') && p.notifications) {
    // Anti-spam : une iframe ne doit pas pouvoir inonder l'interface du Core (ni imiter des messages système en rafale).
    const policy = notificationPolicy(cfgOf.get('notifications'));
    const allow = createSlidingLimiter(policy.rate.max, policy.rate.perSeconds);
    table.notifications = {
      show: async (n: any) => {
        if (!allow()) throw new EmbedError('RATE_LIMITED', 'Trop de notifications');
        return { displayed: (await p.notifications!.show(n, ctx)) !== false };
      },
    };
  }
  if (cfgOf.has('dialogs') && p.dialogs) table.dialogs = { confirm: async (d: any) => !!(await p.dialogs!.confirm(d, ctx)) };
  if (cfgOf.has('extensions') && p.extensions) {
    const discover = list(cfgOf.get('extensions'), 'discover');
    table.extensions = {
      list: async (slot: string) => {
        if (!slotAllowed(discover, slot)) throw denied(`Slot non découvrable par le grant de l'app : ${slot}`);
        return p.extensions!.list(slot);
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
    if (cap === 'extensions') return slotAllowed(list(cfg, 'discover'), ev) && p.extensions!.subscribe ? p.extensions!.subscribe(ev, emit as (l: any) => void) : undefined;
    if (!desc.events.includes(ev)) return undefined;
    switch (cap) {
      case 'tenant':
        return p.tenant!.subscribe?.(emit);
      case 'locale':
        return p.locale!.subscribe?.(emit);
      case 'config':
        return p.config!.subscribe?.(emit);
      case 'flags':
        return p.flags!.subscribe?.(() => emit());
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
