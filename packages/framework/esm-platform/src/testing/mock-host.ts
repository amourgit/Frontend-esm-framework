import type { CapabilityName } from '@egen-civitas/esm-globals';
import type { HostBridge } from '../bridge/protocol.js';
import type { PlatformEnvironment } from '../types.js';

export interface MockHostOptions {
  /** Version de protocole annoncée par le Host dans le `hello`. @default 1 */
  protocol?: number;
  /** Valeur du champ `v` des réponses (permet de simuler un Host qui répond dans une version inconnue). @default protocol */
  replyVersion?: number;
  /** Version de l'application hôte. @default '1.0.0-test' */
  host?: string;
  /** Plateforme annoncée. @default 'android' */
  platform?: PlatformEnvironment;
  /** Capacités annoncées dans le `hello`. @default {} */
  capabilities?: Partial<Record<CapabilityName, { v: number }>>;
  /** Remplace entièrement le résultat du `hello` (cas limites : réponse invalide…). */
  helloResult?: unknown;
  /** Méthodes servies, clé `namespace.méthode`. Retourner une valeur, ou lever (`code` de l'erreur repris). */
  handlers?: Record<string, (args: unknown) => unknown>;
  /** `false` : le Host ne répond jamais (tests de timeout). @default true */
  respond?: boolean;
  /** Latence de réponse en ms (0 = prochaine micro-tâche). @default 0 */
  latencyMs?: number;
}

export interface MockHost {
  /** Le pont à injecter : `window.egenHostBridge`. */
  readonly bridge: HostBridge;
  /** Requêtes décodées reçues par le Host, dans l'ordre. */
  readonly sent: Array<Record<string, unknown>>;
  /** Nombre d'appels à `subscribe`. */
  readonly subscribeCount: number;
  /** Pose `window.egenHostBridge`. */
  install(): void;
  /** Retire `window.egenHostBridge`. */
  uninstall(): void;
  /** host → web : émet un événement du protocole. */
  emit(event: string, data?: unknown): void;
  /** host → web : pousse une chaîne arbitraire (messages malformés, orphelins…). */
  inject(raw: string): void;
}

/**
 * Simule un Host natif (`window.egenHostBridge`) pour les tests : handshake automatique, méthodes programmables,
 * latence, silence, version de protocole incompatible. Aucun code natif : c'est le CONTRAT du protocole v1 (annexe 1
 * du document de développement) rejoué côté test.
 *
 * @category Platform
 */
export function createMockHost(options: MockHostOptions = {}): MockHost {
  const {
    protocol = 1,
    replyVersion = protocol,
    host = '1.0.0-test',
    platform = 'android',
    capabilities = {},
    handlers = {},
    respond = true,
    latencyMs = 0,
  } = options;

  let callback: ((json: string) => void) | null = null;
  let subscribeCount = 0;
  const sent: Array<Record<string, unknown>> = [];

  const deliver = (message: Record<string, unknown>) => {
    const json = JSON.stringify({ p: 'egen-host', v: replyVersion, ...message });
    const push = () => callback?.(json);
    if (latencyMs > 0) {
      setTimeout(push, latencyMs);
    } else {
      void Promise.resolve().then(push);
    }
  };

  const reply = async (request: Record<string, unknown>) => {
    const id = request.id;
    try {
      if (request.ns === 'host' && request.m === 'hello') {
        deliver({
          id,
          ok: true,
          r: 'helloResult' in options ? options.helloResult : { protocol, host, platform, capabilities },
        });
        return;
      }
      const handler = handlers[`${String(request.ns)}.${String(request.m)}`];
      if (!handler) {
        deliver({
          id,
          ok: false,
          e: { code: 'UNAVAILABLE', message: `Pas de handler pour ${String(request.ns)}.${String(request.m)}` },
        });
        return;
      }
      deliver({ id, ok: true, r: await handler(request.a) });
    } catch (error) {
      const code = (error as { code?: unknown } | null)?.code;
      deliver({
        id,
        ok: false,
        e: { code: code ?? 'HOST_ERROR', message: error instanceof Error ? error.message : String(error) },
      });
    }
  };

  const bridge: HostBridge = {
    send(json) {
      const request = JSON.parse(json) as Record<string, unknown>;
      sent.push(request);
      if (respond) {
        void reply(request);
      }
    },
    subscribe(cb) {
      callback = cb;
      subscribeCount++;
    },
  };

  return {
    bridge,
    sent,
    get subscribeCount() {
      return subscribeCount;
    },
    install() {
      (window as unknown as { egenHostBridge?: unknown }).egenHostBridge = bridge;
    },
    uninstall() {
      delete (window as unknown as { egenHostBridge?: unknown }).egenHostBridge;
    },
    emit(event, data) {
      callback?.(
        JSON.stringify({ p: 'egen-host', v: replyVersion, ev: event, ...(data === undefined ? {} : { d: data }) }),
      );
    },
    inject(raw) {
      callback?.(raw);
    },
  };
}
