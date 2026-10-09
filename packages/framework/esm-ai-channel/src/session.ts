// =============================================================================
//  @egen-civitas/esm-ai-channel — Session : assemblage du canal et des modules
// =============================================================================

import { getAIConfig } from '@egen-civitas/esm-ai-config';
import { AIChannel, type AIChannelOptions, type ChannelModule } from './channel.js';
import { resolveChannelUrl } from './url.js';
import {
  createContextSync,
  createConversationClient,
  createToolDispatcher,
  createToolsProvisioning,
  type ConversationClient,
  type ToolActivityListener,
  type ToolDispatcher,
} from './modules/index.js';
import { createChannelStore, type ChannelStore } from './state.js';

export interface StartAIChannelOptions extends Partial<Pick<AIChannelOptions, 'webSocketFactory' | 'random'>> {
  /** Modules supplémentaires (extensions) à brancher à côté des modules standard */
  modules?: ChannelModule[];
}

interface ActiveSession {
  channel: AIChannel;
  conversation: ConversationClient;
  dispatcher: ToolDispatcher;
}

let _session: ActiveSession | null = null;

/** Store exposé même quand aucun canal n'est actif (statut `idle` / `disabled`). */
const _fallbackStore: ChannelStore = createChannelStore();

export const CHANNEL_CAPABILITIES = ['tools', 'context', 'conversation', 'audio-in', 'audio-out'];

/**
 * Démarre le canal temps réel vers le backend IA et branche les modules standard :
 * provisionnement des tools, exécution des appels, synchronisation du contexte, conversation.
 * Sans effet si l'IA est désactivée ou si le canal est déjà démarré.
 */
export function startAIChannel(options: StartAIChannelOptions = {}): AIChannel | null {
  if (_session) return _session.channel;

  const config = getAIConfig();
  if (!config.enabled) {
    _fallbackStore.setState((s) => ({ ...s, status: 'disabled' }));
    return null;
  }

  const channel = new AIChannel({
    url: () => resolveChannelUrl(config.backend.channelUrl),
    heartbeatMs: config.backend.heartbeatMs,
    reconnectMinMs: config.backend.reconnectMinMs,
    reconnectMaxMs: config.backend.reconnectMaxMs,
    requestTimeoutMs: config.backend.requestTimeoutMs,
    locale: typeof navigator !== 'undefined' ? navigator.language : undefined,
    capabilities: CHANNEL_CAPABILITIES,
    webSocketFactory: options.webSocketFactory,
    random: options.random,
  });

  const conversation = createConversationClient();
  const dispatcher = createToolDispatcher();

  channel.use(createToolsProvisioning());
  channel.use(dispatcher);
  channel.use(createContextSync());
  channel.use(conversation);
  for (const module of options.modules ?? []) channel.use(module);

  _session = { channel, conversation, dispatcher };
  channel.start();
  return channel;
}

export function stopAIChannel(): void {
  if (!_session) return;
  _session.channel.stop();
  _session = null;
}

export function getAIChannel(): AIChannel | null {
  return _session?.channel ?? null;
}

/** Client de conversation (texte, voix, TTS, historique) — null si le canal n'est pas démarré. */
export function getConversationClient(): ConversationClient | null {
  return _session?.conversation ?? null;
}

/** Observe l'activité des tools frontend appelés par le backend (pour l'affichage). */
export function onToolActivity(listener: ToolActivityListener): () => void {
  if (!_session) return () => undefined;
  return _session.dispatcher.onActivity(listener);
}

export function getChannelStore(): ChannelStore {
  return _session?.channel.state ?? _fallbackStore;
}
