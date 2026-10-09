// =============================================================================
//  Module — Provisionnement des tools frontend vers le backend IA
//
//  Le backend doit connaître, à tout instant, les tools que CE frontend sait
//  exécuter (et que l'utilisateur courant a le droit d'exécuter) pour pouvoir
//  les appeler. Ce module :
//    • envoie le catalogue complet (`tools.sync`) à chaque (re)connexion ;
//    • envoie les différences (`tools.delta`) quand un microfrontend enregistre /
//      remplace / retire un tool, ou quand les privilèges de l'utilisateur changent ;
//    • renvoie le catalogue complet sur demande du backend (`tools.request_sync`).
// =============================================================================

import { getToolDescriptors, type AIToolDescriptor } from '@egen-civitas/esm-ai-tools';
import { subscribeToAIEvent, AI_EVENTS } from '@egen-civitas/esm-ai-events';
import { sessionStore } from '@egen-civitas/esm-api';
import type { AIChannel, ChannelModule } from '../channel.js';

export interface ToolsProvisioningOptions {
  /** Privilèges de l'utilisateur courant (défaut : session EGEN) */
  getPrivileges?: () => string[];
  /** Abonnement aux changements de privilèges (défaut : session EGEN) */
  subscribePrivileges?: (listener: () => void) => () => void;
  /** Source du catalogue (défaut : registre esm-ai-tools) */
  getDescriptors?: (privileges: string[]) => AIToolDescriptor[];
  /** Abonnement aux changements du registre (défaut : évènements esm-ai-events) */
  subscribeRegistry?: (listener: () => void) => () => void;
  debounceMs?: number;
}

function sessionPrivileges(): string[] {
  const state = sessionStore.getState();
  return state.loaded && state.session?.user ? (state.session.user.privileges?.map((p) => p.display) ?? []) : [];
}

function defaultSubscribeRegistry(listener: () => void): () => void {
  const unsubs = [
    subscribeToAIEvent(AI_EVENTS.TOOL_REGISTERED, listener),
    subscribeToAIEvent(AI_EVENTS.TOOL_OVERRIDDEN, listener),
    subscribeToAIEvent(AI_EVENTS.TOOL_REMOVED, listener),
  ];
  return () => unsubs.forEach((u) => u());
}

export function createToolsProvisioning(options: ToolsProvisioningOptions = {}): ChannelModule {
  const getPrivileges = options.getPrivileges ?? sessionPrivileges;
  const subscribePrivileges = options.subscribePrivileges ?? ((l) => sessionStore.subscribe(l));
  const getDescriptors = options.getDescriptors ?? getToolDescriptors;
  const subscribeRegistry = options.subscribeRegistry ?? defaultSubscribeRegistry;
  const debounceMs = options.debounceMs ?? 50;

  return {
    name: 'tools-provisioning',
    attach(channel: AIChannel) {
      let revision = 0;
      /** id → sérialisation du descripteur tel que connu du backend */
      let known = new Map<string, string>();
      let timer: ReturnType<typeof setTimeout> | null = null;

      const snapshot = () => {
        const list = getDescriptors(getPrivileges());
        return { list, map: new Map(list.map((d) => [d.id, JSON.stringify(d)])) };
      };

      const sendFull = () => {
        const { list, map } = snapshot();
        revision++;
        known = map;
        try {
          channel.send('tools.sync', { revision, tools: list });
        } catch {
          // canal coupé : la synchronisation complète repartira à la reconnexion
        }
      };

      const sendDelta = () => {
        if (!channel.isReady) return;
        const { list, map } = snapshot();
        const upsert = list.filter((d) => known.get(d.id) !== map.get(d.id));
        const removed = [...known.keys()].filter((id) => !map.has(id));
        if (upsert.length === 0 && removed.length === 0) return;
        revision++;
        known = map;
        try {
          channel.send('tools.delta', { revision, upsert, removed });
        } catch {
          // idem
        }
      };

      const scheduleDelta = () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          timer = null;
          sendDelta();
        }, debounceMs);
      };

      const unsubs = [
        channel.onReady(sendFull),
        channel.onDisconnect(() => {
          known = new Map();
        }),
        channel.on('tools.request_sync', sendFull),
        subscribeRegistry(scheduleDelta),
        subscribePrivileges(scheduleDelta),
      ];

      return () => {
        if (timer) clearTimeout(timer);
        unsubs.forEach((u) => u());
      };
    },
  };
}
