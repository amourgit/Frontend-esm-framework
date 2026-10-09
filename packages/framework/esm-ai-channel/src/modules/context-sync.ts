// =============================================================================
//  Module — Synchronisation du contexte EGEN vers le backend IA
//
//  Le backend n'a pas à le redemander à chaque message : le frontend pousse un
//  instantané (`context.update`) à la connexion puis à chaque changement
//  significatif (utilisateur, tenant, route, écran, catalogues de routes /
//  actions UI / observables…), avec debounce et déduplication.
// =============================================================================

import { aiContextStore, subscribeToAIContext } from '@egen-civitas/esm-ai-context';
import type { AIChannel, ChannelModule } from '../channel.js';

export interface ContextSyncOptions {
  debounceMs?: number;
  /** Source de l'instantané (défaut : store esm-ai-context) — injectable pour les tests */
  getSnapshot?: () => { contextJson: string; truncated: boolean; size: number };
  subscribe?: (listener: () => void) => () => void;
}

export function createContextSync(options: ContextSyncOptions = {}): ChannelModule {
  const debounceMs = options.debounceMs ?? 300;
  const getSnapshot =
    options.getSnapshot ??
    (() => {
      const s = aiContextStore.getState();
      return { contextJson: s.contextJson, truncated: s.truncated, size: s.contextSize };
    });
  const subscribe = options.subscribe ?? ((l) => subscribeToAIContext(() => l()));

  return {
    name: 'context-sync',
    attach(channel: AIChannel) {
      let revision = 0;
      let lastSent: string | null = null;
      let timer: ReturnType<typeof setTimeout> | null = null;

      const push = (force: boolean) => {
        if (!channel.isReady) return;
        const { contextJson, truncated, size } = getSnapshot();
        if (!force && contextJson === lastSent) return;
        let context: unknown;
        try {
          context = JSON.parse(contextJson);
        } catch {
          return;
        }
        lastSent = contextJson;
        revision++;
        try {
          channel.send('context.update', { revision, context, truncated, size });
        } catch {
          // canal coupé : renvoyé à la reconnexion
        }
      };

      const schedule = () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          timer = null;
          push(false);
        }, debounceMs);
      };

      const unsubs = [channel.onReady(() => push(true)), subscribe(schedule)];
      return () => {
        if (timer) clearTimeout(timer);
        unsubs.forEach((u) => u());
      };
    },
  };
}
