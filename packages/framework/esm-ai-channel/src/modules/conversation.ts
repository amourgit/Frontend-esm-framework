// =============================================================================
//  Module — Conversation (texte, voix, synthèse vocale, historique)
//
//  Le frontend n'est qu'une interface : il envoie ce que l'utilisateur dit ou
//  écrit, restitue les flux de réponse (transcription, texte, audio) et
//  réhydrate l'historique tenu par le backend. Aucun prompt, aucune mémoire,
//  aucun historique n'est conservé ni envoyé côté frontend.
// =============================================================================

import type { AIChannel, ChannelModule } from '../channel.js';
import type { Envelope, HistoryMessagePayload, ServerPayloadMap } from '../protocol.js';

export interface ConversationStreamHandlers {
  /** Transcription de l'énoncé vocal de l'utilisateur */
  onTranscript?: (text: string) => void;
  /** Fragment de texte de la réponse */
  onDelta?: (text: string) => void;
  /** Fragment audio PCM 16 bits LE mono (base64) à lire en direct */
  onAudioChunk?: (chunk: ServerPayloadMap['conversation.audio_chunk']) => void;
  /** Identifiant du flux, connu dès l'envoi (permet d'associer les appels de tools) */
  onStreamId?: (streamId: string) => void;
  signal?: AbortSignal;
}

export interface ConversationResult {
  streamId: string;
  text: string;
  transcript: string;
}

export interface ConversationClient extends ChannelModule {
  sendText(text: string, options?: { mode?: string } & ConversationStreamHandlers): Promise<ConversationResult>;
  sendAudio(
    audio: { base64Audio: string; mimeType: string; transcriptHint?: string },
    options?: { mode?: string } & ConversationStreamHandlers,
  ): Promise<ConversationResult>;
  /** Synthèse vocale complète (PCM base64) ; null si le backend n'en fournit pas. */
  requestSpeech(text: string, voice?: string): Promise<string | null>;
  /** Historique de la conversation courante tenu par le backend. */
  fetchHistory(timeoutMs?: number): Promise<HistoryMessagePayload[]>;
  /** Efface la conversation côté backend (livré à la reconnexion si le canal est coupé). */
  reset(): void;
  /** Historique poussé spontanément par le backend (reprise de session, autre onglet…). */
  onHistory(listener: (messages: HistoryMessagePayload[]) => void): () => void;
}

const STREAM_TERMINAL = ['conversation.end'];
const STREAM_ERRORS = ['conversation.error'];

export function createConversationClient(): ConversationClient {
  let channelRef: AIChannel | null = null;
  const historyListeners = new Set<(m: HistoryMessagePayload[]) => void>();

  const requireChannel = (): AIChannel => {
    if (!channelRef) throw new Error('[EGEN AI Channel] Module conversation non attaché.');
    return channelRef;
  };

  async function run(
    type: 'conversation.message' | 'conversation.audio',
    payload: any,
    handlers: ConversationStreamHandlers,
  ): Promise<ConversationResult> {
    const channel = requireChannel();
    let text = '';
    let transcript = '';
    const onMessage = (env: Envelope) => {
      const p = env.payload as any;
      switch (env.type) {
        case 'conversation.transcript':
          transcript = p.text ?? transcript;
          handlers.onTranscript?.(transcript);
          break;
        case 'conversation.delta':
          if (p.text) {
            text += p.text;
            handlers.onDelta?.(p.text);
          }
          break;
        case 'conversation.audio_chunk':
          handlers.onAudioChunk?.(p);
          break;
        case 'conversation.end':
          if (!text && typeof p.text === 'string') text = p.text;
          break;
      }
    };
    const stream = channel.openStream(type, payload, {
      terminal: STREAM_TERMINAL,
      errorTypes: STREAM_ERRORS,
      onMessage,
      signal: handlers.signal,
    });
    handlers.onStreamId?.(stream.id);
    await stream.done;
    return { streamId: stream.id, text, transcript };
  }

  return {
    name: 'conversation',
    attach(channel) {
      channelRef = channel;
      const off = channel.on('conversation.history', ({ messages }) => {
        // Réponse à une requête : routée par `request` ; poussée spontanée : diffusée ici.
        historyListeners.forEach((l) => l(messages ?? []));
      });
      return () => {
        off();
        channelRef = null;
      };
    },
    sendText: (text, { mode, ...handlers } = {}) => run('conversation.message', { text, mode }, handlers),
    sendAudio: (audio, { mode, ...handlers } = {}) =>
      run('conversation.audio', { ...audio, mode }, handlers),
    async requestSpeech(text, voice) {
      const env = await requireChannel().request<'speech.request', ServerPayloadMap['speech.audio']>('speech.request', {
        text,
        voice,
      });
      return env.payload.audioBase64 ?? null;
    },
    async fetchHistory(timeoutMs) {
      const env = await requireChannel().request<'conversation.history.request', ServerPayloadMap['conversation.history']>(
        'conversation.history.request',
        {},
        { timeoutMs },
      );
      return env.payload.messages ?? [];
    },
    reset() {
      requireChannel().send('conversation.reset', {}, { reliable: true });
    },
    onHistory(listener) {
      historyListeners.add(listener);
      return () => historyListeners.delete(listener);
    },
  };
}
