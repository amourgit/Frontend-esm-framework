import type { CapabilityName } from '@egen-civitas/esm-globals';
import { PlatformError, type PlatformErrorCode } from '../errors.js';
import type { PlatformEnvironment, Unsubscribe } from '../types.js';
import {
  DEFAULT_TIMEOUT_MS,
  HOST_PROTOCOL_NAME,
  KNOWN_CAPABILITIES,
  KNOWN_ERROR_CODES,
  MAX_MESSAGE_LENGTH,
  SUPPORTED_PROTOCOL,
  isSupportedProtocolVersion,
  parseHostMessage,
  type HostBridge,
  type HostFailure,
  type HostMessage,
  type HostRequest,
} from './protocol.js';

/** Ce que le Host annonce lors du handshake (contenu validé par le client). */
export interface HostInfo {
  /** Version du protocole retenue par le Host. */
  protocol: number;
  /** Version de l'application hôte. */
  host: string;
  platform: PlatformEnvironment;
  /** Capacités que le Host accepte de servir (le Host contrôle ce qui est accessible). */
  capabilities: Partial<Record<CapabilityName, { v: number }>>;
}

export interface BridgeClientOptions {
  bridge: HostBridge;
  /** Cible de ce build : le Host doit annoncer la même plateforme. */
  environment: PlatformEnvironment;
  /** Version du framework, transmise au Host dans le `hello`. */
  framework?: string;
  /** Délai par défaut avant `TIMEOUT`. @default 30000 */
  timeoutMs?: number;
}

export interface CallOptions {
  /** Remplace le délai par défaut pour cet appel. */
  timeoutMs?: number;
}

export interface BridgeClient {
  /** Handshake obligatoire (règle 1 du protocole). Mémorisé : les appels suivants retournent le même résultat. */
  hello(): Promise<HostInfo>;
  /** Appelle une méthode d'une capacité. Rejette avec `PlatformError` ; exige un handshake réussi. */
  call<T = unknown>(namespace: string, method: string, args?: unknown, options?: CallOptions): Promise<T>;
  /** S'abonne à un événement du Host (ex. `lifecycle.resume`). */
  onEvent(name: string, callback: (data: unknown) => void): Unsubscribe;
  /** `null` tant que le handshake n'a pas réussi. */
  readonly hostInfo: HostInfo | null;
  /** Compteurs de diagnostic : messages ignorés (invalides, orphelins, version inconnue) et appels en vol. */
  stats(): { ignoredMessages: number; inFlight: number };
}

interface Pending {
  namespace: string;
  method: string;
  resolve: (value: unknown) => void;
  reject: (error: PlatformError) => void;
  timer: ReturnType<typeof setTimeout>;
}

const NAME_PATTERN = /^[A-Za-z][A-Za-z0-9]*$/;
const MAX_ERROR_MESSAGE_LENGTH = 500;

/**
 * Client du protocole Host v1 (côté Shell). Sécurité : aucune évaluation dynamique, seuls les champs attendus sont
 * lus, tout message invalide / orphelin / de version inconnue est ignoré et compté, jamais exécuté.
 */
