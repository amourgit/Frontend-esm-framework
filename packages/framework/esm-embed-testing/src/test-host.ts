import { effectiveGrants, type ApprovedGrants, type CapabilityId, type GrantConfig } from '@egen-civitas/esm-embed-protocol';
import type { ConnectOptions } from '@egen-civitas/esm-embed-client';
import { createBus, HostConnection, type ExtensionInfo, type HostProviders } from '@egen-civitas/esm-embed-host';

export interface TestHostOptions {
  moduleName?: string;
  /** Origine simulée du Shell (à mettre dans `hostOrigins` de l'app). */
  origin?: string;
  /** Capacités demandées par le manifeste de l'app (défaut : aucune demande explicite = l'opérateur définit seul). */
  manifestCapabilities?: Partial<Record<CapabilityId, GrantConfig>>;
  /** Plafond fixé par l'opérateur (défaut : rien d'approuvé hors capacités « par défaut »). */
  approved?: ApprovedGrants;
  tenant?: { id: string | null };
  locale?: string;
  config?: Record<string, unknown>;
  flags?: Record<string, boolean>;
  /** Extensions attachées à chaque slot (`{ 'topbar-nav-slot': [...] }`). */
  extensions?: Record<string, ExtensionInfo[]>;
  confirm?: boolean | ((d: { title: string; message: string; danger?: boolean }) => boolean);
}

export interface CallRecord {
  cap: string;
  method: string;
  args: unknown[];
}

export interface TestHost {
  /** À passer à `connectToEgen({ ...host.connectOptions, capabilities: [...] })`. */
  connectOptions: Pick<ConnectOptions, 'moduleName' | 'hostOrigins' | 'window' | 'host' | 'timeoutMs'>;
  connection: HostConnection;
  /** Journal des services du Core sollicités par l'app. */
  calls: CallRecord[];
  notifications: Array<{ kind: string; title: string; subtitle?: string }>;
  published: Array<{ topic: string; payload: unknown; from: string }>;
  tools: Map<string, { description: string }>;
  /** Pousse un changement vers l'app (comme le ferait le Core). */
  emit: {
    tenant(v: { id: string | null }): void;
    locale(v: string): void;
    extensions(slot: string, list: ExtensionInfo[]): void;
    config(v: Record<string, unknown>): void;
    event(topic: string, payload?: unknown): void;
    goto(path: string): void;
    visibility(visible: boolean): void;
  };
  /** L'agent IA appelle un outil déclaré par l'app. */
  invokeTool(name: string, args?: Record<string, unknown>): Promise<unknown>;
  destroy(): void;
}

function watchable<T>(initial: T) {
  let value = initial;
  const subs = new Set<(v: T) => void>();
  return {
    get: () => value,
    subscribe: (cb: (v: T) => void) => (subs.add(cb), () => void subs.delete(cb)),
    set: (v: T) => {
      value = v;
      subs.forEach((s) => s(v));
    },
  };
}

/**
 * Hôte EGEN de test, en mémoire : un vrai `HostConnection` (mêmes grants, mêmes refus, même dispatch fermé que le Core)
 * relié à votre app par de fausses fenêtres et un vrai `MessageChannel`. Aucun navigateur, aucun Core.
 *
 * ```ts
 * const sim = createTestHost({ locale: 'fr', tenant: { id: 'acme' } });
 * const egen = await connectToEgen({ ...sim.connectOptions, capabilities: ['locale', 'tenant'] });
 * ```
 */
