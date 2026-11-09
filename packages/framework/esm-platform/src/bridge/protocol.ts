import type { PlatformErrorCode } from '../errors.js';

/**
 * Protocole Host ↔ Shell, version 1 — voir docs/EGEN-FRAMEWORK-DEV.md, annexe 1.
 * Transport : chaînes JSON UTF-8 via `window.egenHostBridge`.
 */

/** Valeur du champ `p` de chaque message : tout message sans elle est ignoré. */
export const HOST_PROTOCOL_NAME = 'egen-host';

/** Versions du protocole que CE client sait parler. Un Host hors de cette plage est `INCOMPATIBLE`. */
export const SUPPORTED_PROTOCOL = { min: 1, max: 1 } as const;

/**
 * Taille maximale d'un message JSON, en caractères (proposition de la doc, à valider sur appareil). Au-delà, le Host
 * doit fournir une référence de fichier (`FileHandle`) plutôt qu'un binaire inline.
 */
export const MAX_MESSAGE_LENGTH = 256 * 1024;

/** Délai par défaut d'un appel avant `TIMEOUT`. */
export const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Contrat de pont que le Host injecte AVANT tout script de la page : `window.egenHostBridge`.
 * Le framework ne connaît rien d'autre du natif (règles R2 / N2).
 */
export interface HostBridge {
  /** web → host : un message JSON. */
  send(json: string): void;
  /** host → web : le Host appelle `callback` avec un message JSON. Appelé UNE fois par le client. */
  subscribe(callback: (json: string) => void): void;
}

export interface HostRequest {
  p: typeof HOST_PROTOCOL_NAME;
  v: number;
  id: string;
  ns: string;
  m: string;
  a?: unknown;
}

export interface HostSuccess {
  p: typeof HOST_PROTOCOL_NAME;
  v: number;
  id: string;
  ok: true;
  r?: unknown;
}

export interface HostFailure {
  p: typeof HOST_PROTOCOL_NAME;
  v: number;
  id: string;
  ok: false;
  /** Contenu NON fiable : validé par le client avant d'être converti en `PlatformError`. */
  e: { code?: unknown; message?: unknown; retryable?: unknown };
}

export interface HostEvent {
  p: typeof HOST_PROTOCOL_NAME;
  v: number;
  ev: string;
  d?: unknown;
}

export type HostMessage = HostSuccess | HostFailure | HostEvent;

export const KNOWN_ERROR_CODES: ReadonlySet<string> = new Set<PlatformErrorCode>([
  'UNAVAILABLE',
  'DENIED',
  'CANCELLED',
  'INVALID_ARGS',
  'TIMEOUT',
  'INCOMPATIBLE',
  'HOST_ERROR',
]);

export function isSupportedProtocolVersion(version: unknown): version is number {
  return (
    Number.isInteger(version) &&
    (version as number) >= SUPPORTED_PROTOCOL.min &&
    (version as number) <= SUPPORTED_PROTOCOL.max
  );
}

/**
 * Décode un message du Host. Retourne `null` pour tout ce qui n'est pas un message du protocole : entrée non
 * textuelle, trop longue, JSON invalide, autre valeur de `p`, forme inconnue. Ne lève JAMAIS et n'évalue rien.
 *
 * Le champ `v` n'est PAS filtré ici : le client doit pouvoir répondre « incompatible » à un appel en attente plutôt
 * que de le laisser expirer.
 */
export function parseHostMessage(raw: unknown): HostMessage | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > MAX_MESSAGE_LENGTH) {
    return null;
  }

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  const message = value as Record<string, unknown>;
  if (message.p !== HOST_PROTOCOL_NAME || typeof message.v !== 'number') {
    return null;
  }

  if (typeof message.id === 'string' && typeof message.ok === 'boolean') {
    if (message.ok) {
      return { p: HOST_PROTOCOL_NAME, v: message.v, id: message.id, ok: true, r: message.r };
    }
    const e = typeof message.e === 'object' && message.e !== null && !Array.isArray(message.e) ? message.e : {};
    return { p: HOST_PROTOCOL_NAME, v: message.v, id: message.id, ok: false, e };
  }

  if (typeof message.ev === 'string') {
    return { p: HOST_PROTOCOL_NAME, v: message.v, ev: message.ev, d: message.d };
  }

  return null;
}
