import type { ErrorCode } from './constants.js';
import type { WireError } from './errors.js';

export type CapabilityId =
  | 'session'
  | 'tenant'
  | 'locale'
  | 'theme'
  | 'permissions'
  | 'navigation'
  | 'events'
  | 'notifications'
  | 'dialogs'
  | 'api'
  | 'flags'
  | 'config'
  | 'telemetry'
  | 'ai-tools'
  | 'lifecycle';

/** Configuration d'un grant (ex. `{ fields: [...] }` pour `session`). Objet simple, valeurs clonables. */
export type GrantConfig = Record<string, unknown>;

export interface CapabilityRequest {
  id: string;
  version: number;
}

export interface CapabilityDenied {
  id: string;
  reason: 'UNKNOWN' | 'VERSION' | 'NOT_APPROVED';
}

export interface CapabilityGranted {
  id: CapabilityId;
  version: number;
  config: GrantConfig;
}

/* ───────── Poignée de main (window.postMessage) ───────── */

export interface Envelope<T> {
  egen: number;
  moduleName: string;
  message: T;
}

export interface HelloMessage {
  kind: 'hello';
  nonce: string;
  protocols: number[];
  hostVersion?: string;
}

export interface ConnectMessage {
  kind: 'connect';
  nonce: string;
  protocol: number;
  sdk?: string;
  requested: CapabilityRequest[];
}

export interface PortMessage {
  kind: 'port';
  nonce: string;
  protocol: number;
  granted: CapabilityGranted[];
  denied: CapabilityDenied[];
  hostVersion?: string;
}

export type HandshakeMessage = HelloMessage | ConnectMessage | PortMessage;

/* ───────── RPC (MessagePort) ───────── */

export type RpcMessage =
  | { t: 'req'; id: number; cap: string; m: string; a: unknown[] }
  | { t: 'res'; id: number; ok: true; v?: unknown }
  | { t: 'res'; id: number; ok: false; e: WireError }
  | { t: 'sub'; id: number; cap: string; ev: string }
  | { t: 'unsub'; sid: number }
  | { t: 'evt'; sid: number; v?: unknown }
  | { t: 'ping' }
  | { t: 'pong' }
  | { t: 'bye' };

export type { ErrorCode, WireError };

/* ───────── Manifeste (egen-app.json) ───────── */

export type EmbedTechnology = 'nextjs' | 'react' | 'vue' | 'angular' | 'static' | 'other';
export type NavigationMode = 'none' | 'history' | 'hash';

export interface EmbedManifest {
  manifestVersion: 1;
  name: string;
  version: string;
  title: string;
  url: string;
  route: string;
  technology: EmbedTechnology;
  navigation: { mode: NavigationMode; basePath?: string; sensitiveParams?: string[] };
  placement?: { rail?: 'left' | 'right' | 'bottom'; group?: string; icon?: string };
  capabilities: Partial<Record<CapabilityId, GrantConfig>>;
}
