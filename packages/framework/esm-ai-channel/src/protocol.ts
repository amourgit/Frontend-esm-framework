// =============================================================================
//  @egen-civitas/esm-ai-channel — Protocole du canal frontend ↔ backend IA
//
//  Un seul canal WebSocket, des enveloppes JSON versionnées. Le frontend n'est
//  qu'une interface : il provisionne au backend le catalogue de ses tools,
//  pousse son contexte, relaie les entrées utilisateur (texte / audio) et
//  exécute les appels de tools que le backend lui envoie.
//
//  Spécification complète : voir README.md du paquet.
// =============================================================================

export const PROTOCOL_VERSION = 1;
export const PROTOCOL_SUBPROTOCOL = 'egen-ai.v1';

/** Enveloppe commune à tous les messages, dans les deux sens. */
export interface Envelope<TType extends string = string, TPayload = unknown> {
  /** Version du protocole */
  v: number;
  /** Identifiant unique du message (généré par l'émetteur) */
  id: string;
  type: TType;
  /** Horodatage d'émission (ms epoch) */
  ts: number;
  /** Identifiant du message auquel celui-ci répond (corrélation requête/réponse, flux) */
  replyTo?: string;
  payload: TPayload;
}

// ─── Descripteur de tool provisionné ─────────────────────────────────────────

export interface ToolDescriptorPayload {
  id: string;
  name: string;
  description: string;
  parameters: { type: 'object'; properties: Record<string, unknown>; required: string[] };
  requiredPrivileges: string[];
  moduleName: string;
  metadata?: Record<string, unknown>;
}

// ─── Client → Serveur ────────────────────────────────────────────────────────

export interface ClientPayloadMap {
  /** Premier message après l'ouverture du socket */
  'session.hello': {
    clientId: string;
    protocol: number;
    locale?: string;
    capabilities: string[];
    resumeSessionId?: string;
  };
  /** Catalogue COMPLET des tools frontend autorisés pour l'utilisateur courant */
  'tools.sync': { revision: number; tools: ToolDescriptorPayload[] };
  /** Modifications incrémentales du catalogue */
  'tools.delta': { revision: number; upsert: ToolDescriptorPayload[]; removed: string[] };
  /** Résultat d'un `tool.call` */
  'tool.result': {
    callId: string;
    success: boolean;
    data?: unknown;
    error?: string;
    durationMs: number;
  };
  /** Instantané du contexte EGEN (utilisateur, tenant, navigation, écran, routes…) */
  'context.update': { revision: number; context: unknown; truncated: boolean; size: number };
  /** Message texte de l'utilisateur — ouvre un flux de réponse (replyTo = id de ce message) */
  'conversation.message': { text: string; mode?: string };
  /** Message vocal de l'utilisateur (énoncé complet encodé en base64) */
  'conversation.audio': { base64Audio: string; mimeType: string; mode?: string; transcriptHint?: string };
  /** Interrompt le flux en cours */
  'conversation.cancel': { streamId: string };
  /** Demande l'historique de la conversation courante */
  'conversation.history.request': Record<string, never>;
  /** Demande de synthèse vocale — réponse `speech.audio` */
  'speech.request': { text: string; voice?: string };
  ping: { t: number };
}

// ─── Serveur → Client ────────────────────────────────────────────────────────

export interface HistoryMessagePayload {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'audio';
  timestamp?: string;
  mode?: string;
  transcript?: string;
}

export interface ServerPayloadMap {
  'session.welcome': { sessionId: string; protocol: number; heartbeatMs?: number };
  /** Le backend demande un renvoi complet du catalogue (désynchronisation) */
  'tools.request_sync': Record<string, never>;
  'tools.ack': { revision: number };
  /** Le backend demande l'exécution d'un tool frontend */
  'tool.call': {
    callId: string;
    tool: string;
    arguments: Record<string, unknown>;
    timeoutMs?: number;
    /** Flux de conversation à l'origine de l'appel (pour l'affichage) */
    streamId?: string;
  };
  'tool.cancel': { callId: string };
  'conversation.transcript': { text: string };
  'conversation.delta': { text: string };
  /** Fragment audio PCM 16 bits LE mono encodé en base64 (lecture en direct) */
  'conversation.audio_chunk': { base64: string; seq: number; sampleRate?: number; final?: boolean };
  'conversation.end': { text?: string };
  'conversation.error': { message: string; code?: string };
  'conversation.history': { messages: HistoryMessagePayload[] };
  'speech.audio': { audioBase64: string | null; error?: string };
  error: { message: string; code?: string };
  pong: { t: number };
}

export type ClientMessageType = keyof ClientPayloadMap;
export type ServerMessageType = keyof ServerPayloadMap;

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _counter = 0;
export function newMessageId(prefix = 'm'): string {
  _counter = (_counter + 1) % 1_000_000;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${_counter.toString(36)}-${rand}`;
}

export function createEnvelope<T extends string, P>(
  type: T,
  payload: P,
  options: { id?: string; replyTo?: string } = {},
): Envelope<T, P> {
  return {
    v: PROTOCOL_VERSION,
    id: options.id ?? newMessageId(),
    type,
    ts: Date.now(),
    ...(options.replyTo ? { replyTo: options.replyTo } : {}),
    payload,
  };
}

/** Parse et valide une trame entrante. Retourne null si elle n'est pas une enveloppe valide. */
export function parseEnvelope(raw: unknown): Envelope | null {
  if (typeof raw !== 'string') return null;
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    if (typeof data.type !== 'string' || typeof data.id !== 'string') return null;
    return {
      v: typeof data.v === 'number' ? data.v : PROTOCOL_VERSION,
      id: data.id,
      type: data.type,
      ts: typeof data.ts === 'number' ? data.ts : Date.now(),
      ...(typeof data.replyTo === 'string' ? { replyTo: data.replyTo } : {}),
      payload: data.payload ?? {},
    };
  } catch {
    return null;
  }
}