export function createBridgeClient(options: BridgeClientOptions): BridgeClient {
  const { bridge, environment, framework, timeoutMs: defaultTimeoutMs = DEFAULT_TIMEOUT_MS } = options;
  const pending = new Map<string, Pending>();
  const listeners = new Map<string, Set<(data: unknown) => void>>();
  let info: HostInfo | null = null;
  let helloPromise: Promise<HostInfo> | null = null;
  let ignored = 0;
  let counter = 0;

  const nextId = (): string => {
    for (;;) {
      const id =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now().toString(36)}-${(counter++).toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      if (!pending.has(id)) {
        return id;
      }
    }
  };

  function toPlatformError(failure: HostFailure, namespace: string, method: string): PlatformError {
    const { code, message, retryable } = failure.e;
    const known = typeof code === 'string' && KNOWN_ERROR_CODES.has(code);
    const text =
      typeof message === 'string' && message.length > 0
        ? message.slice(0, MAX_ERROR_MESSAGE_LENGTH)
        : `Le Host a refusé l'appel ${namespace}.${method}.`;
    return new PlatformError((known ? code : 'HOST_ERROR') as PlatformErrorCode, text, {
      retryable: retryable === true,
      capability: namespace,
      method,
    });
  }

  function handleIncoming(raw: unknown) {
    const message: HostMessage | null = parseHostMessage(raw);
    if (!message) {
      ignored++;
      return;
    }

    if ('ev' in message) {
      if (!isSupportedProtocolVersion(message.v)) {
        ignored++;
        return;
      }
      listeners.get(message.ev)?.forEach((callback) => {
        try {
          callback(message.d);
        } catch (error) {
          console.error(`[egen-platform] Un abonné de l'événement "${message.ev}" a levé une erreur :`, error);
        }
      });
      return;
    }

    const entry = pending.get(message.id);
    if (!entry) {
      ignored++; // réponse orpheline : id inconnu, déjà traitée ou expirée
      return;
    }
    pending.delete(message.id);
    clearTimeout(entry.timer);

    if (!isSupportedProtocolVersion(message.v)) {
      entry.reject(
        new PlatformError(
          'INCOMPATIBLE',
          `Le Host répond avec la version de protocole ${String(message.v)}, non supportée.`,
          {
            capability: entry.namespace,
            method: entry.method,
          },
        ),
      );
      return;
    }

    if (message.ok) {
      entry.resolve(message.r);
    } else {
      entry.reject(toPlatformError(message, entry.namespace, entry.method));
    }
  }

  bridge.subscribe(handleIncoming);

  function request(
    namespace: string,
    method: string,
    args: unknown,
    version: number,
    timeoutMs: number,
  ): Promise<unknown> {
    const reject = (code: PlatformErrorCode, message: string) =>
      Promise.reject(new PlatformError(code, message, { capability: namespace, method }));

    if (!NAME_PATTERN.test(namespace) || !NAME_PATTERN.test(method)) {
      return reject('INVALID_ARGS', `Nom d'appel invalide : "${namespace}.${method}".`);
    }

    const id = nextId();
    const envelope: HostRequest = { p: HOST_PROTOCOL_NAME, v: version, id, ns: namespace, m: method };
    if (args !== undefined) {
      envelope.a = args;
    }

    let json: string;
    try {
      json = JSON.stringify(envelope);
    } catch {
      return reject('INVALID_ARGS', `Les arguments de ${namespace}.${method} ne sont pas sérialisables en JSON.`);
    }
    if (json.length > MAX_MESSAGE_LENGTH) {
      return reject(
        'INVALID_ARGS',
        `Message trop volumineux pour ${namespace}.${method} (${json.length} caractères, maximum ${MAX_MESSAGE_LENGTH}) : utiliser une référence de fichier.`,
      );
    }

    return new Promise<unknown>((resolve, rejectPromise) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        rejectPromise(
          new PlatformError('TIMEOUT', `Le Host n'a pas répondu à ${namespace}.${method} en ${timeoutMs} ms.`, {
            retryable: true,
            capability: namespace,
            method,
          }),
        );
      }, timeoutMs);
      pending.set(id, { namespace, method, resolve, reject: rejectPromise, timer });

      try {
        bridge.send(json);
      } catch (error) {
        pending.delete(id);
        clearTimeout(timer);
        rejectPromise(
          new PlatformError(
            'HOST_ERROR',
            `Échec de l'envoi au Host : ${error instanceof Error ? error.message : String(error)}`,
            {
              capability: namespace,
              method,
            },
          ),
        );
      }
    });
  }

  function parseHelloResult(result: unknown): HostInfo {
    const incompatible = (reason: string) =>
      new PlatformError('INCOMPATIBLE', `Handshake refusé : ${reason}`, { capability: 'host', method: 'hello' });

    if (typeof result !== 'object' || result === null || Array.isArray(result)) {
      throw incompatible('réponse invalide.');
    }
    const value = result as Record<string, unknown>;

    if (!isSupportedProtocolVersion(value.protocol)) {
      throw incompatible(
        `le Host parle le protocole ${String(value.protocol)}, ce client supporte ${SUPPORTED_PROTOCOL.min}–${SUPPORTED_PROTOCOL.max}.`,
      );
    }
    if (value.platform !== environment) {
      throw incompatible(`le Host annonce la plateforme "${String(value.platform)}", ce build cible "${environment}".`);
    }
    if (typeof value.host !== 'string' || value.host.length === 0 || value.host.length > 64) {
      throw incompatible('version du Host absente ou invalide.');
    }

    const capabilities: HostInfo['capabilities'] = {};
    if (typeof value.capabilities === 'object' && value.capabilities !== null && !Array.isArray(value.capabilities)) {
      for (const [name, descriptor] of Object.entries(value.capabilities)) {
        const version = (descriptor as { v?: unknown } | null)?.v;
        // Capacité inconnue de ce client = ignorée (compatibilité ascendante) ; descripteur invalide = ignoré.
        if (KNOWN_CAPABILITIES.has(name) && Number.isInteger(version) && (version as number) >= 1) {
          capabilities[name as CapabilityName] = { v: version as number };
        }
      }
    }

    return { protocol: value.protocol, host: value.host, platform: environment, capabilities };
  }

  return {
    hello() {
      if (!helloPromise) {
        const attempt = request(
          'host',
          'hello',
          { protocol: { ...SUPPORTED_PROTOCOL }, ...(framework ? { framework } : {}) },
          SUPPORTED_PROTOCOL.max,
          defaultTimeoutMs,
        ).then((result) => {
          info = parseHelloResult(result);
          return info;
        });
        helloPromise = attempt;
        attempt.catch((error: unknown) => {
          // Un échec passager (timeout, envoi) peut être retenté ; une incompatibilité est définitive.
          if (error instanceof PlatformError && error.retryable && helloPromise === attempt) {
            helloPromise = null;
          }
        });
      }
      return helloPromise;
    },

    call<T = unknown>(namespace: string, method: string, args?: unknown, callOptions: CallOptions = {}): Promise<T> {
      if (namespace === 'host') {
        return Promise.reject(
          new PlatformError('INVALID_ARGS', 'Le namespace "host" est réservé au handshake.', { method }),
        );
      }
      if (!NAME_PATTERN.test(namespace) || !NAME_PATTERN.test(method)) {
        return Promise.reject(
          new PlatformError('INVALID_ARGS', `Nom d'appel invalide : "${namespace}.${method}".`, {
            capability: namespace,
            method,
          }),
        );
      }
      if (!info) {
        return Promise.reject(
          new PlatformError(
            'INCOMPATIBLE',
            `Appel ${namespace}.${method} refusé : le handshake avec le Host n'est pas terminé.`,
            {
              capability: namespace,
              method,
            },
          ),
        );
      }
      if (!info.capabilities[namespace as CapabilityName]) {
        return Promise.reject(
          new PlatformError('UNAVAILABLE', `Le Host n'annonce pas la capacité "${namespace}".`, {
            capability: namespace,
            method,
          }),
        );
      }
      return request(namespace, method, args, info.protocol, callOptions.timeoutMs ?? defaultTimeoutMs) as Promise<T>;
    },

    onEvent(name, callback) {
      let set = listeners.get(name);
      if (!set) {
        set = new Set();
        listeners.set(name, set);
      }
      set.add(callback);
      return () => {
        set.delete(callback);
      };
    },

    get hostInfo() {
      return info;
    },

    stats() {
      return { ignoredMessages: ignored, inFlight: pending.size };
    },
  };
}