export function createTestHost(o: TestHostOptions = {}): TestHost {
  const moduleName = o.moduleName ?? '@acme/esm-test-app';
  const origin = o.origin ?? 'https://shell.test';
  const calls: CallRecord[] = [];
  const notifications: TestHost['notifications'] = [];
  const published: TestHost['published'] = [];
  const tools = new Map<string, { description: string }>();
  const toolInvokers = new Map<string, (name: string, args: Record<string, unknown>) => Promise<unknown>>();
  const log = (cap: string, method: string, ...args: unknown[]) => void calls.push({ cap, method, args });

  const tenant = watchable(o.tenant ?? { id: null });
  const locale = watchable(o.locale ?? 'fr');
  const extList = new Map<string, ExtensionInfo[]>(Object.entries(o.extensions ?? {}));
  const extSubs = new Map<string, Set<(l: ExtensionInfo[]) => void>>();
  const config = watchable(o.config ?? {});
  const flagSubs = new Set<() => void>();
  const eventSubs = new Map<string, Set<(p: unknown) => void>>();
  const channel = createBus();

  const wrapWatch = <T,>(cap: string, w: ReturnType<typeof watchable<T>>) => ({
    get: () => {
      log(cap, 'get');
      return w.get();
    },
    subscribe: w.subscribe,
  });

  const providers: HostProviders = {
    tenant: wrapWatch('tenant', tenant),
    locale: wrapWatch('locale', locale),
    config: wrapWatch('config', config),
    flags: {
      isEnabled: (n) => {
        log('flags', 'isEnabled', n);
        return !!o.flags?.[n];
      },
      subscribe: (cb) => (flagSubs.add(cb), () => void flagSubs.delete(cb)),
    },
    extensions: {
      list: (slot) => {
        log('extensions', 'list', slot);
        return extList.get(slot) ?? [];
      },
      subscribe: (slot, cb) => {
        let set = extSubs.get(slot);
        if (!set) extSubs.set(slot, (set = new Set()));
        set.add(cb);
        return () => void set!.delete(cb);
      },
    },
    events: {
      publish: (topic, payload, ctx) => {
        log('events', 'publish', topic, payload);
        published.push({ topic, payload, from: ctx.moduleName });
      },
      subscribe: (topic, cb) => {
        let set = eventSubs.get(topic);
        if (!set) eventSubs.set(topic, (set = new Set()));
        set.add(cb);
        return () => void set!.delete(cb);
      },
    },
    notifications: {
      show: (n) => {
        log('notifications', 'show', n);
        notifications.push(n);
      },
    },
    dialogs: {
      confirm: (d) => {
        log('dialogs', 'confirm', d);
        return typeof o.confirm === 'function' ? o.confirm(d) : (o.confirm ?? true);
      },
    },
    telemetry: { log: (l, m, c) => log('telemetry', 'log', l, m, c), metric: (n, v, t) => log('telemetry', 'metric', n, v, t) },
    aiTools: {
      register: (_m, list, invoke) => {
        log('ai-tools', 'register', list.map((t) => t.name));
        for (const t of list) {
          tools.set(t.name, { description: t.description });
          toolInvokers.set(t.name, invoke);
        }
      },
      unregister: (_m, names) => {
        for (const n of names) {
          tools.delete(n);
          toolInvokers.delete(n);
        }
      },
    },
  };

  const appWindow = new EventTarget();
  const hostWindow: { postMessage(message: unknown, targetOrigin: string): void } = {
    postMessage: (message) => void queueMicrotask(() => connection.handle(message)),
  };
  const connection: HostConnection = new HostConnection({
    moduleName,
    grants: effectiveGrants(o.manifestCapabilities, o.approved ?? {}),
    providers,
    controls: {
      channel,
      report: (p) => log('navigation', 'report', p),
      navigate: (t) => log('navigation', 'navigate', t),
      setTitle: (t) => log('navigation', 'setTitle', t),
      resize: (h) => log('navigation', 'resize', h),
      onReady: () => log('lifecycle', 'ready'),
    },
    limits: { pingIntervalMs: 0 },
    post: (message, transfer) => {
      const ev: any = new Event('message');
      ev.data = message;
      ev.origin = origin;
      ev.source = hostWindow;
      ev.ports = transfer ?? [];
      queueMicrotask(() => appWindow.dispatchEvent(ev));
    },
  });

  return {
    connectOptions: { moduleName, hostOrigins: [origin], window: appWindow as any, host: hostWindow as any, timeoutMs: 500 },
    connection,
    calls,
    notifications,
    published,
    tools,
    emit: {
      tenant: (v) => tenant.set(v),
      locale: (v) => locale.set(v),
      extensions: (slot, list) => {
        extList.set(slot, list);
        extSubs.get(slot)?.forEach((cb) => cb(list));
      },
      config: (v) => config.set(v),
      event: (topic, payload) => eventSubs.get(topic)?.forEach((cb) => cb(payload)),
      goto: (path) => channel.emit('goto', { path, seq: Date.now() }),
      visibility: (v) => channel.emit('visibility', v),
    },
    invokeTool: async (name, args = {}) => {
      const inv = toolInvokers.get(name);
      if (!inv) throw new Error(`Outil non enregistré : ${name}`);
      return inv(name, args);
    },
    destroy: () => connection.destroy(),
  };
}
