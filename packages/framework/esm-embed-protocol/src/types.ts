import type { ErrorCode } from './constants.js';
import type { WireError } from './errors.js';
import type { IframeRights } from './iframe.js';

export type CapabilityId =
  | 'tenant'
  | 'locale'
  | 'navigation'
  | 'events'
  | 'notifications'
  | 'dialogs'
  | 'flags'
  | 'config'
  | 'telemetry'
  | 'extensions'
  | 'lifecycle';

/** Configuration d'un grant (ex. `{ publish: [...] }` pour `events`). Objet simple, valeurs clonables. */
export type GrantConfig = Record<string, unknown>;

export interface CapabilityRequest {
  id: string;
  version: number;
}

export interface CapabilityDenied {
  id: string;
  reason: 'UNKNOWN' | 'VERSION' | 'NOT_APPROVED' | 'UNAVAILABLE';
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

/** L'app, chargée après l'événement `load` de l'iframe, demande à l'hôte de renvoyer `hello`. */
export interface ProbeMessage {
  kind: 'probe';
}

export type HandshakeMessage = HelloMessage | ConnectMessage | PortMessage | ProbeMessage;

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

/* ───────── Déclaration de l'app (egen-config.json) ───────── */

export type EmbedTechnology = 'nextjs' | 'react' | 'vue' | 'angular' | 'static' | 'other';
export type NavigationMode = 'none' | 'history' | 'hash';

/**
 * Contribution d'une app embarquée à un slot d'extension du Core (apps internes ou framework).
 * Rendue par le Core : `view` absent → contribution déclarative (seule `meta` est lue par le slot, ex. entrée de navigation) ;
 * `view` présent → le Core affiche cette page de l'app dans une iframe dédiée à l'intérieur du slot.
 */
export interface EmbedExtensionDecl {
  /** Nom unique dans l'app (`[a-z0-9-]`). */
  name: string;
  /** Slot cible (ex. `topbar-nav-slot`, `shell-rail-left-slot`, un slot d'une app interne). Soumis à l'approbation de l'opérateur. */
  slot: string;
  /** Chemin interne de l'app affiché dans le slot (`/_egen/chip`). */
  view?: string;
  order?: number;
  /** Privilèges EGEN requis pour afficher la contribution (appliqués par le Core, qui reste l'autorité d'affichage). */
  privileges?: string[];
  featureFlag?: string;
  /** Données lues par le slot (≤ 4 Ko). `iconUrl` doit être https de la même origine que l'app. */
  meta?: Record<string, unknown>;
  /** Hauteur initiale (px) de la vue ; l'app peut la modifier via `navigation.resize`. */
  height?: number;
}

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
  /** Composants que l'app contribue aux slots du Core. */
  extensions?: EmbedExtensionDecl[];
  /** Droits d'iframe demandés (`sandbox`, `allow`) ; effectifs uniquement s'ils sont approuvés par l'opérateur (doc 17 §7 bis). */
  iframe?: IframeRights;
  /** Configuration publique de l'app servie par la capacité `config` (≤ 8 Ko, rien de secret). */
  config?: Record<string, unknown>;
}
